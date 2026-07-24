import { useEffect, useMemo, useRef, useState } from "react";
import { generateResultant, generatorPulse, BINARY_SYNCHRONIZATION_CASES } from "../core/resultant";
import { generateFractionedResultant, computeFractionedGroupings } from "../core/fractioning";
import { computeGroupings } from "../core/grouping";
import { buildExpansion, buildContraction, buildBalance, computePairGrouping } from "../core/groupsByPairs";
import { computeTimeSignatureOptions } from "../core/timeSignature";
import { SCALE_PRESETS } from "../core/scales";
import { buildMelody, applyStrata, type Contour, type NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import { parseMidiFile, type ImportedNote } from "../core/midiImport";
import {
  reduceToUnits,
  notesToRhythmPattern,
  findPatternOccurrences,
  findMatchingCases,
} from "../core/rhythmAnalysis";
import { pitchClassesFromMidiNotes, classifyScaleGroup, twoUnitScaleLabel } from "../core/pitchClassification";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const LANE_COLORS = {
  cp: { color: "#c9932f", highlight: "#e8b95c" },
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

const PULSE_VOICE_NOTE = 36; // low "click" register for the raw generator pulses

type Technique = "plain" | "fractioned" | "expansion" | "contraction" | "balance";

const TECHNIQUE_OPTIONS: { label: string; value: Technique }[] = [
  { label: "Plain (Ch. 2A)", value: "plain" },
  { label: "Fractioned (Ch. 4)", value: "fractioned" },
  { label: "Expansion (Ch. 5)", value: "expansion" },
  { label: "Contraction (Ch. 5)", value: "contraction" },
  { label: "Balance (Ch. 5)", value: "balance" },
];

export default function SchillingerGenerator() {
  const [caseIndex, setCaseIndex] = useState(0); // defaults to 3 : 2
  const [scaleIndex, setScaleIndex] = useState(0);
  const [rootMidiNote, setRootMidiNote] = useState(60);
  const [contour, setContour] = useState<Contour>("ascending");
  const [span, setSpan] = useState(2);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [harmonyIndex, setHarmonyIndex] = useState(0);
  const [includePulseVoices, setIncludePulseVoices] = useState(true);
  const [technique, setTechnique] = useState<Technique>("plain");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const [manualPatternText, setManualPatternText] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState<ImportedNote[] | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const analysisPattern = useMemo(() => {
    if (analysisNotes && analysisNotes.length > 0) return notesToRhythmPattern(analysisNotes);
    const parsed = manualPatternText
      .split(",")
      .map((token) => Number(token.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    return parsed.length > 0 ? reduceToUnits(parsed) : null;
  }, [analysisNotes, manualPatternText]);

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
    const pitchClasses = pitchClassesFromMidiNotes(analysisNotes.map((note) => note.midiNote));
    return {
      pitchClasses,
      group: classifyScaleGroup(pitchClasses),
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

  const resultant = useMemo(() => generateResultant(generators), [generators]);
  const activeResultant = useMemo(() => {
    switch (technique) {
      case "fractioned":
        return generateFractionedResultant(selectedCase.a, selectedCase.b);
      case "expansion":
        return buildExpansion(selectedCase.a, selectedCase.b);
      case "contraction":
        return buildContraction(selectedCase.a, selectedCase.b);
      case "balance":
        return buildBalance(selectedCase.a, selectedCase.b);
      default:
        return resultant;
    }
  }, [technique, resultant, selectedCase]);
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
      })),
    });
    return lanes;
  }, [activeResultant, selectedCase, technique, patternOccurrences, analysisPattern]);

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

    if (!includePulseVoices || technique !== "plain") return harmonized;

    const voiceOffset = harmonyPreset.intervals.length + 1;
    const pulseVoices: NoteEvent[] = generators.flatMap((value, index) => {
      let cursor = 0;
      return generatorPulse(value, activeResultant.cycleLength).map((segment) => {
        const note: NoteEvent = {
          midiNote: PULSE_VOICE_NOTE + index * 5,
          startUnits: cursor,
          durationUnits: segment.duration * 0.5,
          velocity: 70,
          voice: voiceOffset + index,
        };
        cursor += segment.duration;
        return note;
      });
    });

    return [...harmonized, ...pulseVoices];
  }, [
    activeResultant,
    scale,
    rootMidiNote,
    contour,
    span,
    harmonyIndex,
    includePulseVoices,
    technique,
    generators,
  ]);

  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleSeconds = activeResultant.cycleLength * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || notes.length === 0) return;

    const harmonyVoiceCount = HARMONY_PRESETS[harmonyIndex].intervals.length;
    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of notes) {
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
    if (notes.length === 0) return;
    audioContextRef.current = new AudioContext();
    setIsPlaying(true);
    scheduleLoopPass(++playTokenRef.current);
  }

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Restarts the loop from the top whenever the notes or timing change
  // while playing, so the cycle reflects the latest controls instead of the
  // stale closure captured when Play was first clicked.
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    audioContextRef.current.close();
    audioContextRef.current = new AudioContext();
    scheduleLoopPass(++playTokenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, secondsPerUnit, cycleSeconds]);

  // Drives the visual playhead in ResultantBar from the AudioContext's own
  // clock rather than a separate timer, so it can't drift out of sync with
  // what's actually sounding.
  useEffect(() => {
    if (!isPlaying) return;

    let frame: number;
    function tick() {
      const context = audioContextRef.current;
      if (context && cycleSeconds > 0) {
        const elapsed = (context.currentTime - cycleStartRef.current) % cycleSeconds;
        setPlayheadFraction(elapsed / cycleSeconds);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isPlaying, cycleSeconds]);

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
        {analysisPattern && (
          <div className="schillinger__readout">
            Pattern {analysisPattern.join(" ")} found in {matchingCases?.length ?? 0} of 19 canonical cases
            {matchingCases && matchingCases.length > 0 && `: ${matchingCases.map((m) => m.case.label).join(", ")}`}
          </div>
        )}
        {pitchAnalysis && (
          <div className="schillinger__readout">
            Pitch classes {pitchAnalysis.pitchClasses.join(", ")} ·{" "}
            {pitchAnalysis.group ? pitchAnalysis.group.label : "3+ pitch classes: group not yet determined"}
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
        <label className="schillinger__checkbox">
          <input
            type="checkbox"
            checked={includePulseVoices}
            disabled={technique !== "plain"}
            onChange={(e) => setIncludePulseVoices(e.target.checked)}
          />
          Include raw generator pulses as separate polyrhythm voices
          {technique !== "plain" && " (binary synchronization only)"}
        </label>
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback</h3>
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
          <button type="button" onClick={togglePlayback} disabled={notes.length === 0 && !isPlaying}>
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
