import { useEffect, useMemo, useRef, useState } from "react";
import {
  availableSeventhQualities,
  symmetricPassingSeventhProgression,
  passingSeventhContinuity,
  chromaticUnitsPerChord,
  type PassingSeventhQuality,
} from "../core/passingSeventh";
import { intervalCellScale } from "../core/scales";
import NotePlayback from "./NotePlayback";
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
  // Section B: the chromatic scale in the bass under one major triad per symmetric tonic (Figures 273-276).
  const [chromaticTonics, setChromaticTonics] = useState<1 | 2 | 3 | 4 | 6 | 12>(3);
  const chromaticNotes = useMemo<NoteEvent[]>(() => {
    const per = chromaticUnitsPerChord(chromaticTonics);
    const bass = Array.from({ length: 13 }, (_, k) => ({ midiNote: 48 + k, startUnits: k, durationUnits: 0.9, velocity: 88, voice: 3 }));
    const chords = Array.from({ length: chromaticTonics + 1 }, (_, i) => {
      const tonic = 60 + i * per;
      const length = i === chromaticTonics ? 1 : per;
      return [0, 4, 7].map((o, voice) => ({ midiNote: tonic + o, startUnits: i * per, durationUnits: length - 0.1, velocity: 72, voice }));
    }).flat();
    return [...bass, ...chords];
  }, [chromaticTonics]);
  const [tonicCount, setTonicCount] = useState<3 | 4>(3);
  const [structure, setStructure] = useState<StructureId>(1);
  const [quality, setQuality] = useState<PassingSeventhQuality>("major");

  // Figures 254-255: the passing-seventh continuity.
  const [continuityDirection, setContinuityDirection] = useState<"descending" | "ascending">("descending");
  const continuity = useMemo(
    () => passingSeventhContinuity(intervalCellScale([2, 2, 1, 2, 2, 2, 1]), root, continuityDirection),
    [root, continuityDirection],
  );
  // Triads in half notes over a bass in quarter notes, as the figure has them.
  const continuityNotes: NoteEvent[] = useMemo(
    () => [
      ...continuity.chords.flatMap((v, j) =>
        [v.root, v.third, v.fifth].map((midiNote, k) => ({ midiNote, startUnits: 2 * j, durationUnits: 1.9, velocity: 80, voice: k + 1 })),
      ),
      ...continuity.bass.map((midiNote, k) => ({ midiNote, startUnits: k, durationUnits: 0.9, velocity: 95, voice: 0 })),
    ],
    [continuity],
  );

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
      // Stop the loop as well as the sound: a pending pass would otherwise keep rescheduling on a closed context.
      playTokenRef.current += 1;
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
      <h3>The Passing Seventh Generalized (Book V, Ch. 15)</h3>
      <h4>The continuity of the passing seventh (Figures 254-255, p.531)</h4>
      <p className="schillinger__hint">
        "The preparation of the seventh in C0 requires a descending step from the root-tone. In C3
        the seventh while resolving, becomes a new root-tone. This fact permits us to develop a
        continuity of the passing seventh when C3 is constant." Each root steps down to its own
        seventh, which steps down to the next root: C Am F Dm B° G Em C over a bass walking down two
        octaves. "By reading the above figure backwards, we obtain an ascending scale in the bass. The
        cycle in such a case becomes negative (C-3) and the transformation is counterclockwise."
      </p>
      <div className="schillinger__row">
        <label>
          Reading
          <select value={continuityDirection} onChange={(e) => setContinuityDirection(e.target.value as "descending" | "ascending")}>
            <option value="descending">Figure 254 — C3, bass descending</option>
            <option value="ascending">Figure 255 — read backwards, C-3, bass ascending</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        Chords: {continuity.rootDegrees.map((d) => "CDEFGAB"[d]).join(" ")} · Bass:{" "}
        {continuity.bass.map((n) => NOTE_NAMES[((n % 12) + 12) % 12]).join(" ")}
      </div>
      <NotePlayback notes={continuityNotes} lengthUnits={continuity.bass.length + 1} fileName="schillinger-passing-seventh-continuity.mid" />

      <h4>Section A: the passing seventh in Type III progressions (p.534-536)</h4>
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

      <h4>Section B: symmetric harmonization of the chromatic scale (Figure 276)</h4>
      <p className="schillinger__hint">
        "In the system of twelve tonics, each pitch-unit of the chromatic scale must be harmonized by
        one chord" — and in general one chord covers 12 ÷ tonics units:{" "}
        {([1, 2, 3, 4, 6, 12] as const).map((n) => `${n} tonic${n === 1 ? "" : "s"} → ${chromaticUnitsPerChord(n)}`).join(", ")}.
      </p>
      <div className="schillinger__row">
        <label>
          Tonics
          <select value={chromaticTonics} onChange={(e) => setChromaticTonics(Number(e.target.value) as typeof chromaticTonics)}>
            {([1, 2, 3, 4, 6, 12] as const).map((n) => (
              <option key={n} value={n}>
                {n} ({chromaticUnitsPerChord(n)} units per chord)
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        Bass c3 … c4 chromatically; above it major triads on{" "}
        {Array.from({ length: chromaticTonics }, (_, i) => NOTE_NAMES[(i * chromaticUnitsPerChord(chromaticTonics)) % 12]).join(", ")}, then c
      </div>
      <NotePlayback notes={chromaticNotes} lengthUnits={13} fileName="schillinger-chromatic-harmonization.mid" defaultBpm={120} />
    </section>
  );
}
