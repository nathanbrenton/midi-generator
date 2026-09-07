import { useEffect, useMemo, useRef, useState } from "react";
import { availableSeventhQualities, symmetricPassingSeventhProgression, type PassingSeventhQuality } from "../core/passingSeventh";
import { S5_STRUCTURES, type StructureId } from "../core/symmetricHarmony";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function PassingSeventhPanel() {
  const [root, setRoot] = useState(60);
  const [tonicCount, setTonicCount] = useState<3 | 4>(3);
  const [structure, setStructure] = useState<StructureId>(1);
  const [quality, setQuality] = useState<PassingSeventhQuality>("major");

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const qualities = useMemo(() => availableSeventhQualities(tonicCount), [tonicCount]);
  const effectiveQuality = qualities.includes(quality) ? quality : qualities[0];

  const progression = useMemo(
    () => symmetricPassingSeventhProgression(tonicCount, structure, effectiveQuality, root),
    [tonicCount, structure, effectiveQuality, root],
  );

  const notes: NoteEvent[] = useMemo(() => {
    return progression.flatMap((chord, i) =>
      [...chord.triad, chord.seventh].map((midiNote, voice) => ({ midiNote, startUnits: i, durationUnits: 0.9, velocity: 90, voice })),
    );
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
    link.download = "schillinger-passing-seventh.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Passing Seventh Generalized (Book V, Ch. 15, Section A)</h3>
      <p className="schillinger__hint">
        A symmetric triad (Ch. 3) at every tonic of a 3- or 4-tonic system (Book II Ch. 7), each with a
        passing seventh above it. "In a system of three tonics the interval between the roots equals 4
        semitones... giving a choice of three forms of the seventh: the major, the minor and the
        diminished" — 3 tonics offers all three; 4 tonics (root interval 3 semitones) offers only major
        and minor (p.534-535). The book's own worked root-sequences — C-E-Ab for 3 tonics, C-Eb-F#-A for
        4 — are reproduced exactly below.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Tonics
          <select value={tonicCount} onChange={(e) => setTonicCount(Number(e.target.value) as 3 | 4)}>
            <option value={3}>3 tonics</option>
            <option value={4}>4 tonics</option>
          </select>
        </label>
        <label>
          Structure
          <select value={structure} onChange={(e) => setStructure(Number(e.target.value) as StructureId)}>
            {([1, 2, 3, 4] as StructureId[]).map((s) => (
              <option key={s} value={s}>
                {S5_STRUCTURES[s].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seventh
          <select value={effectiveQuality} onChange={(e) => setQuality(e.target.value as PassingSeventhQuality)}>
            {qualities.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {progression.length} chords:{" "}
        {progression.map((c, i) => `${[...c.triad, c.seventh].map(noteName).join("-")}`).join(" · ")}
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
