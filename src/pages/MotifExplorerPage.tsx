import { useEffect, useMemo, useRef, useState } from "react";
import { BINARY_SYNCHRONIZATION_CASES, type Resultant, type ResultantSegment } from "../core/resultant";
import { buildResultantForTechnique, type Technique } from "../core/technique";
import { THREE_GENERATOR_CASES, buildTheme } from "../core/threeGenerators";
import { computeLoopTimeSignatureOptions, type TimeSignatureOption } from "../core/timeSignature";
import { higherOrderElements } from "../core/higherOrderPermutations";
import { restCombinations, buildNoteEventsFromSignedSegments } from "../core/sampleAnalysis";
import { PERCUSSION_VOICE_OPTIONS, GM_DRUM_CHANNEL } from "../core/percussion";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import { type PianoRollLane } from "../components/SchillingerPianoRoll";
import MidiPreview from "../components/MidiPreview";
import type { HeaderAction } from "../components/AppHeader";
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
 * Every variation has the same total duration -- only which positions
 * sound changes, not the underlying rhythm's length.
 */
// The full enumeration is 2^n entries (every subset of positions can be
// rests, independent of each other) -- fine for the small windows this was
// designed around, but a real crash for a long one: a 5:2 Fractioned
// resultant alone has 21 segments, and "Max" gladly asks for a 21-event
// window, which would try to materialize 2^21 (~2 million) arrays and
// exhaust the tab's memory. Cap the total instead of the window length
// itself (which has other legitimate reasons to go long, like browsing a
// big pattern with only a few rests) -- windows small enough to matter in
// practice get the exact same exhaustive list as before; only pathologically
// long ones lose the tail (very-high-rest-count combinations), degrading
// gracefully rather than crashing.
const MAX_REST_VARIATIONS = 4096;

function allRestVariations(durations: readonly number[]): number[][] {
  const variations: number[][] = [];
  for (let restCount = 0; restCount <= durations.length; restCount++) {
    if (variations.length >= MAX_REST_VARIATIONS) break;
    variations.push(...restCombinations(durations, restCount));
  }
  return variations;
}

/**
 * Renders a time signature the way it actually looks on a staff -- two
 * stacked digits, no dividing bar -- rather than a slashed "3/8" string.
 * Only usable outside a <select>'s own <option> list (those can't hold
 * arbitrary markup), which is why the Length row's picker below still
 * falls back to the plain-text `.label`.
 */
function TimeSignatureGlyph({ option }: { option: TimeSignatureOption }) {
  return (
    <span className="timesig">
      {option.bars > 1 && <span className="timesig__bars">{option.bars}×</span>}
      <span className="timesig__fraction">
        <span className="timesig__num">{option.beatsPerBar}</span>
        <span className="timesig__den">{option.denominator}</span>
      </span>
    </span>
  );
}

type ExtendMode = "technique" | "growth";
type LengthMode = "events" | "beats";

/**
 * A voice's own choices, independent of every other voice -- for now, per
 * direct instruction, that's just which sound it plays and which of the
 * shared rhythm's rest-variations it applies. The resultant/technique/
 * length/tempo are shared, top-level state below.
 */
interface VoiceState {
  restIndex: number;
  instrumentIndex: number;
}

/**
 * A voice's sound source is either a GM percussion hit (existing
 * synthesized kit, pinned to the drum channel on export) or a basic synth
 * waveform at a fixed reference pitch -- no scale/pitch selection yet
 * ("we're fine tuning the rhythm-only workflow" first), just timbre.
 * Deliberately no delay/reverb or other effects: a plain oscillator with a
 * short amplitude envelope, nothing more.
 */
interface VoiceSound {
  kind: "percussion" | "synth";
  label: string;
  midiNote: number;
  waveform?: OscillatorType;
}

const SYNTH_REFERENCE_NOTE = 60; // C4 -- no scale yet, so every synth voice shares one fixed pitch.

const VOICE_SOUND_OPTIONS: readonly VoiceSound[] = [
  ...PERCUSSION_VOICE_OPTIONS.map((p): VoiceSound => ({ kind: "percussion", label: p.label, midiNote: p.midiNote })),
  { kind: "synth", label: "Sine", midiNote: SYNTH_REFERENCE_NOTE, waveform: "sine" },
  { kind: "synth", label: "Triangle", midiNote: SYNTH_REFERENCE_NOTE, waveform: "triangle" },
  { kind: "synth", label: "Square", midiNote: SYNTH_REFERENCE_NOTE, waveform: "square" },
  { kind: "synth", label: "Sawtooth", midiNote: SYNTH_REFERENCE_NOTE, waveform: "sawtooth" },
];

function defaultVoice(soundLabel: string): VoiceState {
  const instrumentIndex = Math.max(
    0,
    VOICE_SOUND_OPTIONS.findIndex((s) => s.label === soundLabel),
  );
  return { restIndex: 0, instrumentIndex };
}

const MAX_VOICES = 12;

const VOICE_COLORS: readonly { color: string; highlight: string }[] = [
  { color: "#3d7ddb", highlight: "#7fb0ef" }, // blue
  { color: "#d9542b", highlight: "#f2926a" }, // orange
  { color: "#43a047", highlight: "#81c784" }, // green
  { color: "#8e24aa", highlight: "#ce93d8" }, // purple
  { color: "#d81b60", highlight: "#f48fb1" }, // pink
  { color: "#00acc1", highlight: "#4dd0e1" }, // cyan
  { color: "#ffa000", highlight: "#ffcc80" }, // amber
  { color: "#6d4c41", highlight: "#a1887f" }, // brown
  { color: "#546e7a", highlight: "#90a4ae" }, // blue-grey
  { color: "#7cb342", highlight: "#aed581" }, // lime
  { color: "#e53935", highlight: "#ef9a9a" }, // red
  { color: "#3949ab", highlight: "#9fa8da" }, // indigo
];

/** One distinct default drum sound per new voice slot, so 12 freshly-added voices don't all start identical. */
const DEFAULT_VOICE_SOUND_LABELS: readonly string[] = [
  "Closed hi-hat",
  "Kick",
  "Snare",
  "Ride",
  "Rim shot",
  "Clap",
  "Low tom",
  "Mid tom",
  "High tom",
  "Cowbell",
  "Open hi-hat",
  "Crash",
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

/**
 * A basic synth voice: one oscillator of the chosen waveform at the
 * note's pitch, a short linear attack into an exponential decay, nothing
 * else -- no delay, reverb, or other processing, by direct request.
 */
function scheduleSynthTone(
  context: AudioContext,
  destination: AudioNode,
  waveform: OscillatorType,
  midiNote: number,
  time: number,
  durationSeconds: number,
  velocity: number,
) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = waveform;
  osc.frequency.value = 440 * Math.pow(2, (midiNote - 69) / 12);
  const peak = (velocity / 127) * 0.2;
  const end = time + Math.max(durationSeconds, 0.03);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, end);
  osc.connect(gain).connect(destination);
  osc.start(time);
  osc.stop(end);
}

export default function MotifExplorerPage({
  onHeaderActionChange,
}: {
  onHeaderActionChange?: (action: HeaderAction | null) => void;
}) {
  // Deliberately rhythm-only for now: "build this out in the same order
  // Schillinger's own chapters introduce it," starting with Book I. Scale
  // (pitched melody) comes back later, in sequence.
  //
  // Resultant/technique/length/tempo are shared across every voice, per
  // direct instruction -- only the drum sound and rest-pattern differ.
  const [generatorCount, setGeneratorCount] = useState<2 | 3>(2);
  const [caseIndex, setCaseIndex] = useState(0);
  const [threeCaseIndex, setThreeCaseIndex] = useState(0);
  const [technique, setTechnique] = useState<Technique>("plain");
  const [repeatCount, setRepeatCount] = useState(1);
  const [extendMode, setExtendMode] = useState<ExtendMode>("technique");
  const [growthOrder, setGrowthOrder] = useState(2);

  const activeCase = BINARY_SYNCHRONIZATION_CASES[caseIndex];
  const activeThreeCase = THREE_GENERATOR_CASES[threeCaseIndex];

  const techniqueResultant: Resultant = useMemo(() => {
    return generatorCount === 3
      ? buildTheme(activeThreeCase.generators)
      : buildResultantForTechnique(technique, activeCase.a, activeCase.b);
  }, [generatorCount, activeThreeCase, technique, activeCase]);

  const growthSeeds = useMemo(
    () => (generatorCount === 3 ? activeThreeCase.generators.map((g) => [g]) : [[activeCase.a], [activeCase.b]]),
    [generatorCount, activeThreeCase, activeCase],
  );

  const growthResultant: Resultant = useMemo(() => {
    const elements = higherOrderElements(growthSeeds, growthOrder);
    return resultantFromSegments(elements.flat().map((duration) => ({ duration, sources: [] })));
  }, [growthSeeds, growthOrder]);

  const baseResultant = extendMode === "growth" ? growthResultant : techniqueResultant;

  const repeatedResultant = useMemo(() => {
    if (extendMode === "growth" || repeatCount <= 1) return baseResultant;
    return resultantFromSegments(Array.from({ length: repeatCount }, () => baseResultant.segments).flat());
  }, [baseResultant, repeatCount, extendMode]);

  const totalSegments = repeatedResultant.segments.length;

  // Motif length / window (the "cycle contract/expand" control).
  const [loopSelection, setLoopSelection] = useState({ start: 0, length: 4 });
  const [lengthMode, setLengthMode] = useState<LengthMode>("beats");
  const [targetBeats, setTargetBeats] = useState(4);

  useEffect(() => {
    setLoopSelection({ start: 0, length: Math.max(2, Math.min(4, totalSegments)) });
    // Reset the window to a sensible default whenever the underlying shape changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatorCount, activeCase, activeThreeCase, technique, repeatCount, extendMode, growthOrder]);

  const clampedStart = Math.max(0, Math.min(loopSelection.start, totalSegments - 1));

  const windowLength = useMemo(() => {
    if (lengthMode === "events") {
      return Math.max(1, Math.min(loopSelection.length, totalSegments - clampedStart));
    }
    let sum = 0;
    let count = 0;
    for (let i = clampedStart; i < totalSegments && sum < targetBeats; i++) {
      sum += repeatedResultant.segments[i].duration;
      count++;
    }
    return Math.max(1, count);
  }, [lengthMode, loopSelection.length, targetBeats, repeatedResultant, clampedStart, totalSegments]);

  const windowDurations = useMemo(
    () => repeatedResultant.segments.slice(clampedStart, clampedStart + windowLength).map((s) => s.duration),
    [repeatedResultant, clampedStart, windowLength],
  );

  // Up/down browsing of which of the current window's attacks are rests --
  // restCombinations at every rest count from 0 up to "all positions,"
  // concatenated into one steppable list (see allRestVariations above).
  // Shared across voices: every variation has the same total duration, only
  // which positions sound differs, so this doesn't affect cycle length.
  const restVariations = useMemo(() => allRestVariations(windowDurations), [windowDurations]);
  const totalUnits = useMemo(() => windowDurations.reduce((sum, v) => sum + v, 0), [windowDurations]);

  // Upper bounds for the length slider: the furthest either mode can
  // stretch the window is "everything left from the current start to the
  // end of the (repeated/grown) resultant" -- used both as the slider's
  // max and as the target for a one-click "extend to max" button.
  const maxEventsLength = Math.max(1, totalSegments - clampedStart);
  const maxTargetBeats = useMemo(() => {
    let sum = 0;
    for (let i = clampedStart; i < totalSegments; i++) sum += repeatedResultant.segments[i].duration;
    return Math.max(1, sum);
  }, [repeatedResultant, clampedStart, totalSegments]);

  const [voices, setVoices] = useState<VoiceState[]>([defaultVoice("Closed hi-hat")]);
  const [activeVoiceTab, setActiveVoiceTab] = useState(0);

  function updateVoice(index: number, patch: Partial<VoiceState>) {
    setVoices((vs) => vs.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  // Both derive everything from the functional-updater's own `vs`, never
  // from the `voices`/`activeVoiceTab` closed over at render time -- two
  // clicks landing in the same React batch (a fast double-click, or a
  // burst of automated clicks) would otherwise both compute against the
  // same stale length/index and collide (confirmed live: rapid-adding many
  // voices gave every one past the second the same default sound, since
  // `newIndex` was frozen at the pre-batch length for every call).
  function addVoice() {
    setVoices((vs) => {
      if (vs.length >= MAX_VOICES) return vs;
      return [...vs, defaultVoice(DEFAULT_VOICE_SOUND_LABELS[vs.length % DEFAULT_VOICE_SOUND_LABELS.length])];
    });
  }

  function removeVoice(index: number) {
    setVoices((vs) => vs.filter((_, i) => i !== index));
  }

  // `activeVoiceTab` reacts to `voices.length` changing rather than being
  // set directly inside addVoice/removeVoice above -- those only have
  // access to the array via setVoices's own functional updater, which
  // can't also reach into a *different* piece of state safely. Growing
  // focuses the newly-added voice; shrinking just clamps back into bounds.
  const prevVoiceCountRef = useRef(voices.length);
  useEffect(() => {
    if (voices.length > prevVoiceCountRef.current) {
      setActiveVoiceTab(voices.length - 1);
    } else if (activeVoiceTab > voices.length - 1) {
      setActiveVoiceTab(Math.max(0, voices.length - 1));
    }
    prevVoiceCountRef.current = voices.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices.length]);

  useEffect(() => {
    setVoices((vs) => vs.map((v) => ({ ...v, restIndex: 0 })));
  }, [clampedStart, windowLength]);

  const editingVoice = voices[activeVoiceTab] ?? voices[0];

  const voiceOutputs = useMemo(
    () =>
      voices.map((voice, i) => {
        const activeSigned = restVariations[Math.min(voice.restIndex, restVariations.length - 1)];
        const activeRestCount = activeSigned.filter((v) => v < 0).length;
        const sound = VOICE_SOUND_OPTIONS[voice.instrumentIndex];
        const rawNotes = buildNoteEventsFromSignedSegments(activeSigned, sound.midiNote, i, 100);
        // Only percussion pins the GM drum channel; synth voices export as
        // ordinary melodic tracks (channel assigned by track index instead).
        const notes = sound.kind === "percussion" ? rawNotes.map((note) => ({ ...note, channel: GM_DRUM_CHANNEL })) : rawNotes;
        const lane: PianoRollLane = {
          label: `voice-${i}`,
          color: VOICE_COLORS[i].color,
          highlight: VOICE_COLORS[i].highlight,
          segments: activeSigned.map((v) => ({ duration: Math.abs(v), rest: v < 0 })),
        };
        return { activeSigned, activeRestCount, notes, lane };
      }),
    [voices, restVariations],
  );

  const editingOutput = voiceOutputs[activeVoiceTab] ?? voiceOutputs[0];
  const lanes: PianoRollLane[] = useMemo(() => voiceOutputs.map((o) => o.lane), [voiceOutputs]);
  const notes: NoteEvent[] = useMemo(() => voiceOutputs.flatMap((o) => o.notes), [voiceOutputs]);

  const timeSignatureOptions = useMemo(() => computeLoopTimeSignatureOptions(totalUnits), [totalUnits]);
  const [timeSignatureIndex, setTimeSignatureIndex] = useState(0);
  useEffect(() => setTimeSignatureIndex(0), [timeSignatureOptions.length, totalUnits]);
  const selectedTimeSignature = timeSignatureOptions[Math.min(timeSignatureIndex, timeSignatureOptions.length - 1)];

  // Playback.
  const [bpm, setBpm] = useState(124);
  // "Double time": how many seconds one abstract unit takes is otherwise
  // always a quarter note's worth at the given tempo. Reading a unit as an
  // eighth note instead halves that -- literally twice the speed -- via a
  // dedicated selector rather than tying it to whichever time-signature
  // reading happens to be picked (those are equivalent notations of the
  // SAME audio by design; this is a real, independent playback-speed choice).
  const [noteValue, setNoteValue] = useState<"quarter" | "eighth">("quarter");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const secondsPerUnit = (noteValue === "eighth" ? 30 : 60) / bpm;
  const cycleSeconds = totalUnits * secondsPerUnit;
  const voiceSounds = useMemo(() => voices.map((v) => VOICE_SOUND_OPTIONS[v.instrumentIndex]), [voices]);

  // A live-values ref, not a dependency array: `scheduleLoopPass` re-reads
  // this at the START OF EVERY PASS rather than closing over whatever
  // `notes`/timing were current when it was first scheduled. That means an
  // edit made mid-cycle (clicking a blob to mute/unmute, swapping an
  // instrument, nudging tempo) never tears down the AudioContext or resets
  // `cycleStartRef` -- the currently-playing pass finishes exactly as
  // scheduled, and the very next pass simply picks up whatever is current.
  // No restart, no playhead jump, no audible glitch.
  const liveRef = useRef({ notes, secondsPerUnit, cycleSeconds, voiceSounds });
  liveRef.current = { notes, secondsPerUnit, cycleSeconds, voiceSounds };

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current) return;
    const { notes: liveNotes, secondsPerUnit: liveSpu, cycleSeconds: liveCycleSeconds, voiceSounds: liveSounds } = liveRef.current;

    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of liveNotes) {
      const noteStart = cycleStart + note.startUnits * liveSpu;
      const sound = liveSounds[note.voice];
      if (sound?.kind === "synth") {
        scheduleSynthTone(context, context.destination, sound.waveform ?? "sine", note.midiNote, noteStart, note.durationUnits * liveSpu, note.velocity);
      } else {
        scheduleDrumHit(context, context.destination, note.midiNote, noteStart, note.velocity);
      }
    }

    window.setTimeout(() => {
      if (token === playTokenRef.current) scheduleLoopPass(token);
    }, liveCycleSeconds * 1000);
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
    // Match the exported file's physical tempo to whatever the preview is
    // actually playing at -- an eighth-note unit is double time, so the
    // exported bpm doubles too, rather than only affecting live playback.
    const exportBpm = noteValue === "eighth" ? bpm * 2 : bpm;
    const bytes = buildMidiFile(notes, { bpm: exportBpm, ticksPerUnit: 120 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-motif.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcuts: Left/Right slide the shared window, Up/Down browse
  // the active voice's rests, Space plays/stops.
  const handlersRef = useRef({
    moveWindow: (_delta: number) => {},
    shiftRest: (_delta: number) => {},
    togglePlayback: () => {},
  });
  handlersRef.current = {
    moveWindow: (delta: number) =>
      setLoopSelection((sel) => ({ ...sel, start: Math.max(0, Math.min(sel.start + delta, totalSegments - 1)) })),
    shiftRest: (delta: number) =>
      updateVoice(activeVoiceTab, {
        restIndex: (editingVoice.restIndex + delta + restVariations.length) % restVariations.length,
      }),
    togglePlayback,
  };

  /**
   * Clicking a blob flips just that one position between note and rest.
   * Every possible note/rest combination for the current window already
   * exists somewhere in `restVariations` (it's every subset of positions
   * at every rest count), so rather than track a manual override
   * alongside the up/down index, this looks up which existing variation
   * the flipped pattern IS and jumps `restIndex` straight to it -- the
   * next press of up/down then continues from that exact spot, browsing
   * its neighbors, instead of losing the manual edit.
   */
  function toggleSegment(voiceIndex: number, segmentIndex: number) {
    const current = voiceOutputs[voiceIndex]?.activeSigned;
    if (!current) return;
    const flipped = current.map((v, i) => (i === segmentIndex ? -v : v));
    const matchIndex = restVariations.findIndex((variation) => variation.every((v, i) => v === flipped[i]));
    if (matchIndex >= 0) updateVoice(voiceIndex, { restIndex: matchIndex });
  }

  // Download MIDI is rarely used, so it lives in the top app header's own
  // overflow menu rather than this page's transport at all. `stableDownload`
  // never changes identity (it just calls whatever `downloadMidi` currently
  // is via a ref), so this effect only re-fires when `notes.length` itself
  // changes -- not on every render -- avoiding a parent/child re-render loop.
  const downloadRef = useRef(downloadMidi);
  downloadRef.current = downloadMidi;
  const stableDownload = useRef(() => downloadRef.current()).current;

  useEffect(() => {
    onHeaderActionChange?.({ label: "Download MIDI", onClick: stableDownload, disabled: notes.length === 0 });
    return () => onHeaderActionChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.length]);

  // The time-signature reading picker: a bare chevron next to the bold
  // digits, not another text label repeating what's already shown --
  // opens a small menu of the alternate readings on click.
  const [timesigMenuOpen, setTimesigMenuOpen] = useState(false);
  const timesigMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!timesigMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (timesigMenuRef.current?.contains(e.target as Node)) return;
      setTimesigMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setTimesigMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [timesigMenuOpen]);

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
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="motif-page">
      <div className="motif-transport">
        <div className="motif-transport__row motif-transport__row--playback">
          <button type="button" className="motif-transport__play" onClick={togglePlayback}>
            {isPlaying ? "❚❚" : "▶"}
          </button>

          {selectedTimeSignature && (
            <div className="motif-transport__timesig-dominant">
              <TimeSignatureGlyph option={selectedTimeSignature} />
              {timeSignatureOptions.length > 1 && (
                <div className="motif-transport__timesig-picker" ref={timesigMenuRef}>
                  <button
                    type="button"
                    className="motif-transport__timesig-chevron"
                    aria-label="Choose time signature reading"
                    onClick={() => setTimesigMenuOpen((v) => !v)}
                  >
                    ▾
                  </button>
                  {timesigMenuOpen && (
                    <div className="motif-transport__timesig-menu">
                      {timeSignatureOptions.map((o, i) => (
                        <button
                          key={o.label}
                          type="button"
                          className={
                            i === timeSignatureIndex
                              ? "motif-transport__timesig-menuitem motif-transport__timesig-menuitem--active"
                              : "motif-transport__timesig-menuitem"
                          }
                          onClick={() => {
                            setTimeSignatureIndex(i);
                            setTimesigMenuOpen(false);
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="motif-transport__righttools">
            <div className="motif-transport__segmented motif-transport__segmented--notevalue" role="group" aria-label="Note value (double-time)">
              <button
                type="button"
                className={noteValue === "quarter" ? "motif-transport__segbtn motif-transport__segbtn--active" : "motif-transport__segbtn"}
                aria-label="Quarter note"
                onClick={() => setNoteValue("quarter")}
              >
                ♩
              </button>
              <button
                type="button"
                className={noteValue === "eighth" ? "motif-transport__segbtn motif-transport__segbtn--active" : "motif-transport__segbtn"}
                aria-label="Eighth note (double time)"
                onClick={() => setNoteValue("eighth")}
              >
                ♪
              </button>
            </div>

            <label className="motif-transport__tempo">
              <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
              bpm
            </label>
          </div>
        </div>

        {/* Frequently used: what the resultant is, and how it's read rhythmically. */}
        <div className="motif-transport__row motif-transport__row--primary">
          {generatorCount === 2 ? (
            <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))} aria-label="Resultant case">
              {BINARY_SYNCHRONIZATION_CASES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <select value={threeCaseIndex} onChange={(e) => setThreeCaseIndex(Number(e.target.value))} aria-label="Resultant case">
              {THREE_GENERATOR_CASES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          {extendMode === "technique" && generatorCount === 2 && (
            <select value={technique} onChange={(e) => setTechnique(e.target.value as Technique)} aria-label="Technique">
              <option value="plain">Plain</option>
              <option value="fractioned">Fractioned</option>
              <option value="expansion">Expansion (append)</option>
              <option value="contraction">Contraction (prepend)</option>
              <option value="balance">Balance (combine)</option>
            </select>
          )}
        </div>

        {/* Rarely touched: how many generators, and the alternate (unused so far) growth path. */}
        <div className="motif-transport__row motif-transport__row--secondary">
          <label className="motif-transport__labeled">
            Generators
            <select
              value={generatorCount}
              onChange={(e) => setGeneratorCount(Number(e.target.value) as 2 | 3)}
              aria-label="Number of generators"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>

          <label className="motif-transport__labeled">
            Extend
            <select value={extendMode} onChange={(e) => setExtendMode(e.target.value as ExtendMode)} aria-label="Extend mode">
              <option value="technique">Technique (Ch. 4-5)</option>
              <option value="growth">Higher-order growth (Ch. 10)</option>
            </select>
          </label>

          {extendMode === "technique" ? (
            <label className="motif-transport__labeled">
              Repeat
              <input
                type="number"
                min={1}
                max={4}
                value={repeatCount}
                onChange={(e) => setRepeatCount(Math.max(1, Math.min(4, Number(e.target.value))))}
              />
              ×
            </label>
          ) : (
            <label className="motif-transport__labeled">
              Order
              <input
                type="number"
                min={1}
                max={6}
                value={growthOrder}
                onChange={(e) => setGrowthOrder(Math.max(1, Math.min(6, Number(e.target.value))))}
              />
            </label>
          )}
        </div>

        <div className="motif-transport__row">
          {/* "Fire and forget": set once per session and rarely touched again, so it's a
              compact toggle rather than a pair of full radio+label controls. */}
          <div className="motif-transport__segmented" role="group" aria-label="Length mode">
            <button
              type="button"
              className={lengthMode === "events" ? "motif-transport__segbtn motif-transport__segbtn--active" : "motif-transport__segbtn"}
              onClick={() => setLengthMode("events")}
            >
              Events
            </button>
            <button
              type="button"
              className={lengthMode === "beats" ? "motif-transport__segbtn motif-transport__segbtn--active" : "motif-transport__segbtn"}
              onClick={() => setLengthMode("beats")}
            >
              Beats
            </button>
          </div>

          <div className="motif-transport__rangegroup">
            <span>Start</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalSegments - 1)}
              value={clampedStart}
              onChange={(e) => setLoopSelection((sel) => ({ ...sel, start: Number(e.target.value) }))}
            />
            <input
              type="number"
              min={0}
              max={Math.max(0, totalSegments - 1)}
              value={clampedStart}
              onChange={(e) => setLoopSelection((sel) => ({ ...sel, start: Number(e.target.value) }))}
            />
          </div>

          {lengthMode === "events" ? (
            <div className="motif-transport__rangegroup">
              <span>Length</span>
              <input
                type="range"
                min={1}
                max={maxEventsLength}
                value={Math.min(loopSelection.length, maxEventsLength)}
                onChange={(e) => setLoopSelection((sel) => ({ ...sel, length: Number(e.target.value) }))}
              />
              <input
                type="number"
                min={1}
                max={maxEventsLength}
                value={loopSelection.length}
                onChange={(e) => setLoopSelection((sel) => ({ ...sel, length: Number(e.target.value) }))}
              />
              <button
                type="button"
                className="motif-transport__lengthmax"
                onClick={() => setLoopSelection((sel) => ({ ...sel, length: maxEventsLength }))}
              >
                Max
              </button>
            </div>
          ) : (
            <div className="motif-transport__rangegroup">
              <span>Beats</span>
              <input
                type="range"
                min={1}
                max={maxTargetBeats}
                value={Math.min(targetBeats, maxTargetBeats)}
                onChange={(e) => setTargetBeats(Number(e.target.value))}
              />
              <input
                type="number"
                min={1}
                max={maxTargetBeats}
                value={targetBeats}
                onChange={(e) => setTargetBeats(Number(e.target.value))}
              />
              <button type="button" className="motif-transport__lengthmax" onClick={() => setTargetBeats(maxTargetBeats)}>
                Max
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="motif-voices">
        {voices.map((voice, i) => (
          <div key={i} className="motif-voices__row">
            <button
              type="button"
              className={
                activeVoiceTab === i ? "motif-transport__voicetab motif-transport__voicetab--active" : "motif-transport__voicetab"
              }
              onClick={() => setActiveVoiceTab(i)}
            >
              <span className="motif-transport__swatch" style={{ background: VOICE_COLORS[i].color }} />
              Voice {i + 1}
            </button>

            <select
              value={voice.instrumentIndex}
              onChange={(e) => updateVoice(i, { instrumentIndex: Number(e.target.value) })}
              aria-label={`Voice ${i + 1} instrument`}
            >
              <optgroup label="Percussion">
                {VOICE_SOUND_OPTIONS.filter((s) => s.kind === "percussion").map((s) => (
                  <option key={s.label} value={VOICE_SOUND_OPTIONS.indexOf(s)}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Synth">
                {VOICE_SOUND_OPTIONS.filter((s) => s.kind === "synth").map((s) => (
                  <option key={s.label} value={VOICE_SOUND_OPTIONS.indexOf(s)}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            </select>

            {voices.length > 1 && (
              <button
                type="button"
                className="motif-transport__voiceremove"
                aria-label={`Remove voice ${i + 1}`}
                onClick={() => removeVoice(i)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {voices.length < MAX_VOICES && (
          <button type="button" className="motif-voices__add" onClick={addVoice}>
            + Add Voice
          </button>
        )}
      </section>

      <div className="motif-workspace">
        <div className="motif-stage-wrap">
          <section className="motif-page__stage">
            {selectedTimeSignature && (
              <MidiPreview
                lanes={lanes}
                cycleLength={totalUnits}
                timeSignature={selectedTimeSignature}
                playheadFraction={isPlaying ? playheadFraction : undefined}
                hideLabels
                onSegmentClick={toggleSegment}
                onShiftLeft={() => handlersRef.current.moveWindow(-1)}
                onShiftRight={() => handlersRef.current.moveWindow(1)}
                canShiftLeft={clampedStart > 0}
                canShiftRight={clampedStart < totalSegments - 1}
                onCycleUp={() => handlersRef.current.shiftRest(1)}
                onCycleDown={() => handlersRef.current.shiftRest(-1)}
                canCycle={restVariations.length > 1}
              />
            )}
          </section>
        </div>
      </div>

      {/* Technical/status readouts nobody needs front-and-center, day to
          day -- tucked into their own quiet footer rather than competing
          with the transport for attention. */}
      <footer className="motif-footer">
        {totalUnits} units · {editingOutput.activeSigned.length} events
        {editingOutput.activeRestCount > 0 && (
          <>
            {" "}
            · {editingOutput.activeRestCount} rest{editingOutput.activeRestCount === 1 ? "" : "s"}
          </>
        )}
      </footer>
    </main>
  );
}
