import { useEffect, useMemo, useRef, useState } from "react";
import { generatorPulse, BINARY_SYNCHRONIZATION_CASES } from "../core/resultant";
import { computeFractionedGroupings } from "../core/fractioning";
import { computeGroupings } from "../core/grouping";
import { computePairGrouping } from "../core/groupsByPairs";
import { computeTimeSignatureOptions, computeLoopTimeSignatureOptions } from "../core/timeSignature";
import { buildResultantForTechnique, type Technique } from "../core/technique";
import { SCALE_PRESETS } from "../core/scales";
import { buildMelody, applyStrata, type Contour, type NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import { parseMidiFile, type ImportedNote } from "../core/midiImport";
import {
  reduceToUnits,
  notesToRhythmPattern,
  findPatternOccurrences,
  findMatchingCases,
  findMatchingResultants,
} from "../core/rhythmAnalysis";
import { pitchClassesFromMidiNotes, classifyScaleGroup, twoUnitScaleLabel } from "../core/pitchClassification";
import { DIVISION_LABELS } from "../core/quantize";
import {
  PERCUSSION_SOURCES,
  PERCUSSION_SOURCE_LABELS,
  PERCUSSION_VOICE_OPTIONS,
  buildPercussionVoices,
  emptyPercussionAssignments,
  segmentsForSource,
  type PercussionSource,
} from "../core/percussion";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import InstrumentalInterferencePanel from "./InstrumentalInterferencePanel";
import TimeStructureCoordinationPanel from "./TimeStructureCoordinationPanel";
import PermutationsPanel from "./PermutationsPanel";
import HigherOrderPermutationsPanel from "./HigherOrderPermutationsPanel";
import HomogeneousContinuityPanel from "./HomogeneousContinuityPanel";
import DistributivePowersPanel from "./DistributivePowersPanel";
import RhythmStyleEvolutionPanel from "./RhythmStyleEvolutionPanel";
import VariableVelocityPanel from "./VariableVelocityPanel";
import PitchScaleEvolutionPanel from "./PitchScaleEvolutionPanel";
import MelodicModulationPanel from "./MelodicModulationPanel";
import ScalesInExpansionPanel from "./ScalesInExpansionPanel";
import SymmetricScalesPanel from "./SymmetricScalesPanel";
import GeometricalInversionsPanel from "./GeometricalInversionsPanel";
import MelodicAxesPanel from "./MelodicAxesPanel";
import "./SchillingerGenerator.css";

const LANE_COLORS = {
  cp: { color: "#c9932f", highlight: "#e8b95c" },
  cd: { color: "#8a6fb0", highlight: "#b09bd6" },
  generator: { color: "#3c8a5c", highlight: "#5fb884" },
  resultant: { color: "#3a6ea8", highlight: "#6a9bd6" },
};

const REGISTER_OPTIONS = [
  { label: "Low (C3)", value: 48 },
  { label: "Mid (C4)", value: 60 },
  { label: "High (C5)", value: 72 },
];

const CONTOUR_OPTIONS: { label: string; value: Contour }[] = [
  { label: "Ascending", value: "ascending" },
  { label: "Descending", value: "descending" },
  { label: "Arch (up then down)", value: "arch" },
  { label: "Wedge (expanding outward)", value: "wedgeOut" },
  { label: "Cycle (loop the scale)", value: "cycle" },
];

const UNIT_NOTE_OPTIONS: { label: string; value: number; denominator: number | null }[] = [
  { label: "Sixteenth note", value: 120, denominator: 16 },
  { label: "Eighth-note triplet", value: 160, denominator: null },
  { label: "Eighth note", value: 240, denominator: 8 },
  { label: "Quarter note", value: 480, denominator: 4 },
];

const HARMONY_PRESETS: { label: string; intervals: number[] }[] = [
  { label: "None", intervals: [] },
  { label: "Third above", intervals: [4] },
  { label: "Fifth above", intervals: [7] },
  { label: "Triad above", intervals: [4, 7] },
  { label: "Octave below", intervals: [-12] },
  { label: "Triad + octave below", intervals: [-12, 4, 7] },
];

const TECHNIQUE_OPTIONS: { label: string; value: Technique }[] = [
  { label: "Plain (Ch. 2A)", value: "plain" },
  { label: "Fractioned (Ch. 4)", value: "fractioned" },
  { label: "Expansion (Ch. 5)", value: "expansion" },
  { label: "Contraction (Ch. 5)", value: "contraction" },
  { label: "Balance (Ch. 5)", value: "balance" },
];

export default function SchillingerGenerator({ children }: { children?: React.ReactNode }) {
  const [caseIndex, setCaseIndex] = useState(0); // defaults to 3 : 2
  const [scaleIndex, setScaleIndex] = useState(0);
  const [rootMidiNote, setRootMidiNote] = useState(60);
  const [contour, setContour] = useState<Contour>("ascending");
  const [span, setSpan] = useState(2);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [harmonyIndex, setHarmonyIndex] = useState(0);
  const [percussionAssignments, setPercussionAssignments] = useState(emptyPercussionAssignments());
  const [technique, setTechnique] = useState<Technique>("plain");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const [manualPatternText, setManualPatternText] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState<ImportedNote[] | null>(null);
  const [analysisTicksPerQuarter, setAnalysisTicksPerQuarter] = useState(480);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loopSelection, setLoopSelection] = useState<{ start: number; length: number } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const analysisResult = useMemo(() => {
    if (analysisNotes && analysisNotes.length > 0) {
      return notesToRhythmPattern(analysisNotes, analysisTicksPerQuarter);
    }
    const parsed = manualPatternText
      .split(",")
      .map((token) => Number(token.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    return parsed.length > 0
      ? { pattern: reduceToUnits(parsed), divisionsPerQuarter: null, errorRatio: null }
      : null;
  }, [analysisNotes, analysisTicksPerQuarter, manualPatternText]);
  const analysisPattern = analysisResult?.pattern ?? null;

  const matchingCases = useMemo(
    () => (analysisPattern ? findMatchingCases(analysisPattern) : null),
    [analysisPattern],
  );

  const availableCases = useMemo(
    () => (matchingCases && matchingCases.length > 0 ? matchingCases.map((m) => m.case) : BINARY_SYNCHRONIZATION_CASES),
    [matchingCases],
  );

  // The case list changes shape whenever the pattern changes (fewer/more
  // cases match), so the previous index may now point at a different case
  // or nothing at all -- always land back on the first available one.
  useEffect(() => {
    setCaseIndex(0);
  }, [availableCases]);

  const pitchAnalysis = useMemo(() => {
    if (!analysisNotes || analysisNotes.length === 0) return null;
    const midiNotes = analysisNotes.map((note) => note.midiNote);
    const pitchClasses = pitchClassesFromMidiNotes(midiNotes);
    return {
      pitchClasses,
      group: classifyScaleGroup(midiNotes),
      twoUnitLabel: twoUnitScaleLabel(pitchClasses),
    };
  }, [analysisNotes]);

  async function handleMidiUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const imported = parseMidiFile(new Uint8Array(buffer));
      if (imported.notes.length === 0) {
        setAnalysisError("No notes found in that file's busiest track.");
        return;
      }
      setAnalysisTicksPerQuarter(imported.ticksPerQuarterNote);
      setAnalysisNotes(imported.notes);
      setManualPatternText("");
      setAnalysisError(null);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Could not read that MIDI file.");
    }
  }

  function clearAnalysis() {
    setManualPatternText("");
    setAnalysisNotes(null);
    setAnalysisError(null);
  }

  const selectedCase = availableCases[caseIndex] ?? availableCases[0];
  const generators = useMemo(
    () => [selectedCase.a, selectedCase.b],
    [selectedCase],
  );

  const activeResultant = useMemo(
    () => buildResultantForTechnique(technique, selectedCase.a, selectedCase.b),
    [technique, selectedCase],
  );

  // The resultant's own segment count changes shape whenever the case or
  // technique changes, so a previously selected loop range may no longer
  // make sense -- clear it rather than risk it silently pointing at the
  // wrong segments.
  useEffect(() => {
    setLoopSelection(null);
  }, [technique, selectedCase]);

  // A loop is a contiguous, non-wrapping run of adjacent segments within
  // the active resultant -- "c.d." increments, in Schillinger's own
  // abbreviation for the finest common-denominator grid a resultant's
  // attack points fall on.
  const loopDurations = useMemo(() => {
    if (!loopSelection) return null;
    return activeResultant.segments
      .slice(loopSelection.start, loopSelection.start + loopSelection.length)
      .map((s) => s.duration);
  }, [activeResultant, loopSelection]);

  const loopStartUnits = useMemo(() => {
    if (!loopSelection) return 0;
    return activeResultant.segments.slice(0, loopSelection.start).reduce((sum, s) => sum + s.duration, 0);
  }, [activeResultant, loopSelection]);

  const loopTotalUnits = loopDurations
    ? loopDurations.reduce((sum, d) => sum + d, 0)
    : activeResultant.cycleLength;

  const loopTimeSignatureOptions = useMemo(
    () => (loopDurations ? computeLoopTimeSignatureOptions(loopTotalUnits) : []),
    [loopDurations, loopTotalUnits],
  );

  // Where else this exact loop pattern occurs, across every case and
  // technique -- a possible pivot or modulation point. Excludes the
  // source itself, which trivially "matches."
  const loopMatches = useMemo(() => {
    if (!loopDurations) return null;
    return findMatchingResultants(loopDurations).filter(
      (m) => !(m.case.label === selectedCase.label && m.technique === technique),
    );
  }, [loopDurations, selectedCase, technique]);

  const groupings = useMemo(
    () => computeGroupings(selectedCase.a, selectedCase.b),
    [selectedCase],
  );
  const fractionedGroupings = useMemo(
    () => computeFractionedGroupings(selectedCase.a, selectedCase.b),
    [selectedCase],
  );
  const pairGrouping = useMemo(
    () => computePairGrouping(selectedCase.a, activeResultant.cycleLength),
    [selectedCase, activeResultant],
  );

  const timeSignatureOptions = useMemo(
    () =>
      computeTimeSignatureOptions({
        technique,
        a: selectedCase.a,
        b: selectedCase.b,
        cycleLength: activeResultant.cycleLength,
      }),
    [technique, selectedCase, activeResultant.cycleLength],
  );
  const [timeSignatureIndex, setTimeSignatureIndex] = useState(0);
  // Whenever the case or technique changes, the option list is rebuilt from
  // scratch, so re-pick a sensible default: the single-bar view where
  // Generator A lands exactly one note per bar (unitsPerBeat === b),
  // matching the piano roll's original fixed behavior.
  useEffect(() => {
    const preferred = timeSignatureOptions.findIndex(
      (option) => option.unitsPerBeat === selectedCase.b && option.bars === 1,
    );
    setTimeSignatureIndex(preferred >= 0 ? preferred : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique, selectedCase]);
  const selectedTimeSignature = timeSignatureOptions[timeSignatureIndex] ?? timeSignatureOptions[0];

  const patternOccurrences = useMemo(
    () =>
      analysisPattern
        ? findPatternOccurrences(analysisPattern, activeResultant.segments.map((s) => s.duration))
        : [],
    [analysisPattern, activeResultant],
  );

  const pianoRollLanes: PianoRollLane[] = useMemo(() => {
    const cycleLength = activeResultant.cycleLength;
    const lanes: PianoRollLane[] = [
      {
        label: `C.P. (${cycleLength})`,
        ...LANE_COLORS.cp,
        segments: [{ duration: cycleLength }],
      },
      {
        label: "C.D.",
        ...LANE_COLORS.cd,
        segments: Array.from({ length: cycleLength }, () => ({ duration: 1 })),
      },
      {
        label: `Generator A (${selectedCase.a})`,
        ...LANE_COLORS.generator,
        segments: generatorPulse(selectedCase.a, cycleLength).map((s) => ({ duration: s.duration })),
      },
    ];
    if (technique === "plain") {
      lanes.push({
        label: `Generator B (${selectedCase.b})`,
        ...LANE_COLORS.generator,
        segments: generatorPulse(selectedCase.b, cycleLength).map((s) => ({ duration: s.duration })),
      });
    }

    const matchedIndices = new Set<number>();
    for (const start of patternOccurrences) {
      for (let offset = 0; offset < (analysisPattern?.length ?? 0); offset++) {
        matchedIndices.add((start + offset) % activeResultant.segments.length);
      }
    }
    lanes.push({
      label: "Resultant (r)",
      ...LANE_COLORS.resultant,
      segments: activeResultant.segments.map((s, index) => ({
        duration: s.duration,
        accent: s.sources.length > 1,
        matched: matchedIndices.has(index),
        looped: loopSelection != null && index >= loopSelection.start && index < loopSelection.start + loopSelection.length,
      })),
    });
    return lanes;
  }, [activeResultant, selectedCase, technique, patternOccurrences, analysisPattern, loopSelection]);

  const scale = useMemo(() => SCALE_PRESETS[scaleIndex].build(), [scaleIndex]);

  const notes: NoteEvent[] = useMemo(() => {
    const melody = buildMelody(activeResultant, {
      rootMidiNote,
      scale,
      contour,
      span,
      baseVelocity: 85,
      accentVelocity: 115,
    });

    const harmonyPreset = HARMONY_PRESETS[harmonyIndex];
    const harmonized =
      harmonyPreset.intervals.length > 0
        ? applyStrata(melody, { intervals: harmonyPreset.intervals })
        : melody;

    const voiceOffset = harmonyPreset.intervals.length + 1;
    const percussionVoices = buildPercussionVoices(
      percussionAssignments,
      activeResultant,
      selectedCase.a,
      selectedCase.b,
      voiceOffset,
    );

    return [...harmonized, ...percussionVoices];
  }, [
    activeResultant,
    scale,
    rootMidiNote,
    contour,
    span,
    harmonyIndex,
    percussionAssignments,
    selectedCase,
  ]);

  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleSeconds = loopTotalUnits * secondsPerUnit;

  // Restricts playback to the selected loop range when one is active: the
  // full note list, sliced to the loop's time window and shifted so it
  // starts at 0. Export (Download MIDI) deliberately ignores this and
  // always writes the complete resultant -- looping is a preview/analysis
  // aid, not an export scope.
  const playbackNotes = useMemo(() => {
    if (!loopSelection) return notes;
    const loopEndUnits = loopStartUnits + loopTotalUnits;
    return notes
      .filter((n) => n.startUnits >= loopStartUnits && n.startUnits < loopEndUnits)
      .map((n) => ({ ...n, startUnits: n.startUnits - loopStartUnits }));
  }, [notes, loopSelection, loopStartUnits, loopTotalUnits]);

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || playbackNotes.length === 0) return;

    const harmonyVoiceCount = HARMONY_PRESETS[harmonyIndex].intervals.length;
    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of playbackNotes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const isPulseVoice = note.voice > harmonyVoiceCount;
      oscillator.type = note.voice === 0 ? "sine" : isPulseVoice ? "square" : "triangle";
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit * 0.9;
      const peakGain = 0.15 * (note.velocity / 127);
      gain.gain.setValueAtTime(peakGain, noteStart);
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
    if (playbackNotes.length === 0) return;
    audioContextRef.current = new AudioContext();
    setIsPlaying(true);
    scheduleLoopPass(++playTokenRef.current);
  }

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Restarts the loop from the top whenever the notes, loop selection, or
  // timing change while playing, so the cycle reflects the latest controls
  // instead of the stale closure captured when Play was first clicked.
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    audioContextRef.current.close();
    audioContextRef.current = new AudioContext();
    scheduleLoopPass(++playTokenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackNotes, secondsPerUnit, cycleSeconds]);

  // Drives the visual playhead in ResultantBar from the AudioContext's own
  // clock rather than a separate timer, so it can't drift out of sync with
  // what's actually sounding. When a loop is active, the audio clock only
  // covers the loop's own (shorter) duration, so its fraction is remapped
  // onto the loop's position within the full piano roll -- with no loop
  // selected, loopStartUnits is 0 and loopTotalUnits is the full cycle
  // length, so this reduces to the un-remapped fraction.
  useEffect(() => {
    if (!isPlaying) return;

    let frame: number;
    function tick() {
      const context = audioContextRef.current;
      if (context && cycleSeconds > 0) {
        const elapsed = (context.currentTime - cycleStartRef.current) % cycleSeconds;
        const loopFraction = elapsed / cycleSeconds;
        setPlayheadFraction((loopStartUnits + loopFraction * loopTotalUnits) / activeResultant.cycleLength);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isPlaying, cycleSeconds, loopStartUnits, loopTotalUnits, activeResultant.cycleLength]);

  function timeSignatureFor(unitsPerBar: number): string {
    const unit = UNIT_NOTE_OPTIONS.find((option) => option.value === ticksPerUnit);
    return unit?.denominator != null
      ? `${unitsPerBar}/${unit.denominator}`
      : `${unitsPerBar} units (eighth-note triplets — no simple time signature)`;
  }

  function downloadMidi() {
    if (notes.length === 0) return;
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit });
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schillinger-${generators.join("-")}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="schillinger">
      <section className="schillinger__section schillinger__section--wide">
        <h3>Identify a rhythm and pitch scale</h3>
        <div className="schillinger__row">
          <label>
            Pattern (comma-separated durations)
            <input
              type="text"
              placeholder="2,1,1 (sousta: quarter, eighth, eighth)"
              value={manualPatternText}
              onChange={(e) => {
                setManualPatternText(e.target.value);
                setAnalysisNotes(null);
              }}
            />
          </label>
          <label>
            Upload MIDI
            <input type="file" accept=".mid,.midi" onChange={handleMidiUpload} />
          </label>
          {(analysisPattern || analysisError) && (
            <button type="button" onClick={clearAnalysis}>
              Clear
            </button>
          )}
        </div>
        {analysisError && <div className="schillinger__readout schillinger__readout--error">{analysisError}</div>}
        {analysisResult?.divisionsPerQuarter != null && (
          <div className="schillinger__readout">
            Quantized to {DIVISION_LABELS[analysisResult.divisionsPerQuarter] ?? `1/${analysisResult.divisionsPerQuarter}`}{" "}
            grid · {((analysisResult.errorRatio ?? 0) * 100).toFixed(1)}% timing deviation absorbed
          </div>
        )}
        {analysisPattern && (
          <div className="schillinger__readout">
            Pattern {analysisPattern.join(" ")} found in {matchingCases?.length ?? 0} of 19 canonical cases
            {matchingCases && matchingCases.length > 0 && `: ${matchingCases.map((m) => m.case.label).join(", ")}`}
          </div>
        )}
        {pitchAnalysis && (
          <div className="schillinger__readout">
            Pitch classes {pitchAnalysis.pitchClasses.join(", ")} · {pitchAnalysis.group?.label}
            {pitchAnalysis.twoUnitLabel && ` · ${pitchAnalysis.twoUnitLabel}`}
          </div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Resultant (Theory of Rhythm, Ch. 2A: Binary Synchronization)</h3>
        <div className="schillinger__row">
          <label>
            Case
            <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))}>
              {availableCases.map((binaryCase, index) => (
                <option key={binaryCase.label} value={index}>
                  {binaryCase.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Technique
            <select value={technique} onChange={(e) => setTechnique(e.target.value as Technique)}>
              {TECHNIQUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time signature
            <select value={timeSignatureIndex} onChange={(e) => setTimeSignatureIndex(Number(e.target.value))}>
              {timeSignatureOptions.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedTimeSignature && (
          <SchillingerPianoRoll
            lanes={pianoRollLanes}
            cycleLength={activeResultant.cycleLength}
            timeSignature={selectedTimeSignature}
            playheadFraction={isPlaying ? playheadFraction : undefined}
          />
        )}

        <div className="schillinger__readout">
          {TECHNIQUE_OPTIONS.find((o) => o.value === technique)?.label} cycle length {activeResultant.cycleLength}{" "}
          units · durations {activeResultant.segments.map((s) => s.duration).join(" ")} · coincidence points{" "}
          {activeResultant.segments.filter((s) => s.sources.length > 1).length}
        </div>

        <div className="schillinger__row">
          <label className="schillinger__checkbox">
            <input
              type="checkbox"
              checked={loopSelection !== null}
              disabled={activeResultant.segments.length < 2}
              onChange={(e) =>
                setLoopSelection(
                  e.target.checked ? { start: 0, length: Math.min(2, activeResultant.segments.length) } : null,
                )
              }
            />
            Loop a range (c.d. increments)
          </label>
          {loopSelection && (
            <>
              <label>
                Start
                <button
                  type="button"
                  onClick={() => setLoopSelection({ ...loopSelection, start: Math.max(0, loopSelection.start - 1) })}
                  disabled={loopSelection.start === 0}
                >
                  ◀
                </button>
                <input
                  type="number"
                  min={0}
                  max={activeResultant.segments.length - loopSelection.length}
                  value={loopSelection.start}
                  onChange={(e) => {
                    const maxStart = activeResultant.segments.length - loopSelection.length;
                    const start = Math.max(0, Math.min(Number(e.target.value), maxStart));
                    setLoopSelection({ ...loopSelection, start });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setLoopSelection({
                      ...loopSelection,
                      start: Math.min(activeResultant.segments.length - loopSelection.length, loopSelection.start + 1),
                    })
                  }
                  disabled={loopSelection.start + loopSelection.length >= activeResultant.segments.length}
                >
                  ▶
                </button>
              </label>
              <label>
                Length
                <button
                  type="button"
                  onClick={() => setLoopSelection({ ...loopSelection, length: Math.max(2, loopSelection.length - 1) })}
                  disabled={loopSelection.length <= 2}
                >
                  −
                </button>
                <input
                  type="number"
                  min={2}
                  max={activeResultant.segments.length - loopSelection.start}
                  value={loopSelection.length}
                  onChange={(e) => {
                    const maxLength = activeResultant.segments.length - loopSelection.start;
                    const length = Math.max(2, Math.min(Number(e.target.value), maxLength));
                    setLoopSelection({ ...loopSelection, length });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setLoopSelection({
                      ...loopSelection,
                      length: Math.min(
                        activeResultant.segments.length - loopSelection.start,
                        loopSelection.length + 1,
                      ),
                    })
                  }
                  disabled={loopSelection.start + loopSelection.length >= activeResultant.segments.length}
                >
                  +
                </button>
              </label>
            </>
          )}
        </div>

        {loopSelection && loopDurations && (
          <div className="schillinger__readout">
            Loop {loopDurations.join(" ")} ({loopTotalUnits} units) · reads as{" "}
            {loopTimeSignatureOptions.length > 0
              ? loopTimeSignatureOptions.map((o) => o.label).join(", ")
              : "no clean signature"}
            {loopMatches && (
              <>
                {" · "}
                {loopMatches.length > 0
                  ? `also occurs in ${loopMatches.length} other resultant${loopMatches.length === 1 ? "" : "s"} ` +
                    `(possible pivot/modulation): ` +
                    loopMatches
                      .slice(0, 12)
                      .map((m) => `${m.case.label} ${m.technique}`)
                      .join(", ") +
                    (loopMatches.length > 12 ? `, +${loopMatches.length - 12} more` : "")
                  : "no other resultant contains this exact pattern"}
              </>
            )}
          </div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>
          Grouping (
          {technique === "plain"
            ? "Ch. 3"
            : technique === "fractioned"
              ? "Ch. 4: fractioned resultant"
              : "Ch. 5: pairs, through a only"}
          )
        </h3>
        <div className="schillinger__readout">
          {technique === "plain" &&
            groupings.map((grouping) => (
              <div key={grouping.label}>
                {grouping.label}: {grouping.bars} bar{grouping.bars === 1 ? "" : "s"} of{" "}
                {timeSignatureFor(grouping.unitsPerBar)}
              </div>
            ))}
          {technique === "fractioned" &&
            fractionedGroupings.map((grouping) => (
              <div key={grouping.label}>
                {grouping.label}: {grouping.bars} bar{grouping.bars === 1 ? "" : "s"} of{" "}
                {timeSignatureFor(grouping.unitsPerBar)}
                {grouping.remainderUnits > 0 &&
                  ` + ${grouping.remainderUnits}/${grouping.unitsPerBar} unit remainder ` +
                    `(resultant repeats ${grouping.repeatsToClose}× to close evenly)`}
              </div>
            ))}
          {(technique === "expansion" || technique === "contraction" || technique === "balance") && (
            <div>
              {pairGrouping.label}: {pairGrouping.bars} bars of {timeSignatureFor(pairGrouping.unitsPerBar)}
            </div>
          )}
        </div>
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Percussion mapping</h3>
        <p className="schillinger__hint">
          Assign any of the resultant's own structural components to a drum voice — each becomes its
          own track on the General MIDI percussion channel.
        </p>
        <div className="schillinger__row">
          {PERCUSSION_SOURCES.map((source) => {
            const available = segmentsForSource(source, activeResultant, selectedCase.a, selectedCase.b) != null;
            return (
              <label key={source}>
                {PERCUSSION_SOURCE_LABELS[source]}
                <select
                  value={percussionAssignments[source] ?? ""}
                  disabled={!available}
                  onChange={(e) =>
                    setPercussionAssignments((prev) => ({
                      ...prev,
                      [source]: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">None</option>
                  {PERCUSSION_VOICE_OPTIONS.map((voice) => (
                    <option key={voice.label} value={voice.midiNote}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                {!available && " (unavailable for this technique)"}
              </label>
            );
          })}
        </div>
      </section>

      {children}

      <InstrumentalInterferencePanel resultant={activeResultant} />

      <TimeStructureCoordinationPanel resultant={activeResultant} />

      <PermutationsPanel />

      <HigherOrderPermutationsPanel />

      <HomogeneousContinuityPanel resultant={activeResultant} />

      <DistributivePowersPanel />

      <RhythmStyleEvolutionPanel />

      <VariableVelocityPanel />

      <section className="schillinger__section">
        <h3>Pitch scale (Theory of Pitch Scales)</h3>
        <div className="schillinger__row">
          <label>
            Scale
            <select value={scaleIndex} onChange={(e) => setScaleIndex(Number(e.target.value))}>
              {SCALE_PRESETS.map((preset, index) => (
                <option key={preset.name} value={index}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Register
            <select value={rootMidiNote} onChange={(e) => setRootMidiNote(Number(e.target.value))}>
              {REGISTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="schillinger__readout">
          Intervals {scale.intervals.join(" ")} · degrees {scale.degrees.join(" ")}
        </div>
      </section>

      <section className="schillinger__section">
        <h3>Melody &amp; harmony</h3>
        <div className="schillinger__row">
          <label>
            Contour
            <select value={contour} onChange={(e) => setContour(e.target.value as Contour)}>
              {CONTOUR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {contour === "arch" && (
            <label>
              Span
              <input
                type="number"
                min={1}
                max={4}
                value={span}
                onChange={(e) => setSpan(Math.max(1, Number(e.target.value)))}
              />
            </label>
          )}
          <label>
            Harmony (strata)
            <select value={harmonyIndex} onChange={(e) => setHarmonyIndex(Number(e.target.value))}>
              {HARMONY_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <PitchScaleEvolutionPanel />

      <MelodicModulationPanel />

      <ScalesInExpansionPanel />

      <SymmetricScalesPanel />

      <GeometricalInversionsPanel />

      <MelodicAxesPanel />

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (melody / percussion)</h3>
        <div className="schillinger__row">
          <label>
            Tempo
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            bpm
          </label>
          <label>
            Unit note value
            <select value={ticksPerUnit} onChange={(e) => setTicksPerUnit(Number(e.target.value))}>
              {UNIT_NOTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="schillinger__actions">
          <button type="button" onClick={togglePlayback} disabled={playbackNotes.length === 0 && !isPlaying}>
            {isPlaying ? "Stop" : "Play"}
          </button>
          <button type="button" onClick={downloadMidi} disabled={notes.length === 0}>
            Download MIDI
          </button>
        </div>
      </section>
    </div>
  );
}
