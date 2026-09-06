import { useEffect, useMemo, useRef, useState } from "react";
import { BINARY_SYNCHRONIZATION_CASES, type Resultant, type ResultantSegment } from "../core/resultant";
import { buildResultantForTechnique, type Technique } from "../core/technique";
import { THREE_GENERATOR_CASES, buildTheme } from "../core/threeGenerators";
import { computeLoopTimeSignatureOptions } from "../core/timeSignature";
import { higherOrderElements } from "../core/higherOrderPermutations";
import { restCombinations, buildNoteEventsFromSignedSegments } from "../core/sampleAnalysis";
import { PERCUSSION_VOICE_OPTIONS, GM_DRUM_CHANNEL } from "../core/percussion";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import { type PianoRollLane } from "../components/SchillingerPianoRoll";
import MidiPreview from "../components/MidiPreview";
import "../components/SchillingerGenerator.css";
import "./MotifExplorerPage.css";

/** Rebuilds cycleLength/attackPoints from an ordered segment list — used after windowing/repeating a resultant. */
function resultantFromSegments(segments: ResultantSegment[]): Resultant {
  let cursor = 0;
  const attackPoints: number[] = [];
  for (const segment of segments) {
    attackPoints.push(cursor);
    cursor += segment.duration;
  }
  return { cycleLength: cursor, segments, attackPoints };
}

/**
 * Every way of marking some of `durations`' positions as rests, ordered by
 * how many rests (none first): `restCombinations` (built for sample
 * analysis, Ch.9-adjacent) at every count from 0 up to "all positions,"
 * concatenated into one steppable list. Up/down browsing this list is what
 * "introduce rests" (the original midi-preview request) actually meant.
 */
function allRestVariations(durations: readonly number[]): number[][] {
  const variations: number[][] = [];
  for (let restCount = 0; restCount <= durations.length; restCount++) {
    variations.push(...restCombinations(durations, restCount));
  }
  return variations;
}

type ExtendMode = "technique" | "growth";
type LengthMode = "events" | "beats";
type LoopSelection = { start: number; length: number };

/** One motif's own compositional choices — everything a second voice needs its own copy of. */
interface VoiceState {
  generatorCount: 2 | 3;
  caseIndex: number;
  threeCaseIndex: number;
  technique: Technique;
  repeatCount: number;
  extendMode: ExtendMode;
  growthOrder: number;
  restIndex: number;
  instrumentIndex: number;
}

function defaultVoice(instrumentLabel: string): VoiceState {
  const instrumentIndex = Math.max(
    0,
    PERCUSSION_VOICE_OPTIONS.findIndex((p) => p.label === instrumentLabel),
  );
  return {
    generatorCount: 2,
    caseIndex: 0,
    threeCaseIndex: 0,
    technique: "plain",
    repeatCount: 1,
    extendMode: "technique",
    growthOrder: 2,
    restIndex: 0,
    instrumentIndex,
  };
}

interface VoiceOutput {
  activeCaseLabel: string;
  growthSeedsLabel: string;
  growthEventsCount: number;
  totalSegments: number;
  clampedStart: number;
  windowLength: number;
  restVariations: number[][];
  activeSigned: number[];
  activeRestCount: number;
  totalUnits: number;
  notes: NoteEvent[];
  lane: PianoRollLane;
}

/**
 * Everything derivable from one voice's own settings plus the *shared*
 * window (start/length are linked across voices — see the component below)
 * -- a plain function rather than a hook, since it's called once per voice.
 */
function computeVoiceOutput(
  voice: VoiceState,
  trackIndex: number,
  loopSelection: LoopSelection,
  lengthMode: LengthMode,
  targetBeats: number,
  color: string,
  highlight: string,
): VoiceOutput {
  const activeCase = BINARY_SYNCHRONIZATION_CASES[voice.caseIndex];
  const activeThreeCase = THREE_GENERATOR_CASES[voice.threeCaseIndex];

  const techniqueResultant: Resultant =
    voice.generatorCount === 3
      ? buildTheme(activeThreeCase.generators)
      : buildResultantForTechnique(voice.technique, activeCase.a, activeCase.b);

  const growthSeeds =
    voice.generatorCount === 3 ? activeThreeCase.generators.map((g) => [g]) : [[activeCase.a], [activeCase.b]];
  const growthElements = higherOrderElements(growthSeeds, voice.growthOrder);
  const growthResultant = resultantFromSegments(growthElements.flat().map((duration) => ({ duration, sources: [] })));

  const baseResultant = voice.extendMode === "growth" ? growthResultant : techniqueResultant;
  const repeatedResultant =
    voice.extendMode === "growth" || voice.repeatCount <= 1
      ? baseResultant
      : resultantFromSegments(Array.from({ length: voice.repeatCount }, () => baseResultant.segments).flat());

  const totalSegments = repeatedResultant.segments.length;
  const clampedStart = Math.max(0, Math.min(loopSelection.start, totalSegments - 1));

  let windowLength: number;
  if (lengthMode === "events") {
    windowLength = Math.max(1, Math.min(loopSelection.length, totalSegments - clampedStart));
  } else {
    let sum = 0;
    let count = 0;
    for (let i = clampedStart; i < totalSegments && sum < targetBeats; i++) {
      sum += repeatedResultant.segments[i].duration;
      count++;
    }
    windowLength = Math.max(1, count);
  }

  const windowDurations = repeatedResultant.segments.slice(clampedStart, clampedStart + windowLength).map((s) => s.duration);
  const restVariations = allRestVariations(windowDurations);
  const activeSigned = restVariations[Math.min(voice.restIndex, restVariations.length - 1)];
  const activeRestCount = activeSigned.filter((v) => v < 0).length;
  const totalUnits = activeSigned.reduce((sum, v) => sum + Math.abs(v), 0);

  const instrument = PERCUSSION_VOICE_OPTIONS[voice.instrumentIndex];
  const notes = buildNoteEventsFromSignedSegments(activeSigned, instrument.midiNote, trackIndex, 100).map((note) => ({
    ...note,
    channel: GM_DRUM_CHANNEL,
  }));

  return {
    activeCaseLabel: voice.generatorCount === 3 ? activeThreeCase.label : activeCase.label,
    growthSeedsLabel: growthSeeds.map((s) => s[0]).join(", "),
    growthEventsCount: growthResultant.segments.length,
    totalSegments,
    clampedStart,
    windowLength,
    restVariations,
    activeSigned,
    activeRestCount,
    totalUnits,
    notes,
    lane: {
      label: `voice-${trackIndex}`,
      color,
      highlight,
      segments: activeSigned.map((v) => ({ duration: Math.abs(v), rest: v < 0 })),
    },
  };
}

const VOICE_COLORS: readonly { color: string; highlight: string }[] = [
  { color: "#3d7ddb", highlight: "#7fb0ef" },
  { color: "#d9542b", highlight: "#f2926a" },
];

/** A short-lived white-noise buffer, one per AudioContext, for the noise-based drum hits below. */
const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();
function getNoiseBuffer(context: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

/**
 * Web Audio has no built-in GM drum patches -- a MIDI note number only
 * means "kick" or "snare" once a real synth/soundfont interprets it. So
 * the live preview synthesizes a small kit itself (oscillators + a shared
 * noise buffer through filters) rather than pulling in sample files or a
 * soundfont library, keeping this dependency- and bandwidth-free. The
 * *exported* MIDI file still just encodes GM channel-10 note numbers, so
 * it plays back correctly in any real DAW regardless of this synthesis.
 */
function scheduleDrumHit(context: AudioContext, destination: AudioNode, midiNote: number, time: number, velocity: number) {
  const level = (velocity / 127) * 0.3;

  if (midiNote === 36) {
    // Kick: sine pitch-dropping over a fast decay.
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    gain.gain.setValueAtTime(level * 1.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.2);
    return;
  }

  if (midiNote === 45 || midiNote === 47 || midiNote === 50) {
    // Toms: triangle, pitch by drum size.
    const base = midiNote === 45 ? 110 : midiNote === 47 ? 150 : 200;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(base, time);
    osc.frequency.exponentialRampToValueAtTime(base * 0.6, time + 0.2);
    gain.gain.setValueAtTime(level * 1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.28);
    return;
  }

  if (midiNote === 56) {
    // Cowbell: a plain square blip.
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.value = 560;
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + 0.14);
    return;
  }

  // Everything else (snare, rim, clap, hi-hats, ride, crash): filtered noise burst.
  let filterType: BiquadFilterType = "highpass";
  let freq = 6000;
  let decay = 0.08;
  switch (midiNote) {
    case 38: // Snare
      filterType = "bandpass";
      freq = 1800;
      decay = 0.15;
      break;
    case 37: // Rim shot
      filterType = "bandpass";
      freq = 2200;
      decay = 0.05;
      break;
    case 39: // Clap
      filterType = "bandpass";
      freq = 1200;
      decay = 0.12;
      break;
    case 42: // Closed hi-hat
      freq = 7000;
      decay = 0.05;
      break;
    case 46: // Open hi-hat
      freq = 6000;
      decay = 0.35;
      break;
    case 51: // Ride
      freq = 4000;
      decay = 0.5;
      break;
    case 49: // Crash
      freq = 3500;
      decay = 0.7;
      break;
  }
  const noise = context.createBufferSource();
  noise.buffer = getNoiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  const gain = context.createGain();
  gain.gain.setValueAtTime(level, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(time);
  noise.stop(time + decay + 0.02);
}

export default function MotifExplorerPage() {
  // Deliberately rhythm-only for now: "build this out in the same order
  // Schillinger's own chapters introduce it," starting with Book I. Scale
  // (pitched melody) comes back later, in sequence.
  const [voices, setVoices] = useState<VoiceState[]>([defaultVoice("Closed hi-hat")]);
  const [activeVoiceTab, setActiveVoiceTab] = useState(0);

  function updateVoice(index: number, patch: Partial<VoiceState>) {
    setVoices((vs) => vs.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addSecondVoice() {
    setVoices((vs) => (vs.length > 1 ? vs : [...vs, defaultVoice("Kick")]));
    setActiveVoiceTab(1);
  }

  function removeSecondVoice() {
    setVoices((vs) => vs.slice(0, 1));
    setActiveVoiceTab(0);
  }

  // Motif length / window (the "cycle contract/expand" control) -- shared
  // and linked across voices, per explicit direction: only the resultant
  // choice, technique, and instrument are independent per voice.
  const [loopSelection, setLoopSelection] = useState<LoopSelection>({ start: 0, length: 4 });
  const [lengthMode, setLengthMode] = useState<LengthMode>("events");
  const [targetBeats, setTargetBeats] = useState(4);

  const voiceA = voices[0];
  const voiceB = voices[1];
  const voiceAOutput = useMemo(
    () => computeVoiceOutput(voiceA, 0, loopSelection, lengthMode, targetBeats, VOICE_COLORS[0].color, VOICE_COLORS[0].highlight),
    [voiceA, loopSelection, lengthMode, targetBeats],
  );
  const voiceBOutput = useMemo(
    () =>
      voiceB
        ? computeVoiceOutput(voiceB, 1, loopSelection, lengthMode, targetBeats, VOICE_COLORS[1].color, VOICE_COLORS[1].highlight)
        : null,
    [voiceB, loopSelection, lengthMode, targetBeats],
  );

  // Reset the shared window to a sensible default whenever voice 1's shape
  // changes (voice 2, if present, simply clamps its own window against its
  // own segment count -- see computeVoiceOutput).
  useEffect(() => {
    setLoopSelection({ start: 0, length: Math.max(2, Math.min(4, voiceAOutput.totalSegments)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceA.generatorCount, voiceA.caseIndex, voiceA.threeCaseIndex, voiceA.technique, voiceA.repeatCount, voiceA.extendMode, voiceA.growthOrder]);

  useEffect(() => {
    updateVoice(0, { restIndex: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAOutput.clampedStart, voiceAOutput.windowLength]);

  useEffect(() => {
    if (!voiceBOutput) return;
    updateVoice(1, { restIndex: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceBOutput?.clampedStart, voiceBOutput?.windowLength]);

  const editingVoice = voices[activeVoiceTab] ?? voiceA;
  const editingOutput = activeVoiceTab === 1 && voiceBOutput ? voiceBOutput : voiceAOutput;

  const cycleUnits = Math.max(voiceAOutput.totalUnits, voiceBOutput?.totalUnits ?? 0);
  const lanes: PianoRollLane[] = useMemo(
    () => (voiceBOutput ? [voiceAOutput.lane, voiceBOutput.lane] : [voiceAOutput.lane]),
    [voiceAOutput, voiceBOutput],
  );
  const notes: NoteEvent[] = useMemo(
    () => (voiceBOutput ? [...voiceAOutput.notes, ...voiceBOutput.notes] : voiceAOutput.notes),
    [voiceAOutput, voiceBOutput],
  );

  const timeSignatureOptions = useMemo(() => computeLoopTimeSignatureOptions(cycleUnits), [cycleUnits]);
  const [timeSignatureIndex, setTimeSignatureIndex] = useState(0);
  useEffect(() => setTimeSignatureIndex(0), [timeSignatureOptions.length, cycleUnits]);
  const selectedTimeSignature = timeSignatureOptions[Math.min(timeSignatureIndex, timeSignatureOptions.length - 1)];

  // Playback.
  const [bpm, setBpm] = useState(112);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = cycleUnits * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current) return;

    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of notes) {
      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      scheduleDrumHit(context, context.destination, note.midiNote, noteStart, note.velocity);
    }

    window.setTimeout(() => {
      if (token === playTokenRef.current) scheduleLoopPass(token);
    }, cycleSeconds * 1000);
  }

  function stopPlayback() {
    playTokenRef.current += 1;
    setIsPlaying(false);
    setPlayheadFraction(0);
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    audioContextRef.current = new AudioContext();
    setIsPlaying(true);
    scheduleLoopPass(++playTokenRef.current);
  }

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    audioContextRef.current.close();
    audioContextRef.current = new AudioContext();
    scheduleLoopPass(++playTokenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, secondsPerUnit, cycleSeconds]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    function tick() {
      const context = audioContextRef.current;
      if (context && cycleSeconds > 0) {
        const elapsed = (context.currentTime - cycleStartRef.current) % cycleSeconds;
        setPlayheadFraction(elapsed / cycleSeconds);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, cycleSeconds]);

  function downloadMidi() {
    if (notes.length === 0) return;
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit: 120 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-motif.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcuts: Left/Right slide the (shared) window, Up/Down browse
  // the active voice's rests, Space plays/stops.
  const handlersRef = useRef({
    moveWindow: (_delta: number) => {},
    shiftRest: (_delta: number) => {},
    togglePlayback: () => {},
  });
  handlersRef.current = {
    moveWindow: (delta: number) =>
      setLoopSelection((sel) => ({ ...sel, start: Math.max(0, Math.min(sel.start + delta, voiceAOutput.totalSegments - 1)) })),
    shiftRest: (delta: number) =>
      updateVoice(activeVoiceTab, {
        restIndex: (editingVoice.restIndex + delta + editingOutput.restVariations.length) % editingOutput.restVariations.length,
      }),
    togglePlayback,
  };

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (overflowRef.current?.contains(e.target as Node)) return;
      setOverflowOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [overflowOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.code === "Space") {
        e.preventDefault();
        handlersRef.current.togglePlayback();
        return;
      }
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlersRef.current.moveWindow(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          handlersRef.current.moveWindow(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          handlersRef.current.shiftRest(1);
          break;
        case "ArrowDown":
          e.preventDefault();
          handlersRef.current.shiftRest(-1);
          break;
        case " ":
        case "Spacebar":
          e.preventDefault();
          handlersRef.current.togglePlayback();
          break;
        case "Escape":
          setOverflowOpen(false);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="motif-page">
      <div className="motif-transport">
        <div className="motif-transport__row">
          <button type="button" className="motif-transport__play" onClick={togglePlayback}>
            {isPlaying ? "❚❚" : "▶"}
          </button>

          {selectedTimeSignature && <div className="motif-transport__timesig">{selectedTimeSignature.label}</div>}

          <div className="motif-transport__info">
            {editingOutput.totalUnits} units · {editingOutput.activeSigned.length} events
            {editingOutput.activeRestCount > 0 && (
              <>
                {" "}
                · {editingOutput.activeRestCount} rest{editingOutput.activeRestCount === 1 ? "" : "s"}
              </>
            )}
          </div>

          <div className="motif-transport__spacer" />

          <label className="motif-transport__tempo">
            <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
            bpm
          </label>

          <div className="motif-transport__overflow" ref={overflowRef}>
            <button type="button" aria-label="More options" onClick={() => setOverflowOpen((v) => !v)}>
              ⋯
            </button>
            {overflowOpen && (
              <div className="motif-transport__menu">
                <button type="button" onClick={downloadMidi} disabled={notes.length === 0}>
                  Download MIDI
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="motif-transport__row">
          <div className="motif-transport__voicetabs">
            <button
              type="button"
              className={activeVoiceTab === 0 ? "motif-transport__voicetab motif-transport__voicetab--active" : "motif-transport__voicetab"}
              onClick={() => setActiveVoiceTab(0)}
            >
              <span className="motif-transport__swatch" style={{ background: VOICE_COLORS[0].color }} />
              Voice 1
            </button>
            {voiceB ? (
              <>
                <button
                  type="button"
                  className={
                    activeVoiceTab === 1 ? "motif-transport__voicetab motif-transport__voicetab--active" : "motif-transport__voicetab"
                  }
                  onClick={() => setActiveVoiceTab(1)}
                >
                  <span className="motif-transport__swatch" style={{ background: VOICE_COLORS[1].color }} />
                  Voice 2
                </button>
                <button type="button" className="motif-transport__voiceremove" aria-label="Remove voice 2" onClick={removeSecondVoice}>
                  ×
                </button>
              </>
            ) : (
              <button type="button" className="motif-transport__voiceadd" onClick={addSecondVoice}>
                + Voice 2
              </button>
            )}
          </div>

          <select
            value={editingVoice.generatorCount}
            onChange={(e) => updateVoice(activeVoiceTab, { generatorCount: Number(e.target.value) as 2 | 3 })}
            aria-label="Number of generators"
          >
            <option value={2}>2 gen</option>
            <option value={3}>3 gen</option>
          </select>

          {editingVoice.generatorCount === 2 ? (
            <select
              value={editingVoice.caseIndex}
              onChange={(e) => updateVoice(activeVoiceTab, { caseIndex: Number(e.target.value) })}
              aria-label="Resultant case"
            >
              {BINARY_SYNCHRONIZATION_CASES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={editingVoice.threeCaseIndex}
              onChange={(e) => updateVoice(activeVoiceTab, { threeCaseIndex: Number(e.target.value) })}
              aria-label="Resultant case"
            >
              {THREE_GENERATOR_CASES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={editingVoice.extendMode}
            onChange={(e) => updateVoice(activeVoiceTab, { extendMode: e.target.value as ExtendMode })}
            aria-label="Extend mode"
          >
            <option value="technique">Technique (Ch. 4-5)</option>
            <option value="growth">Higher-order growth (Ch. 10)</option>
          </select>

          {editingVoice.extendMode === "technique" ? (
            <>
              {editingVoice.generatorCount === 2 && (
                <select
                  value={editingVoice.technique}
                  onChange={(e) => updateVoice(activeVoiceTab, { technique: e.target.value as Technique })}
                  aria-label="Technique"
                >
                  <option value="plain">Plain</option>
                  <option value="fractioned">Fractioned</option>
                  <option value="expansion">Expansion (append)</option>
                  <option value="contraction">Contraction (prepend)</option>
                  <option value="balance">Balance (combine)</option>
                </select>
              )}
              <label className="motif-transport__tempo">
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={editingVoice.repeatCount}
                  onChange={(e) => updateVoice(activeVoiceTab, { repeatCount: Math.max(1, Math.min(4, Number(e.target.value))) })}
                />
                ×
              </label>
            </>
          ) : (
            <label className="motif-transport__tempo">
              Order
              <input
                type="number"
                min={1}
                max={6}
                value={editingVoice.growthOrder}
                onChange={(e) => updateVoice(activeVoiceTab, { growthOrder: Math.max(1, Math.min(6, Number(e.target.value))) })}
              />
            </label>
          )}

          <select
            value={editingVoice.instrumentIndex}
            onChange={(e) => updateVoice(activeVoiceTab, { instrumentIndex: Number(e.target.value) })}
            aria-label="Drum voice"
          >
            {PERCUSSION_VOICE_OPTIONS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="motif-transport__row">
          <label className="schillinger__checkbox">
            <input type="radio" name="lengthMode" checked={lengthMode === "events"} onChange={() => setLengthMode("events")} />
            By events
          </label>
          <label className="schillinger__checkbox">
            <input type="radio" name="lengthMode" checked={lengthMode === "beats"} onChange={() => setLengthMode("beats")} />
            By beats
          </label>
          <label className="motif-transport__tempo">
            Start
            <input
              type="number"
              min={0}
              max={Math.max(0, voiceAOutput.totalSegments - 1)}
              value={voiceAOutput.clampedStart}
              onChange={(e) => setLoopSelection((sel) => ({ ...sel, start: Number(e.target.value) }))}
            />
          </label>
          {lengthMode === "events" ? (
            <label className="motif-transport__tempo">
              Length
              <input
                type="number"
                min={1}
                max={voiceAOutput.totalSegments}
                value={loopSelection.length}
                onChange={(e) => setLoopSelection((sel) => ({ ...sel, length: Number(e.target.value) }))}
              />
            </label>
          ) : (
            <label className="motif-transport__tempo">
              Target beats
              <input type="number" min={1} max={64} value={targetBeats} onChange={(e) => setTargetBeats(Number(e.target.value))} />
            </label>
          )}
          {timeSignatureOptions.length > 1 && (
            <select value={timeSignatureIndex} onChange={(e) => setTimeSignatureIndex(Number(e.target.value))} aria-label="Time signature">
              {timeSignatureOptions.map((o, i) => (
                <option key={o.label} value={i}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="motif-workspace">
        <div className="motif-stage-wrap">
          <section className="motif-page__stage">
            {selectedTimeSignature && (
              <MidiPreview
                lanes={lanes}
                cycleLength={cycleUnits}
                timeSignature={selectedTimeSignature}
                playheadFraction={isPlaying ? playheadFraction : undefined}
                hideLabels
                onShiftLeft={() => handlersRef.current.moveWindow(-1)}
                onShiftRight={() => handlersRef.current.moveWindow(1)}
                canShiftLeft={voiceAOutput.clampedStart > 0}
                canShiftRight={voiceAOutput.clampedStart < voiceAOutput.totalSegments - 1}
                onCycleUp={() => handlersRef.current.shiftRest(1)}
                onCycleDown={() => handlersRef.current.shiftRest(-1)}
                canCycle={editingOutput.restVariations.length > 1}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
