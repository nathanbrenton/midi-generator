import { useEffect, useMemo, useRef, useState } from "react";
import {
  intervalInterferenceResultant,
  slidingWindowMerge,
  slidingWindowSelect,
  intervalsToMidiNotes,
} from "../core/pitchScaleEvolution";
import { generalPermutations, circularPermutations } from "../core/permutations";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const ROOT = 60;

function parseIntervals(text: string): number[] {
  return text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value));
}

function spell(intervals: readonly number[]): string {
  return intervalsToMidiNotes(ROOT, intervals).join(", ");
}

export default function PitchScaleEvolutionPanel() {
  const [total, setTotal] = useState(5);
  const [splitA, setSplitA] = useState(3);
  const splitB = Math.max(1, total - splitA);

  const [displacementText, setDisplacementText] = useState("2,2,3,2,3");
  const [summationText, setSummationText] = useState("2,2,1,2,2,1");
  const [summationWindow, setSummationWindow] = useState(2);
  const [selectionWindow, setSelectionWindow] = useState(5);

  const [selectedLabel, setSelectedLabel] = useState("Resultant 2,1,2");
  const [selectedIntervals, setSelectedIntervals] = useState<number[]>([2, 1, 2]);

  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const resultant = useMemo(() => intervalInterferenceResultant(splitA, splitB), [splitA, splitB]);
  const family = useMemo(() => generalPermutations(resultant), [resultant]);

  const displacementIntervals = useMemo(() => parseIntervals(displacementText), [displacementText]);
  const displacementScales = useMemo(
    () => (displacementIntervals.length >= 2 ? circularPermutations(displacementIntervals) : []),
    [displacementIntervals],
  );

  const summationIntervals = useMemo(() => parseIntervals(summationText), [summationText]);
  const clampedSummationWindow = Math.min(summationWindow, Math.max(1, summationIntervals.length));
  const clampedSelectionWindow = Math.min(selectionWindow, Math.max(1, summationIntervals.length));
  const mergedScales = useMemo(
    () => (summationIntervals.length >= 2 ? slidingWindowMerge(summationIntervals, clampedSummationWindow) : []),
    [summationIntervals, clampedSummationWindow],
  );
  const selectedScales = useMemo(
    () => (summationIntervals.length >= 2 ? slidingWindowSelect(summationIntervals, clampedSelectionWindow) : []),
    [summationIntervals, clampedSelectionWindow],
  );

  function preview(label: string, intervals: readonly number[]) {
    setSelectedLabel(label);
    setSelectedIntervals([...intervals]);
  }

  const notes: NoteEvent[] = useMemo(() => {
    const midiNotes = intervalsToMidiNotes(ROOT, selectedIntervals);
    return midiNotes.map((midiNote, i) => ({
      midiNote,
      startUnits: i,
      durationUnits: 0.9,
      velocity: 95,
      voice: 0,
    }));
  }, [selectedIntervals]);

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
    link.download = "schillinger-pitch-scale-evolution.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Evolution of Pitch-Scale Styles (Book II, Ch. 3)</h3>
      <p className="schillinger__hint">
        Pitch-scales evolve the same way rhythms do — the sections below reuse Book I's own
        interference and permutation machinery, just applied to pitch intervals. Click "Preview" on
        any row to hear it (a plain ascending run from MIDI note {ROOT}) and load it into the shared
        playback below. Section E (historical commentary) has no formula, so isn't implemented.
      </p>

      <h4>A. Relating scales through interval identity</h4>
      <div className="schillinger__row">
        <label>
          Interval
          <input type="number" min={2} max={12} value={total} onChange={(e) => setTotal(Number(e.target.value))} />
        </label>
        <label>
          Split as
          <input
            type="number"
            min={1}
            max={total - 1}
            value={splitA}
            onChange={(e) => setSplitA(Math.min(total - 1, Math.max(1, Number(e.target.value))))}
          />
          + {splitB}
        </label>
      </div>
      <div className="schillinger__readout">
        {splitA}+{splitB} synchronized with {splitB}+{splitA} → resultant {resultant.join("+")} ({spell(resultant)})
        <button type="button" onClick={() => preview(`Resultant ${resultant.join(",")}`, resultant)}>
          Preview
        </button>
      </div>
      <div className="schillinger__readout">
        Family (all permutations of {resultant.join("+")}):{" "}
        {family.map((row, i) => (
          <span key={row.join(",")}>
            {i > 0 && " · "}
            {row.join("+")}
            <button type="button" onClick={() => preview(`Family ${row.join(",")}`, row)}>
              Preview
            </button>
          </span>
        ))}
      </div>

      <h4>B. Relating scales through pitch-unit identity (displacement scales)</h4>
      <div className="schillinger__row">
        <label>
          Interval sequence (comma-separated, wraps to the octave)
          <input type="text" value={displacementText} onChange={(e) => setDisplacementText(e.target.value)} />
        </label>
      </div>
      <div className="schillinger__readout">
        {displacementScales.map((row, i) => (
          <div key={row.join(",")}>
            d{i}: {row.join("+")} ({spell(row)})
            <button type="button" onClick={() => preview(`d${i} ${row.join(",")}`, row)}>
              Preview
            </button>
          </div>
        ))}
      </div>

      <h4>C. Evolving scales through summation</h4>
      <h4>D. Evolving scales through selection of intervals</h4>
      <div className="schillinger__row">
        <label>
          Interval sequence (comma-separated)
          <input type="text" value={summationText} onChange={(e) => setSummationText(e.target.value)} />
        </label>
        <label>
          Merge window (C)
          <input
            type="number"
            min={1}
            max={summationIntervals.length}
            value={clampedSummationWindow}
            onChange={(e) => setSummationWindow(Number(e.target.value))}
          />
        </label>
        <label>
          Select window (D)
          <input
            type="number"
            min={1}
            max={summationIntervals.length}
            value={clampedSelectionWindow}
            onChange={(e) => setSelectionWindow(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="schillinger__readout">
        Summation (window {clampedSummationWindow}):{" "}
        {mergedScales.map((row, i) => (
          <span key={`${row.join(",")}-${i}`}>
            {i > 0 && " · "}
            {row.join("+")}
            <button type="button" onClick={() => preview(`Summation ${row.join(",")}`, row)}>
              Preview
            </button>
          </span>
        ))}
      </div>
      <div className="schillinger__readout">
        Selection (window {clampedSelectionWindow}):{" "}
        {selectedScales.map((row, i) => (
          <span key={`${row.join(",")}-${i}`}>
            {i > 0 && " · "}
            {row.join("+")}
            <button type="button" onClick={() => preview(`Selection ${row.join(",")}`, row)}>
              Preview
            </button>
          </span>
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
        Selected: {selectedLabel} → {spell(selectedIntervals)}
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
