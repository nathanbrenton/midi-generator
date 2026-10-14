import { useEffect, useRef, useState } from "react";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

/** Chords as simultaneous notes, one chord per `unitsPerChord` units, each voice on its own track. */
export function chordsToNotes(chords: readonly (readonly number[])[], unitsPerChord = 1): NoteEvent[] {
  return chords.flatMap((chord, i) =>
    chord.map((midiNote, voice) => ({
      midiNote,
      startUnits: i * unitsPerChord,
      durationUnits: unitsPerChord * 0.9,
      velocity: 90,
      voice,
    })),
  );
}

export interface NotePlaybackProps {
  /** Must be memoized by the caller: a new array restarts playback. */
  notes: readonly NoteEvent[];
  /** Length of one loop, in units (one unit = one beat at the chosen tempo). */
  lengthUnits: number;
  fileName: string;
  defaultBpm?: number;
}

/**
 * Tempo, Play/Stop and Download MIDI for a fixed set of notes, looped --
 * the playback block every Book V panel repeats, as one component for the
 * sections added after the Book V audit.
 */
export default function NotePlayback({ notes, lengthUnits, fileName, defaultBpm = 100 }: NotePlaybackProps) {
  const [bpm, setBpm] = useState(defaultBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = lengthUnits * secondsPerUnit;

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
      gain.gain.setValueAtTime(0.1, noteStart);
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

  function togglePlayback() {
    if (isPlaying) {
      playTokenRef.current += 1;
      setIsPlaying(false);
      audioContextRef.current?.close();
      audioContextRef.current = null;
      return;
    }
    if (notes.length === 0) return;
    audioContextRef.current = new AudioContext();
    setIsPlaying(true);
    scheduleLoopPass(++playTokenRef.current);
  }

  useEffect(() => () => void audioContextRef.current?.close(), []);

  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    audioContextRef.current.close();
    audioContextRef.current = new AudioContext();
    scheduleLoopPass(++playTokenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, secondsPerUnit, cycleSeconds]);

  function downloadMidi() {
    if (notes.length === 0) return;
    const bytes = buildMidiFile([...notes], { bpm, ticksPerUnit: 480 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const url = URL.createObjectURL(new Blob([buffer], { type: "audio/midi" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="schillinger__row">
      <label>
        Tempo
        <input type="number" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        bpm
      </label>
      <div className="schillinger__actions">
        <button type="button" onClick={togglePlayback} disabled={notes.length === 0 && !isPlaying}>
          {isPlaying ? "Stop" : "Play"}
        </button>
        <button type="button" onClick={downloadMidi} disabled={notes.length === 0}>
          Download MIDI
        </button>
      </div>
    </div>
  );
}
