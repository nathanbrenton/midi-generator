import { useEffect, useMemo, useRef, useState } from "react";
import { findPrimaryAxis, modalRotationsAtTonic } from "../core/melodicModulation";
import { intervalsToMidiNotes } from "../core/pitchScaleEvolution";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function parseIntervals(text: string): number[] {
  return text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value));
}

function parseMelody(text: string): { midiNote: number; durationUnits: number }[] {
  return text
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [notePart, durationPart] = token.split(":");
      return { midiNote: Number(notePart), durationUnits: Number(durationPart) };
    })
    .filter(
      (n) => Number.isFinite(n.midiNote) && Number.isFinite(n.durationUnits) && n.durationUnits > 0,
    );
}

export default function MelodicModulationPanel() {
  const [melodyText, setMelodyText] = useState("60:2,62:1,60:5,64:3");
  const [intervalsText, setIntervalsText] = useState("2,2,3,2");
  const [tonic, setTonic] = useState(60);

  const [selectedLabel, setSelectedLabel] = useState("Original scale");
  const [selectedNotes, setSelectedNotes] = useState<number[]>(intervalsToMidiNotes(60, [2, 2, 3, 2]));

  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const melody = useMemo(() => parseMelody(melodyText), [melodyText]);
  const primaryAxis = useMemo(() => findPrimaryAxis(melody), [melody]);

  const intervals = useMemo(() => parseIntervals(intervalsText), [intervalsText]);
  const wrapInterval = 12 - intervals.reduce((sum, v) => sum + v, 0);
  const wrappingIntervals = useMemo(
    () => (intervals.length >= 2 && wrapInterval > 0 ? [...intervals, wrapInterval] : []),
    [intervals, wrapInterval],
  );
  const rotations = useMemo(
    () => (wrappingIntervals.length >= 2 ? modalRotationsAtTonic(wrappingIntervals, tonic) : []),
    [wrappingIntervals, tonic],
  );

  const originalScale = useMemo(
    () => (intervals.length >= 1 ? intervalsToMidiNotes(tonic, intervals) : []),
    [intervals, tonic],
  );
  const commonUnitTargets = useMemo(() => originalScale.slice(1), [originalScale]);

  function preview(label: string, values: readonly number[]) {
    setSelectedLabel(label);
    setSelectedNotes([...values]);
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
    link.download = "schillinger-melodic-modulation.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Melodic Modulation and Variable Pitch Axes (Book II, Ch. 4)</h3>
      <p className="schillinger__hint">
        Sections C, E, and F are compositional guidance rather than formulas, so aren't implemented
        here. Click "Preview" on any row to hear it and load it into the shared playback below.
      </p>

      <h4>A. Primary Axis</h4>
      <p className="schillinger__hint">
        The P.A. of a melody is the pitch-unit with the greatest total summed duration, not
        necessarily the most frequently attacked one (p.125).
      </p>
      <div className="schillinger__row">
        <label>
          Melody (midiNote:durationUnits, comma-separated)
          <input type="text" value={melodyText} onChange={(e) => setMelodyText(e.target.value)} />
        </label>
      </div>
      <div className="schillinger__readout">
        {primaryAxis ? (
          <>
            Primary Axis: {noteName(primaryAxis.midiNote)} (MIDI {primaryAxis.midiNote}) — total duration{" "}
            {primaryAxis.totalDuration}
          </>
        ) : (
          "Enter a melody to find its Primary Axis."
        )}
      </div>

      <h4>B. Unitonal-Polymodal modulation (displacement scales at a common tonic)</h4>
      <p className="schillinger__hint">
        Every rotation of the scale's interval sequence, all transposed to the same tonic instead of
        each starting on its own naturally-rotated root (p.127).
      </p>
      <div className="schillinger__row">
        <label>
          Original scale intervals (comma-separated, non-wrapping)
          <input type="text" value={intervalsText} onChange={(e) => setIntervalsText(e.target.value)} />
        </label>
        <label>
          Tonic (MIDI note)
          <input type="number" min={0} max={120} value={tonic} onChange={(e) => setTonic(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__readout">
        {wrappingIntervals.length >= 2 ? (
          rotations.map((row, i) => {
            const shown = row.slice(0, -1);
            return (
              <div key={row.join(",")}>
                d{i}: {shown.map(noteName).join("-")}
                <button type="button" onClick={() => preview(`d${i}`, shown)}>
                  Preview
                </button>
              </div>
            );
          })
        ) : (
          <>Interval sequence must sum to less than 12 to leave room for the octave wrap.</>
        )}
      </div>

      <h4>D. Modulating through Common Units</h4>
      <p className="schillinger__hint">
        The best modulations are to keys whose root is identical with one of the pitch-units of the
        original scale (p.129) — the same interval sequence, retransposed to each of the scale's own
        other degrees.
      </p>
      <div className="schillinger__readout">
        {commonUnitTargets.length > 0 ? (
          commonUnitTargets.map((root) => {
            const transposed = intervalsToMidiNotes(root, intervals);
            return (
              <div key={root}>
                Key of {noteName(root)}: {transposed.map(noteName).join("-")}
                <button type="button" onClick={() => preview(`Key of ${noteName(root)}`, transposed)}>
                  Preview
                </button>
              </div>
            );
          })
        ) : (
          <>Enter an interval sequence above.</>
        )}
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
        Selected: {selectedLabel} → {selectedNotes.map(noteName).join("-")}
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
