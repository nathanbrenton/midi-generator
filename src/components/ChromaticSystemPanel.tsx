import { useEffect, useMemo, useRef, useState } from "react";
import {
  chromaticGroupRoots,
  enharmonicGroupRoots,
  chromaticGroupFormCount,
  basisOperations,
  PARALLEL_DOUBLE_CHROMATICS,
  chromaticPitchPath,
  parallelChromatics,
  coincidingChromaticGroup,
  type ChromaticOperation,
  type TriadChordFunction,
} from "../core/chromaticSystem";
import { S5_STRUCTURES, symmetricTriad, symmetricSeventhChord, type StructureId } from "../core/symmetricHarmony";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const OPERATION_LABEL = (op: ChromaticOperation) => `${op.function} ${op.direction === "raise" ? "↑" : "↓"}`;
const TRIPLES: readonly [TriadChordFunction, TriadChordFunction, TriadChordFunction][] = [
  [1, 3, 5],
  [1, 5, 3],
  [3, 1, 5],
  [3, 5, 1],
  [5, 1, 3],
  [5, 3, 1],
];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function chordLabel(root: number, structure: StructureId): string {
  return symmetricTriad(structure, root).map(noteName).join("-");
}

export default function ChromaticSystemPanel() {
  const [root, setRoot] = useState(60);
  const [basis, setBasis] = useState<StructureId>(1);
  const [operationIndex, setOperationIndex] = useState(0);
  const [tripleIndex, setTripleIndex] = useState(0);
  const [chord2Structure, setChord2Structure] = useState<StructureId>(1);
  const [chord3Structure, setChord3Structure] = useState<StructureId>(1);
  // Section E: the altered tone respelled (x# = yb), turning back to x as a function of the third chord.
  const [enharmonic, setEnharmonic] = useState(false);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const startStructure: StructureId = basis;
  const operations = basisOperations(basis);
  const operation = operations[Math.min(operationIndex, operations.length - 1)];
  const triple = TRIPLES[tripleIndex];

  const roots = useMemo(
    () => (enharmonic ? enharmonicGroupRoots : chromaticGroupRoots)({ root, structure: startStructure }, operation, triple, chord2Structure, chord3Structure),
    [root, startStructure, operation, triple, chord2Structure, chord3Structure, enharmonic],
  );
  const structures: StructureId[] = [startStructure, chord2Structure, chord3Structure];

  const notes: NoteEvent[] = useMemo(() => {
    return roots.flatMap((chordRoot, i) =>
      symmetricTriad(structures[i], chordRoot).map((midiNote, voice) => ({
        midiNote,
        startUnits: i,
        durationUnits: 0.9,
        velocity: 90,
        voice,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, startStructure, chord2Structure, chord3Structure]);

  // Sections C-D: parallel double, triple and quadruple chromatics.
  const [parallelForm, setParallelForm] = useState(0);
  const PARALLEL_FORMS = [
    { label: "S1 basis: 1♭ with 3♭ (c-c♭-b♭, e-e♭)", basis: 1 as const, index: 0 },
    { label: "S1 basis: 5♭ with 3♭", basis: 1 as const, index: 1 },
    { label: "S2 basis: 1♯ with 3♯ (c-c♯-d, e♭-e)", basis: 2 as const, index: 0 },
    { label: "S2 basis: 5♯ with 3♯", basis: 2 as const, index: 1 },
    { label: "Triple: S4(5), 1♯ with 3♯ and 5♯", basis: 4 as const, index: -1 },
    { label: "Quadruple: diminished S(7), 1♯ with 3♯, 5♯, 7♯", basis: 5 as const, index: -1 },
  ];
  const parallelChords = useMemo(() => {
    const form = PARALLEL_FORMS[parallelForm];
    if (form.basis === 4 || form.basis === 5) {
      const start = form.basis === 4 ? symmetricTriad(4, root) : symmetricSeventhChord(5, root);
      return [start, parallelChromatics(start), parallelChromatics(parallelChromatics(start))];
    }
    const { fundamental, complementary } = PARALLEL_DOUBLE_CHROMATICS[form.basis][form.index];
    const triad = symmetricTriad(form.basis, root);
    const index = { root: 0, third: 1, fifth: 2 } as const;
    const f = chromaticPitchPath(triad[index[fundamental.function]], fundamental.direction);
    const c = chromaticPitchPath(triad[index[complementary.function]], complementary.direction);
    // The fundamental completes its group; the complementary tone "does not necessarily" move on.
    return [0, 1, 2].map((k) =>
      triad.map((pitch, i) => (i === index[fundamental.function] ? f[k] : i === index[complementary.function] ? c[Math.min(k, 1)] : pitch)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parallelForm, root]);
  const parallelNotes = useMemo(() => chordsToNotes(parallelChords), [parallelChords]);

  // Section G: coinciding chromatic groups.
  const [coinciding, setCoinciding] = useState<"outward" | "inward">("outward");
  const coincidingChords = useMemo(() => {
    const [a, b] = coincidingChromaticGroup(root, coinciding);
    return [0, 1, 2].map((k) => [a[k], b[k]]);
  }, [root, coinciding]);
  const coincidingNotes = useMemo(() => chordsToNotes(coincidingChords), [coincidingChords]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = 3 * secondsPerUnit;

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
    link.download = "schillinger-chromatic-group.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  const formCount = useMemo(() => chromaticGroupFormCount(), []);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Chromatic System of Harmony (Book V, Ch. 13)</h3>
      <p className="schillinger__hint">
        A chromatic group is 3 chords — balance, tension, release — where one voice moves by semitone
        twice in the same direction (e.g. g→g#→a), landing a whole tone from where it started (p.495).
        The major basis alters root↑, third↓, or fifth↑; the minor basis is the exact opposite (p.498).
        That altered voice is then reinterpreted as a new chord function at each stage (Figure 211,
        p.497) — e.g. "1-3-5" means the altered pitch is chord 1's root, chord 2's third, and chord 3's
        fifth, exactly the book's own worked example (C→C#→D, root C). {formCount.total} total forms
        are possible across all starting functions and chord qualities (p.497-498) — this panel builds
        the mechanic, not every figure's specific voicing.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Basis
          <select value={basis} onChange={(e) => { setBasis(Number(e.target.value) as StructureId); setOperationIndex(0); }}>
            <option value={1}>S1 major (1♯ / 3♭ / 5♯)</option>
            <option value={2}>S2 minor (1♭ / 3♯ / 5♭)</option>
            <option value={3}>S3 augmented (1♯ / 3♭ — Section A)</option>
            <option value={4}>S4 diminished (1♭ / 3♯ — Section A)</option>
          </select>
        </label>
        <label>
          Operation
          <select value={operationIndex} onChange={(e) => setOperationIndex(Number(e.target.value))}>
            {operations.map((op, i) => (
              <option key={i} value={i}>
                {OPERATION_LABEL(op)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Function triple
          <select value={tripleIndex} onChange={(e) => setTripleIndex(Number(e.target.value))}>
            {TRIPLES.map((t, i) => (
              <option key={i} value={i}>
                {t.join("-")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chord 2
          <select value={chord2Structure} onChange={(e) => setChord2Structure(Number(e.target.value) as StructureId)}>
            {([1, 2, 3, 4] as StructureId[]).map((s) => (
              <option key={s} value={s}>
                {S5_STRUCTURES[s].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chord 3
          <select value={chord3Structure} onChange={(e) => setChord3Structure(Number(e.target.value) as StructureId)}>
            {([1, 2, 3, 4] as StructureId[]).map((s) => (
              <option key={s} value={s}>
                {S5_STRUCTURES[s].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={enharmonic} onChange={(e) => setEnharmonic(e.target.checked)} />
          Enharmonic (Section E: x → x♯ = y♭ → z)
        </label>
      </div>
      <div className="schillinger__readout">
        {chordLabel(roots[0], startStructure)} → {chordLabel(roots[1], chord2Structure)} → {chordLabel(roots[2], chord3Structure)}
        {enharmonic && " — the altered tone is respelled and turns back a semitone into the third chord (p.508)"}
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

      <h4>Parallel chromatics (Sections C-D, p.503-507)</h4>
      <p className="schillinger__hint">
        "Parallel double chromatics occur when fundamental operations are performed from an opposite
        base. In such a case the rectification of the third is required": on the major basis, 1♭ or
        5♭ with 3♭; on the minor, 1♯ or 5♯ with 3♯. "If c - c♭ - b♭ is a fundamental operation, the
        complementary chromatic is e - e♭," which "does not necessarily move" further. Raising the 1
        of the diminished triad drags 3♯ and 5♯ along (triple); of the diminished seventh, 3♯, 5♯ and
        7♯ (quadruple) — "the quintessence of chromatic style."
      </p>
      <div className="schillinger__row">
        <label>
          Operation
          <select value={parallelForm} onChange={(e) => setParallelForm(Number(e.target.value))}>
            {PARALLEL_FORMS.map((f, i) => (
              <option key={i} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">{parallelChords.map((c) => c.map(noteName).join("-")).join(" → ")}</div>
      <NotePlayback notes={parallelNotes} lengthUnits={3} fileName="schillinger-parallel-chromatics.mid" />

      <h4>Coinciding chromatic groups (Section G, p.514-516)</h4>
      <p className="schillinger__hint">
        Two voices on one function move in contrary motion, outward (x→x♯→y above, x→x♭→y below) or
        inward from the octave. "In moving outward from unison or octave, the last term of the group
        produces a major third"; inward from an octave, a minor sixth.
      </p>
      <div className="schillinger__row">
        <label>
          Direction
          <select value={coinciding} onChange={(e) => setCoinciding(e.target.value as "outward" | "inward")}>
            <option value="outward">Outward from a unison</option>
            <option value="inward">Inward from an octave</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">{coincidingChords.map((c) => c.map(noteName).join("+")).join(" → ")}</div>
      <NotePlayback notes={coincidingNotes} lengthUnits={3} fileName="schillinger-coinciding-chromatics.mid" />
    </section>
  );
}
