import { useEffect, useMemo, useRef, useState } from "react";
import { allTonalExpansions } from "../core/scalesInExpansion";
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

export default function ScalesInExpansionPanel() {
  const [intervalsText, setIntervalsText] = useState("2,2,3,2");
  const [tonic, setTonic] = useState(60);

  const [selectedLabel, setSelectedLabel] = useState("E0 (original)");
  const [selectedNotes, setSelectedNotes] = useState<number[]>(intervalsToMidiNotes(60, [2, 2, 3, 2]));

  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const intervals = useMemo(() => parseIntervals(intervalsText), [intervalsText]);
  const scale = useMemo(() => (intervals.length >= 1 ? intervalsToMidiNotes(tonic, intervals) : []), [
    intervals,
    tonic,
  ]);
  const expansions = useMemo(() => (scale.length >= 2 ? allTonalExpansions(scale) : []), [scale]);

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
    link.download = "schillinger-scales-in-expansion.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Pitch-Scales, the Second Group: Scales in Expansion (Book II, Ch. 5)</h3>
      <p className="schillinger__hint">
        The first expansion (E1) of an N-unit scale walks its units in a circle, stepping by 2
        positions each time; higher expansions E_k step by k+1. When that step doesn't divide the
        scale evenly, the walk splits into several passes — each one starting from the smallest
        unvisited unit once the current pass returns to an already-visited one (p.132-133). There
        are always N-1 expansions total, including the unchanged original (E0). Sections B-D
        (translating melodies between expansions, modulation via common tones or identical motifs)
        are workflow guidance built on this same primitive, not additional formulas, so aren't
        implemented here. Click "Preview" to hear a row and load it into the shared playback below.
      </p>
      <div className="schillinger__row">
        <label>
          Scale intervals (comma-separated)
          <input type="text" value={intervalsText} onChange={(e) => setIntervalsText(e.target.value)} />
        </label>
        <label>
          Tonic (MIDI note)
          <input type="number" min={0} max={120} value={tonic} onChange={(e) => setTonic(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__readout">
        {expansions.length > 0 ? (
          expansions.map((row, k) => (
            <div key={k}>
              E{k}: {row.map(noteName).join("-")}
              <button type="button" onClick={() => preview(`E${k}`, row)}>
                Preview
              </button>
            </div>
          ))
        ) : (
          <>Enter a scale with at least 2 intervals.</>
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
