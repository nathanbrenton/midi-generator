import { useEffect, useMemo, useRef, useState } from "react";
import { BINARY_SYNCHRONIZATION_CASES, type Resultant, type ResultantSegment } from "../core/resultant";
import { buildResultantForTechnique, type Technique } from "../core/technique";
import { THREE_GENERATOR_CASES, buildTheme } from "../core/threeGenerators";
import { circularPermutations } from "../core/permutations";
import { computeLoopTimeSignatureOptions } from "../core/timeSignature";
import { synchronizeInstrumentalGroup, assignPlaces, segmentsFromAttackTimes } from "../core/instrumentalInterference";
import { higherOrderElements } from "../core/higherOrderPermutations";
import { PERCUSSION_VOICE_OPTIONS, GM_DRUM_CHANNEL } from "../core/percussion";
import { SCALE_PRESETS, symmetricDivisionScale, intervalCellScale, midiNoteForDegree, type PitchScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import { type PianoRollLane } from "../components/SchillingerPianoRoll";
import MidiPreview from "../components/MidiPreview";
import "../components/SchillingerGenerator.css";
import "./MotifExplorerPage.css";

type MelodicTimbre = "lead" | "pad" | "pluck";

const MELODIC_TIMBRES: { value: MelodicTimbre; label: string; oscillator: OscillatorType }[] = [
  { value: "lead", label: "Lead", oscillator: "sine" },
  { value: "pad", label: "Pad", oscillator: "triangle" },
  { value: "pluck", label: "Pluck", oscillator: "sawtooth" },
];

interface PercussionVoiceSlot {
  kind: "percussion";
  percussionIndex: number;
}
interface MelodicVoiceSlot {
  kind: "melodic";
  timbre: MelodicTimbre;
  octaveOffset: number;
}
type VoiceSlot = PercussionVoiceSlot | MelodicVoiceSlot;

const VOICE_PALETTE = [
  { color: "#3d7ddb", highlight: "#7fb0ef" },
  { color: "#c9932f", highlight: "#e8b95c" },
  { color: "#5cb85c", highlight: "#8fd68f" },
  { color: "#b85ccb", highlight: "#d68fe0" },
];

/** Rebuilds cycleLength/attackPoints from an ordered segment list — used after windowing/rotating/repeating a resultant. */
function resultantFromSegments(segments: ResultantSegment[]): Resultant {
  let cursor = 0;
  const attackPoints: number[] = [];
  for (const segment of segments) {
    attackPoints.push(cursor);
    cursor += segment.duration;
  }
  return { cycleLength: cursor, segments, attackPoints };
}

function voiceLabel(slot: VoiceSlot, index: number): string {
  if (slot.kind === "percussion") return PERCUSSION_VOICE_OPTIONS[slot.percussionIndex].label;
  return `${MELODIC_TIMBRES.find((t) => t.value === slot.timbre)!.label} ${index + 1}`;
}

interface VoiceBuildResult {
  notes: NoteEvent[];
  totalUnits: number;
  resultantRepeats: number;
  lanes: PianoRollLane[];
}

/**
 * Distributes a motif's attacks across N voices via Book I Ch.7's pli/pla
 * mechanic (`synchronizeInstrumentalGroup`/`assignPlaces`): each voice is a
 * "place," attacks cycle round-robin across them, and the whole thing
 * realigns after `resultantRepeats` passes of the motif. Works uniformly
 * for any voice count, including 1 (which trivially resolves to every
 * attack going to the single voice, no repeats needed).
 */
function buildVoices(motif: Resultant, voices: VoiceSlot[], scale: PitchScale, rootMidiNote: number): VoiceBuildResult {
  const attackCount = motif.segments.length;
  const sync = synchronizeInstrumentalGroup(attackCount, voices.length);
  const places = assignPlaces(attackCount, voices.length);
  const repeatedSegments = Array.from({ length: sync.resultantRepeats }, () => motif.segments).flat();

  const perVoiceTimes: number[][] = voices.map(() => []);
  let cursor = 0;
  for (let i = 0; i < repeatedSegments.length; i++) {
    perVoiceTimes[places[i]].push(cursor);
    cursor += repeatedSegments[i].duration;
  }
  const totalUnits = cursor;

  const notes: NoteEvent[] = [];
  const lanes: PianoRollLane[] = voices.map((slot, voiceIndex) => {
    const times = perVoiceTimes[voiceIndex];
    const segments = times.length > 0 ? segmentsFromAttackTimes(times, totalUnits) : [];
    const palette = VOICE_PALETTE[voiceIndex % VOICE_PALETTE.length];

    segments.forEach((segment, i) => {
      const start = times[i];
      if (slot.kind === "percussion") {
        notes.push({
          midiNote: PERCUSSION_VOICE_OPTIONS[slot.percussionIndex].midiNote,
          startUnits: start,
          durationUnits: segment.duration * 0.5,
          velocity: 100,
          voice: voiceIndex,
          channel: GM_DRUM_CHANNEL,
        });
      } else {
        const degreeIndex = i % scale.degrees.length;
        notes.push({
          midiNote: midiNoteForDegree(scale, rootMidiNote + slot.octaveOffset * 12, degreeIndex),
          startUnits: start,
          durationUnits: segment.duration * 0.85,
          velocity: 96,
          voice: voiceIndex,
        });
      }
    });

    return {
      label: voiceLabel(slot, voiceIndex),
      color: palette.color,
      highlight: palette.highlight,
      segments: segments.map((segment) => ({ duration: segment.duration })),
    };
  });

  return { notes, totalUnits, resultantRepeats: sync.resultantRepeats, lanes };
}

type ScaleMode = "preset" | "division" | "cell";

export default function MotifExplorerPage() {
  const [generatorCount, setGeneratorCount] = useState<2 | 3>(2);
  const [caseIndex, setCaseIndex] = useState(0);
  const [threeCaseIndex, setThreeCaseIndex] = useState(0);
  const [technique, setTechnique] = useState<Technique>("plain");
  const [repeatCount, setRepeatCount] = useState(1);

  const activeCase = BINARY_SYNCHRONIZATION_CASES[caseIndex];
  const activeThreeCase = THREE_GENERATOR_CASES[threeCaseIndex];

  const techniqueResultant: Resultant = useMemo(() => {
    return generatorCount === 3
      ? buildTheme(activeThreeCase.generators)
      : buildResultantForTechnique(technique, activeCase.a, activeCase.b);
  }, [generatorCount, activeThreeCase, technique, activeCase]);

  // Ch.10's higher-order growth (Section A, "Permutations of the Higher
  // Order"): the two (or three) generator VALUES themselves are the seeds,
  // exactly as the book's own Figure 120 example uses tiny numeric seeds --
  // growing them concatenates into a much longer cycle to browse, e.g. the
  // classic "abbabaab" + "baababba" at order 4 for two seeds.
  const [extendMode, setExtendMode] = useState<"technique" | "growth">("technique");
  const [growthOrder, setGrowthOrder] = useState(2);

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
  const [lengthMode, setLengthMode] = useState<"events" | "beats">("events");
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

  const windowSegments = useMemo(
    () => repeatedResultant.segments.slice(clampedStart, clampedStart + windowLength),
    [repeatedResultant, clampedStart, windowLength],
  );

  // Rotation (circular-permutation) browsing of the current window.
  const rotationOrder = useMemo(
    () => circularPermutations(windowSegments.map((_, i) => i)),
    [windowSegments],
  );
  const [variationIndex, setVariationIndex] = useState(0);
  useEffect(() => setVariationIndex(0), [clampedStart, windowLength]);

  const activeSegments = useMemo(() => {
    if (variationIndex === 0) return windowSegments;
    return rotationOrder[variationIndex % rotationOrder.length].map((i) => windowSegments[i]);
  }, [windowSegments, rotationOrder, variationIndex]);

  const activeMotif = useMemo(() => resultantFromSegments(activeSegments), [activeSegments]);

  // Voices, distributed across the motif's attacks via pli/pla (Book I Ch.7).
  const [voices, setVoices] = useState<VoiceSlot[]>([
    { kind: "percussion", percussionIndex: 0 },
    { kind: "melodic", timbre: "lead", octaveOffset: 0 },
  ]);

  function replaceVoice(index: number, slot: VoiceSlot) {
    setVoices((vs) => vs.map((v, i) => (i === index ? slot : v)));
  }
  function addVoice() {
    setVoices((vs) => (vs.length >= 4 ? vs : [...vs, { kind: "melodic", timbre: "lead", octaveOffset: 0 }]));
  }
  function removeVoice(index: number) {
    setVoices((vs) => (vs.length <= 1 ? vs : vs.filter((_, i) => i !== index)));
  }

  // Scale.
  const [scaleMode, setScaleMode] = useState<ScaleMode>("preset");
  const [presetIndex, setPresetIndex] = useState(4);
  const [divisionN, setDivisionN] = useState(7);
  const [cellText, setCellText] = useState("2,2,1,2,2,2,1");
  const [rootMidiNote, setRootMidiNote] = useState(60);

  const scale: PitchScale = useMemo(() => {
    if (scaleMode === "division") {
      try {
        return symmetricDivisionScale(divisionN);
      } catch {
        return SCALE_PRESETS[presetIndex].build();
      }
    }
    if (scaleMode === "cell") {
      const cell = cellText
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      try {
        return cell.length > 0 ? intervalCellScale(cell) : SCALE_PRESETS[presetIndex].build();
      } catch {
        return SCALE_PRESETS[presetIndex].build();
      }
    }
    return SCALE_PRESETS[presetIndex].build();
  }, [scaleMode, presetIndex, divisionN, cellText]);

  const voiceBuild = useMemo(() => buildVoices(activeMotif, voices, scale, rootMidiNote), [activeMotif, voices, scale, rootMidiNote]);

  const timeSignatureOptions = useMemo(
    () => computeLoopTimeSignatureOptions(voiceBuild.totalUnits),
    [voiceBuild.totalUnits],
  );
  const [timeSignatureIndex, setTimeSignatureIndex] = useState(0);
  useEffect(() => setTimeSignatureIndex(0), [timeSignatureOptions.length, voiceBuild.totalUnits]);
  const selectedTimeSignature = timeSignatureOptions[Math.min(timeSignatureIndex, timeSignatureOptions.length - 1)];

  // Playback.
  const [bpm, setBpm] = useState(112);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = voiceBuild.totalUnits * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || voiceBuild.notes.length === 0) return;

    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of voiceBuild.notes) {
      const slot = voices[note.voice];
      const oscillatorType: OscillatorType =
        slot?.kind === "percussion" ? "square" : MELODIC_TIMBRES.find((t) => t.value === slot?.timbre)!.oscillator;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = oscillatorType;
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit;
      gain.gain.setValueAtTime(note.velocity / 400, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
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
    if (voiceBuild.notes.length === 0) return;
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
  }, [voiceBuild.notes, secondsPerUnit, cycleSeconds]);

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
    if (voiceBuild.notes.length === 0) return;
    const bytes = buildMidiFile(voiceBuild.notes, { bpm, ticksPerUnit: 120 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-motif.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcuts: Left/Right slide the window, Up/Down browse rotations, Space plays/stops.
  // A ref holds the latest handlers so the listener can attach once on mount without going stale.
  const handlersRef = useRef({
    moveWindow: (_delta: number) => {},
    cycleVariation: (_delta: number) => {},
    togglePlayback: () => {},
  });
  handlersRef.current = {
    moveWindow: (delta: number) =>
      setLoopSelection((sel) => ({ ...sel, start: Math.max(0, Math.min(sel.start + delta, totalSegments - 1)) })),
    cycleVariation: (delta: number) =>
      setVariationIndex((v) => (v + delta + rotationOrder.length) % rotationOrder.length),
    togglePlayback,
  };

  // Side-panel disclosure: every compositional parameter lives behind a rail
  // button, closed by default, so the piano roll stays the visual focus.
  type PanelKey = "rhythm" | "extend" | "length" | "voices" | "scale";
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  function togglePanel(key: PanelKey) {
    setActivePanel((current) => (current === key ? null : key));
  }

  useEffect(() => {
    if (!activePanel) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (railRef.current?.contains(target) || flyoutRef.current?.contains(target)) return;
      setActivePanel(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activePanel]);

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
          handlersRef.current.cycleVariation(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          handlersRef.current.cycleVariation(1);
          break;
        case " ":
        case "Spacebar":
          e.preventDefault();
          handlersRef.current.togglePlayback();
          break;
        case "Escape":
          setActivePanel(null);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const panelButton = (key: PanelKey, label: string) => (
    <button
      type="button"
      className={activePanel === key ? "motif-rail__btn motif-rail__btn--active" : "motif-rail__btn"}
      onClick={() => togglePanel(key)}
    >
      {label}
    </button>
  );

  return (
    <main className="motif-page">
      <h1>Motif Explorer</h1>

      <div className="motif-workspace">
        <div className="motif-rail" ref={railRef}>
          {panelButton("rhythm", "Rhythm")}
          {panelButton("extend", "Extend")}
          {panelButton("length", "Length")}
          {panelButton("voices", "Voices")}
          {panelButton("scale", "Scale")}
        </div>

        {activePanel && (
          <div className="motif-flyout" ref={flyoutRef}>
            {activePanel === "rhythm" && (
              <div className="motif-flyout__panel">
                <h3>Rhythm</h3>
                <div className="schillinger__row">
                  <label>
                    Generators
                    <select value={generatorCount} onChange={(e) => setGeneratorCount(Number(e.target.value) as 2 | 3)}>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </label>
                  {generatorCount === 2 ? (
                    <label>
                      Case
                      <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))}>
                        {BINARY_SYNCHRONIZATION_CASES.map((c, i) => (
                          <option key={c.label} value={i}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Case
                      <select value={threeCaseIndex} onChange={(e) => setThreeCaseIndex(Number(e.target.value))}>
                        {THREE_GENERATOR_CASES.map((c, i) => (
                          <option key={c.label} value={i}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <div className="schillinger__readout">
                  base cycle {baseResultant.cycleLength} units · {baseResultant.segments.length} events · durations{" "}
                  {baseResultant.segments.map((s) => s.duration).join(" ")}
                </div>
              </div>
            )}

            {activePanel === "extend" && (
              <div className="motif-flyout__panel">
                <h3>Extend the motif</h3>
                <div className="schillinger__row">
                  <label>
                    Mode
                    <select value={extendMode} onChange={(e) => setExtendMode(e.target.value as "technique" | "growth")}>
                      <option value="technique">Technique (Ch. 4-5)</option>
                      <option value="growth">Higher-order growth (Ch. 10)</option>
                    </select>
                  </label>
                </div>
                {extendMode === "technique" ? (
                  <div className="schillinger__row">
                    {generatorCount === 2 && (
                      <label>
                        Technique
                        <select value={technique} onChange={(e) => setTechnique(e.target.value as Technique)}>
                          <option value="plain">Plain</option>
                          <option value="fractioned">Fractioned</option>
                          <option value="expansion">Expansion (append)</option>
                          <option value="contraction">Contraction (prepend)</option>
                          <option value="balance">Balance (combine)</option>
                        </select>
                      </label>
                    )}
                    <label>
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
                  </div>
                ) : (
                  <div className="schillinger__row">
                    <label>
                      Order
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={growthOrder}
                        onChange={(e) => setGrowthOrder(Math.max(1, Math.min(6, Number(e.target.value))))}
                      />
                    </label>
                    <span className="schillinger__hint">
                      {generatorCount === 3 ? "3" : "2"} seeds ({growthSeeds.map((s) => s[0]).join(", ")}) grown to order{" "}
                      {growthOrder} → {growthResultant.segments.length} events
                    </span>
                  </div>
                )}
              </div>
            )}

            {activePanel === "length" && (
              <div className="motif-flyout__panel">
                <h3>Motif length</h3>
                <div className="schillinger__row">
                  <label className="schillinger__checkbox">
                    <input type="radio" name="lengthMode" checked={lengthMode === "events"} onChange={() => setLengthMode("events")} />
                    By events
                  </label>
                  <label className="schillinger__checkbox">
                    <input type="radio" name="lengthMode" checked={lengthMode === "beats"} onChange={() => setLengthMode("beats")} />
                    By beats
                  </label>
                </div>
                <div className="schillinger__row">
                  <label>
                    Start
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, totalSegments - 1)}
                      value={clampedStart}
                      onChange={(e) => setLoopSelection((sel) => ({ ...sel, start: Number(e.target.value) }))}
                    />
                  </label>
                  {lengthMode === "events" ? (
                    <label>
                      Length (events)
                      <input
                        type="number"
                        min={1}
                        max={totalSegments}
                        value={loopSelection.length}
                        onChange={(e) => setLoopSelection((sel) => ({ ...sel, length: Number(e.target.value) }))}
                      />
                    </label>
                  ) : (
                    <label>
                      Target beats
                      <input type="number" min={1} max={64} value={targetBeats} onChange={(e) => setTargetBeats(Number(e.target.value))} />
                    </label>
                  )}
                </div>
                {timeSignatureOptions.length > 1 && (
                  <div className="schillinger__row">
                    <label>
                      Time signature
                      <select value={timeSignatureIndex} onChange={(e) => setTimeSignatureIndex(Number(e.target.value))}>
                        {timeSignatureOptions.map((o, i) => (
                          <option key={o.label} value={i}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <div className="schillinger__readout">
                  window {activeSegments.map((s) => s.duration).join(" ")} ({activeMotif.cycleLength} beats,{" "}
                  {activeSegments.length} events)
                  {variationIndex > 0 && (
                    <>
                      {" "}
                      · rotation {variationIndex + 1}/{rotationOrder.length}
                    </>
                  )}
                </div>
              </div>
            )}

            {activePanel === "voices" && (
              <div className="motif-flyout__panel">
                <h3>Voices</h3>
                {voices.map((slot, i) => (
                  <div className="schillinger__row" key={i}>
                    <label>
                      Voice {i + 1}
                      <select
                        value={slot.kind}
                        onChange={(e) =>
                          replaceVoice(
                            i,
                            e.target.value === "percussion"
                              ? { kind: "percussion", percussionIndex: 0 }
                              : { kind: "melodic", timbre: "lead", octaveOffset: 0 },
                          )
                        }
                      >
                        <option value="percussion">Percussion</option>
                        <option value="melodic">Melodic</option>
                      </select>
                    </label>
                    {slot.kind === "percussion" ? (
                      <label>
                        Sound
                        <select
                          value={slot.percussionIndex}
                          onChange={(e) => replaceVoice(i, { kind: "percussion", percussionIndex: Number(e.target.value) })}
                        >
                          {PERCUSSION_VOICE_OPTIONS.map((p, pi) => (
                            <option key={p.label} value={pi}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <>
                        <label>
                          Timbre
                          <select
                            value={slot.timbre}
                            onChange={(e) => replaceVoice(i, { ...slot, timbre: e.target.value as MelodicTimbre })}
                          >
                            {MELODIC_TIMBRES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Octave
                          <input
                            type="number"
                            min={-2}
                            max={2}
                            value={slot.octaveOffset}
                            onChange={(e) => replaceVoice(i, { ...slot, octaveOffset: Number(e.target.value) })}
                          />
                        </label>
                      </>
                    )}
                    <button type="button" onClick={() => removeVoice(i)} disabled={voices.length <= 1}>
                      Remove
                    </button>
                  </div>
                ))}
                <div className="schillinger__actions">
                  <button type="button" onClick={addVoice} disabled={voices.length >= 4}>
                    + Add voice
                  </button>
                </div>
                <div className="schillinger__readout">
                  {activeMotif.segments.length} attacks distributed by pli/pla across {voices.length} voice
                  {voices.length === 1 ? "" : "s"}
                  {voiceBuild.resultantRepeats > 1 && <> · motif repeats {voiceBuild.resultantRepeats}× before voices realign</>}
                </div>
              </div>
            )}

            {activePanel === "scale" && (
              <div className="motif-flyout__panel">
                <h3>Scale</h3>
                <div className="schillinger__row">
                  <label>
                    Mode
                    <select value={scaleMode} onChange={(e) => setScaleMode(e.target.value as ScaleMode)}>
                      <option value="preset">Preset</option>
                      <option value="division">Equal division</option>
                      <option value="cell">Interval cell</option>
                    </select>
                  </label>
                  {scaleMode === "preset" && (
                    <label>
                      Scale
                      <select value={presetIndex} onChange={(e) => setPresetIndex(Number(e.target.value))}>
                        {SCALE_PRESETS.map((p, i) => (
                          <option key={p.name} value={i}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {scaleMode === "division" && (
                    <label>
                      Notes
                      <input type="number" min={1} max={12} value={divisionN} onChange={(e) => setDivisionN(Number(e.target.value))} />
                    </label>
                  )}
                  {scaleMode === "cell" && (
                    <label>
                      Cell (semitones)
                      <input type="text" value={cellText} onChange={(e) => setCellText(e.target.value)} />
                    </label>
                  )}
                  <label>
                    Root
                    <input
                      type="number"
                      min={24}
                      max={96}
                      value={rootMidiNote}
                      onChange={(e) => setRootMidiNote(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="schillinger__readout">
                  {scale.intervals.length}-note scale · intervals {scale.intervals.join(" ")}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="motif-stage-wrap">
          <section className="motif-page__stage">
            {selectedTimeSignature && (
              <MidiPreview
                lanes={voiceBuild.lanes}
                cycleLength={voiceBuild.totalUnits}
                timeSignature={selectedTimeSignature}
                playheadFraction={isPlaying ? playheadFraction : undefined}
                onShiftLeft={() => handlersRef.current.moveWindow(-1)}
                onShiftRight={() => handlersRef.current.moveWindow(1)}
                canShiftLeft={clampedStart > 0}
                canShiftRight={clampedStart < totalSegments - 1}
                onCycleUp={() => handlersRef.current.cycleVariation(-1)}
                onCycleDown={() => handlersRef.current.cycleVariation(1)}
                canCycle={rotationOrder.length > 1}
                positionLabel={`window ${clampedStart + 1}-${clampedStart + windowLength} of ${totalSegments}`}
                variationLabel={rotationOrder.length > 1 ? `rotation ${variationIndex + 1}/${rotationOrder.length}` : undefined}
              />
            )}
            <p className="motif-page__hint">
              ←/→ slides the window · ↑/↓ browses rotations · space plays/stops
            </p>
            <div className="schillinger__row">
              <label>
                Tempo
                <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
                bpm
              </label>
            </div>
            <div className="schillinger__actions">
              <button type="button" onClick={togglePlayback} disabled={voiceBuild.notes.length === 0 && !isPlaying}>
                {isPlaying ? "Stop" : "Play"}
              </button>
              <button type="button" onClick={downloadMidi} disabled={voiceBuild.notes.length === 0}>
                Download MIDI
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
