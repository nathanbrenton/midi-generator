import { useEffect, useMemo, useRef, useState } from "react";
import {
  stackedNinthChord,
  ninthPositions,
  buildNinthVoicing,
  NINTH_PREPARATION_TABLE,
  NINTH_RESOLUTIONS,
  NINTH_FAMILIES,
  consecutiveSevenths,
  type NinthUpperFunction,
} from "../core/ninthChords";
import { cycleDegreeStep, nearestPitch } from "../core/diatonicHarmony";
import { midiNoteForDegree } from "../core/scales";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const FUNCTION_LABELS: Record<NinthUpperFunction, string> = { third: "3", seventh: "7", ninth: "9" };

const familyLabel = (f: (typeof NINTH_FAMILIES)[number]) => `7${f.family === "minor seventh" ? "♭" : "♮"}S${f.index}`;

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function NinthChordPanel() {
  const [root, setRoot] = useState(60);
  const positions = useMemo(() => ninthPositions(), []);
  const [positionIndex, setPositionIndex] = useState(0);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const rootPosition = useMemo(() => stackedNinthChord(MAJOR_SCALE, root, 0), [root]);
  const position = positions[positionIndex];
  const voicing = useMemo(() => buildNinthVoicing(position, MAJOR_SCALE, root, 0), [position, root]);
  const chord: number[] = useMemo(() => [voicing.bass, ...voicing.upper], [voicing]);

  const notes: NoteEvent[] = useMemo(
    () => chord.map((midiNote, voice) => ({ midiNote, startUnits: 0, durationUnits: 3.6, velocity: 90, voice })),
    [chord],
  );

  // Section A, resolutions (Figure 157).
  const [resolutionIndex, setResolutionIndex] = useState(2); // C5, "the most commonly known"
  const [alternativeBass, setAlternativeBass] = useState(false);
  const resolution = NINTH_RESOLUTIONS[resolutionIndex];
  const resolutionChords = useMemo(() => {
    const nextRoot = resolution.cycle === "C0" ? 0 : cycleDegreeStep(Number(resolution.cycle.slice(1)) as 3 | 5 | 7);
    const pitchOf = (fn: number) => midiNoteForDegree(MAJOR_SCALE, root, nextRoot + fn - 1);
    const bassFn = alternativeBass && resolution.alternative ? resolution.alternative.bass : resolution.bass;
    const upper = voicing.upper.map((pitch, k) => nearestPitch(pitch, pitchOf(resolution.moves[position[k]])));
    return [chord, [nearestPitch(voicing.bass, pitchOf(bassFn)), ...upper]];
  }, [resolution, alternativeBass, voicing, position, chord, root]);
  const resolutionNotes = useMemo(() => chordsToNotes(resolutionChords, 2), [resolutionChords]);

  // Section B, the two families in C0.
  const [familyA, setFamilyA] = useState(0);
  const [familyB, setFamilyB] = useState(3);
  const familyChord = (f: (typeof NINTH_FAMILIES)[number]) => [root - 12, root + f.third, root + f.seventh, root + f.ninth];
  const familyChords = useMemo(() => [familyChord(NINTH_FAMILIES[familyA]), familyChord(NINTH_FAMILIES[familyB])], [familyA, familyB, root]);
  const familyNotes = useMemo(() => chordsToNotes(familyChords, 2), [familyChords]);
  const sevenths = consecutiveSevenths(NINTH_FAMILIES[familyA], NINTH_FAMILIES[familyB]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = 4 * secondsPerUnit;

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
    link.download = "schillinger-ninth-chord.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Ninth Chord (Book V, Ch. 10)</h3>
      <p className="schillinger__hint">
        S(9) is a hybrid four-part chord: root alone in the bass (no doubling), plus third, seventh
        and ninth above it — the fifth is omitted entirely (p.460). "As the bass remains constant,
        the three upper voices are subject to six permutations resulting in corresponding
        distributions" (Figure 156) — browse all 6 with Position below. Resolving an S(9) does not
        cycle into another S(9): "S(9) alternates with S(7) and S(5)" (resolutions below). The
        preparation table is the same rule as S(7)'s: the tone that becomes the seventh fixes the
        next root six degrees below it.
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
      </div>
      <div className="schillinger__readout">
        Root position: {[rootPosition.bass, ...rootPosition.upper].map(noteName).join("-")} · This position: {chord.map(noteName).join("-")}
      </div>

      <h4>Table of preparations (p.461, reference)</h4>
      <div className="schillinger__readout">
        {NINTH_PREPARATION_TABLE.map((e, i) => (
          <div key={i}>
            {e.method}: {e.fromSeventh}→7, {e.fromNinth}→9 &nbsp;⇒&nbsp; {e.cycle}
          </div>
        ))}
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

      <h4>Resolutions (Figure 157, p.460-461)</h4>
      <p className="schillinger__hint">
        "The 7 and the 9 are subject to resolution through stepwise downward motion. If one function
        resolves at a time, it is always the higher one (the ninth)... [this] produces C0. Other
        cycles derive from the simultaneous resolutions of two functions," and "the resolutions
        (except in C0) produce positive cycles only." From the position above: C0 resolves the ninth
        alone; C3 and C5 resolve both (C3 keeping the bass, which becomes the third of the new root —
        the figure's ③); C7 moves the third up as well, "two pairs of voices moving in thirds in
        contrary motion." The figure's "or:" moves the bass to g instead: a complete S(4/3) in C0,
        an S(2) in C3.
      </p>
      <div className="schillinger__row">
        <label>
          Cycle
          <select value={resolutionIndex} onChange={(e) => setResolutionIndex(Number(e.target.value))}>
            {NINTH_RESOLUTIONS.map((r, i) => (
              <option key={r.cycle} value={i}>
                {r.cycle} → {r.result}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={alternativeBass}
            disabled={!resolution.alternative}
            onChange={(e) => setAlternativeBass(e.target.checked)}
          />
          The figure's "or:" bass{resolution.alternative ? ` (${resolution.alternative.result})` : ""}
        </label>
      </div>
      <div className="schillinger__readout">
        {resolutionChords.map((c) => c.map(noteName).join("-")).join(" → ")}
      </div>
      <NotePlayback notes={resolutionNotes} lengthUnits={4} fileName="schillinger-ninth-resolution.mid" />

      <h4>Two families of S(9) (Section B, Figures 162-163, p.464-465)</h4>
      <p className="schillinger__hint">
        "Two distinctly different families of S(9), not to be mixed except when in C0": the minor
        seventh family 7♭S1-4 (large, diminished, minor, small) and the major seventh family 7♮S1-3
        (major, augmented I, augmented II), each named by its third and ninth. "All combinations of
        the two families, except those producing consecutive sevenths (7♭S4↔7♮S1; 7♮S2↔7♮S3;
        7♭S3↔7♮S2; 7♭S1↔7♭S4), are satisfactory when in C0." Pick two forms to hear them on one root.
      </p>
      <div className="schillinger__row">
        {[
          [familyA, setFamilyA],
          [familyB, setFamilyB],
        ].map(([value, set], k) => (
          <label key={k}>
            {k === 0 ? "First" : "Second"}
            <select value={value as number} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))}>
              {NINTH_FAMILIES.map((f, i) => (
                <option key={i} value={i}>
                  {familyLabel(f)} — {f.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="schillinger__readout">
        {familyChords.map((c) => c.map(noteName).join("-")).join(" → ")} —{" "}
        {sevenths ? "consecutive sevenths: the book rules this pair out" : "satisfactory in C0"}
      </div>
      <NotePlayback notes={familyNotes} lengthUnits={4} fileName="schillinger-ninth-families.mid" />
    </section>
  );
}
