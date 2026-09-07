import { useEffect, useMemo, useRef, useState } from "react";
import {
  stackedEleventhChord,
  eleventhPositions,
  buildEleventhVoicing,
  resolveEleventhToNinth,
  type EleventhUpperFunction,
} from "../core/eleventhChords";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const FUNCTION_LABELS: Record<EleventhUpperFunction, string> = { seventh: "7", ninth: "9", eleventh: "11" };

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function EleventhChordPanel() {
  const [root, setRoot] = useState(60);
  const positions = useMemo(() => eleventhPositions(), []);
  const [positionIndex, setPositionIndex] = useState(0);
  const [resolveToNinth, setResolveToNinth] = useState(false);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const rootPosition = useMemo(() => stackedEleventhChord(MAJOR_SCALE, root, 0), [root]);
  const position = positions[positionIndex];
  const voicing = useMemo(() => buildEleventhVoicing(position, MAJOR_SCALE, root, 0), [position, root]);
  const resolved = useMemo(() => resolveEleventhToNinth(MAJOR_SCALE, root, 0), [root]);

  const progression: { bass: number; upper: number[] }[] = useMemo(
    () => (resolveToNinth ? [voicing, resolved] : [voicing]),
    [resolveToNinth, voicing, resolved],
  );

  const notes: NoteEvent[] = useMemo(() => {
    return progression.flatMap((chord, i) => {
      const allNotes = [chord.bass, ...chord.upper];
      return allNotes.map((midiNote, voice) => ({ midiNote, startUnits: i, durationUnits: 0.9, velocity: 90, voice }));
    });
  }, [progression]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = progression.length * secondsPerUnit;

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
    link.download = "schillinger-eleventh-chord.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Eleventh Chord (Book V, Ch. 11, Section A)</h3>
      <p className="schillinger__hint">
        S(11) is a hybrid four-part chord like S(9), but the three upper voices are seventh, ninth
        and eleventh — third and fifth are both omitted (p.469). Unlike S(9)'s upper voices, 7-9-11
        are themselves contiguous stacked thirds, "a triad corresponding to a root, a third and a
        fifth" — so it browses the same 6 positions (Figure 176). The resolution chain is stated
        precisely: "An S(11) allows a continuous chain of resolutions: S(11)→S(9)→S(7)→S(6)③." Only
        the first, fully-confirmed link is built here — resolving the eleventh alone (C0) lands
        exactly on Ch. 9/10's own S(9) chord ("S(9) has its proper structural constitution, i.e.
        1,3,7,9") — the rest of the chain depends on Ch. 10's own S(9) resolution, left unbuilt there.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Position
          <select value={positionIndex} onChange={(e) => setPositionIndex(Number(e.target.value))}>
            {positions.map((p, i) => (
              <option key={i} value={i}>
                {i + 1}: {p.map((fn) => FUNCTION_LABELS[fn]).join("-")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={resolveToNinth} onChange={(e) => setResolveToNinth(e.target.checked)} />
          Resolve the eleventh (C0) → S(9)
        </label>
      </div>
      <div className="schillinger__readout">
        Root position: {[rootPosition.bass, ...rootPosition.upper].map(noteName).join("-")} · This position:{" "}
        {[voicing.bass, ...voicing.upper].map(noteName).join("-")}
        {resolveToNinth && <> · Resolved: {[resolved.bass, ...resolved.upper].map(noteName).join("-")}</>}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
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
  );
}
