import { useEffect, useMemo, useRef, useState } from "react";
import {
  extendSummationSeries,
  spiralSequenceBasic,
  spiralSequenceDeveloped,
  spiralSequenceExtended,
} from "../core/organicMelody";
import { SUMMATION_SERIES } from "../core/variableVelocity";
import { intervalsToMidiNotes } from "../core/pitchScaleEvolution";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const SERIES_OPTIONS = [
  { label: "Summation series I (Fibonacci)", values: SUMMATION_SERIES[0] },
  { label: "Summation series II", values: SUMMATION_SERIES[1] },
  { label: "Summation series III", values: SUMMATION_SERIES[2] },
];

type PatternType = "basic" | "developed" | "extended";
const PATTERN_OPTIONS: { label: string; type: PatternType; span: number }[] = [
  { label: "Basic spiral (t, t+1, -t+3)", type: "basic", span: 4 },
  { label: "Developed spiral (t, t+1, t+2, -t+4)", type: "developed", span: 5 },
  { label: "Extended spiral (t, t+1, t+2, -t+5)", type: "extended", span: 6 },
];

const START_INDICES = [0, 1, 2, 3];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function buildPattern(type: PatternType, series: readonly number[], startIndex: number): number[] {
  if (type === "basic") return spiralSequenceBasic(series, startIndex);
  if (type === "developed") return spiralSequenceDeveloped(series, startIndex);
  return spiralSequenceExtended(series, startIndex);
}

export default function OrganicMelodyPanel() {
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [patternType, setPatternType] = useState<PatternType>("basic");
  const [root, setRoot] = useState(60);

  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);

  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const patternMeta = PATTERN_OPTIONS.find((p) => p.type === patternType)!;
  const series = useMemo(
    () => extendSummationSeries(SERIES_OPTIONS[seriesIndex].values, patternMeta.span + START_INDICES[START_INDICES.length - 1]),
    [seriesIndex, patternMeta.span],
  );

  const rows = useMemo(
    () =>
      START_INDICES.map((startIndex) => {
        const pattern = buildPattern(patternType, series, startIndex);
        const notes = intervalsToMidiNotes(root, pattern);
        return { startIndex, pattern, notes };
      }),
    [patternType, series, root],
  );

  function preview(label: string, notes: readonly number[]) {
    setSelectedLabel(label);
    setSelectedNotes([...notes]);
  }

  const notes: NoteEvent[] = useMemo(() => {
    return selectedNotes.map((midiNote, i) => ({
      midiNote,
      startUnits: i,
      durationUnits: 0.9,
      velocity: 95,
      voice: 0,
    }));
  }, [selectedNotes]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = notes.length * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || notes.length === 0) return;

    const cycleStart = context.currentTime;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit;
      gain.gain.setValueAtTime(0.15, noteStart);
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

  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    audioContextRef.current.close();
    audioContextRef.current = new AudioContext();
    scheduleLoopPass(++playTokenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, secondsPerUnit, cycleSeconds]);

  function downloadMidi() {
    if (notes.length === 0) return;
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit: 480 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-organic-melody.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Use of Organic Forms in Melody (Book IV, Ch. 8)</h3>
      <p className="schillinger__hint">
        A "spiral sequence" builds a melodic motif from a summation series' own terms, always ending
        with one term flipped to a descending leap (p.341-352). Basic: t, t+1, then t+3 with the
        opposite sign (t+2 omitted) — confirmed against the book's own Figure 120: starting the First
        series at 5 gives 5, 8, −21. Developed and Extended add one and two more terms before the
        final flip. "Melody may start at different points of one summation series" — the rows below
        show four starting points for the selected series and pattern.
      </p>
      <div className="schillinger__row">
        <label>
          Series
          <select value={seriesIndex} onChange={(e) => setSeriesIndex(Number(e.target.value))}>
            {SERIES_OPTIONS.map((option, i) => (
              <option key={option.label} value={i}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pattern
          <select value={patternType} onChange={(e) => setPatternType(e.target.value as PatternType)}>
            {PATTERN_OPTIONS.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={120} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__readout">
        {rows.map(({ startIndex, pattern, notes: rowNotes }) => (
          <div key={startIndex}>
            Start at index {startIndex} ({series[startIndex]}): {pattern.join(", ")} →{" "}
            {rowNotes.map(noteName).join("-")}
            <button type="button" onClick={() => preview(`index ${startIndex}`, rowNotes)}>
              Preview
            </button>
          </div>
        ))}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>
      </div>
      <div className="schillinger__readout">
        {selectedNotes.length > 0 ? (
          <>
            Selected: {selectedLabel} → {selectedNotes.map(noteName).join("-")}
          </>
        ) : (
          "Click Preview on a row above."
        )}
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
  );
}
