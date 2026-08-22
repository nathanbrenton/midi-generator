import { useEffect, useMemo, useRef, useState } from "react";
import {
  S5_STRUCTURES,
  symmetricStructureProgression,
  symmetricHarmonyScale,
  type StructureId,
} from "../core/symmetricHarmony";
import { TONIC_COUNTS, symmetricTonics } from "../core/symmetricScales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function chordLabel(triad: readonly number[]): string {
  return triad.map(noteName).join("-");
}

function parseStructures(text: string): StructureId[] {
  return text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((n): n is StructureId => n === 1 || n === 2 || n === 3 || n === 4);
}

export default function SymmetricHarmonyPanel() {
  const [root, setRoot] = useState(60);
  const [structuresText, setStructuresText] = useState("1,2,3,4");
  const [mode, setMode] = useState<"chords" | "scale">("chords");
  const [tonicCount, setTonicCount] = useState(2);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const structures = useMemo(() => parseStructures(structuresText), [structuresText]);
  const chordProgression = useMemo(() => symmetricStructureProgression(structures, root), [structures, root]);

  const tonics = useMemo(() => symmetricTonics(tonicCount, root), [tonicCount, root]);
  const octaveBase = root - (((root % 12) + 12) % 12);
  const scaleStructure = structures[0] ?? 1;
  const scale = useMemo(() => symmetricHarmonyScale(tonics, scaleStructure), [tonics, scaleStructure]);
  const scaleAsNotes = useMemo(() => scale.map((pc) => [octaveBase + pc]), [scale, octaveBase]);

  const progression: number[][] = mode === "scale" ? scaleAsNotes : chordProgression;

  const notes: NoteEvent[] = useMemo(() => {
    return progression.flatMap((chord, i) =>
      chord.map((midiNote, voice) => ({
        midiNote,
        startUnits: i,
        durationUnits: 0.9,
        velocity: 90,
        voice,
      })),
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
    link.download = "schillinger-symmetric-harmony.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Symmetric System of Harmony (Book V, Ch. 3)</h3>
      <p className="schillinger__hint">
        Unlike diatonic harmony, symmetric chord structures are pre-selected independent of any
        scale, built directly from semitone intervals — "scale is the result... the consequence of
        chords in motion" (p.388). Restricting a triad's two intervals to 3 or 4 semitones each gives
        exactly four structures: S1=4+3 (major), S2=3+4 (minor), S3=4+4 (augmented), S4=3+3
        (diminished). All sharing one common root produces a "symmetric zero cycle" (C0, p.391). The
        book's own combinatorics table (badly garbled by OCR, but every one of its 8 counts confirmed
        by hand) is just <code>generalPermutations</code> applied to these 4 structure-labels — e.g.
        all 4 different gives 4!=24 forms, matching exactly. "The general number of three-unit scales
        from one axis" (55) is exactly Book II Ch. 7's <code>compositionCount(12,3)</code>. Ch. 5's own
        tonic-count table reuses Book II Ch. 7's tonic systems directly; the "scale" mode below shows
        the sorted union of pitch classes across every tonic's own triad — confirmed against the
        book's own worked examples: S1 on 2 tonics gives c-db-e-f#-g-a#(bb); S2 gives c-db-eb-f#-g-a.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as "chords" | "scale")}>
            <option value="chords">Chord progression (common root)</option>
            <option value="scale">Symmetric scale (Ch. 5, multi-tonic)</option>
          </select>
        </label>
      </div>
      {mode === "chords" ? (
        <div className="schillinger__row">
          <label>
            Structures (1=major, 2=minor, 3=augmented, 4=diminished)
            <input type="text" value={structuresText} onChange={(e) => setStructuresText(e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="schillinger__row">
          <label>
            Tonics
            <select value={tonicCount} onChange={(e) => setTonicCount(Number(e.target.value))}>
              {TONIC_COUNTS.map((t) => (
                <option key={t} value={t}>
                  {t} tonics
                </option>
              ))}
            </select>
          </label>
          <label>
            Structure (1=major, 2=minor, 3=augmented, 4=diminished)
            <input type="text" value={structuresText} onChange={(e) => setStructuresText(e.target.value)} />
          </label>
        </div>
      )}
      <div className="schillinger__readout">
        {mode === "chords" ? (
          chordProgression.length > 0 ? (
            <>
              {chordProgression.length} chords, common root {noteName(root)}:{" "}
              {chordProgression
                .map((triad, i) => `${S5_STRUCTURES[structures[i]].name}(${chordLabel(triad)})`)
                .join(" · ")}
            </>
          ) : (
            "Enter structure numbers 1-4 above."
          )
        ) : (
          <>
            {tonicCount}-tonic system, {S5_STRUCTURES[scaleStructure].name} structure: tonics{" "}
            {tonics.map(noteName).join(", ")} → scale {scaleAsNotes.map((n) => noteName(n[0])).join("-")}
          </>
        )}
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
