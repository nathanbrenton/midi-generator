import { useEffect, useMemo, useRef, useState } from "react";
import { HYBRID_CONTINUITY_RATIO, buildHybridSegmentJoin } from "../core/hybridHarmonicContinuity";
import {
  MAJOR_BASIS_OPERATIONS,
  MINOR_BASIS_OPERATIONS,
  chromaticGroupRoots,
  type ChromaticOperation,
  type TriadChordFunction,
} from "../core/chromaticSystem";
import { S5_STRUCTURES, symmetricTriad, type StructureId } from "../core/symmetricHarmony";
import { symmetricTonics } from "../core/symmetricScales";
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

export default function HybridHarmonicContinuityPanel() {
  const [root, setRoot] = useState(60);
  const [basis, setBasis] = useState<"major" | "minor">("major");
  const [operationIndex, setOperationIndex] = useState(0);
  const [tripleIndex, setTripleIndex] = useState(0);
  const [chord2Structure, setChord2Structure] = useState<StructureId>(1);
  const [chord3Structure, setChord3Structure] = useState<StructureId>(1);
  const [symmetricStructure, setSymmetricStructure] = useState<StructureId>(1);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const startStructure: StructureId = basis === "major" ? 1 : 2;
  const operations = basis === "major" ? MAJOR_BASIS_OPERATIONS : MINOR_BASIS_OPERATIONS;
  const operation = operations[operationIndex];
  const triple = TRIPLES[tripleIndex];

  const chromaticRoots = useMemo(
    () => chromaticGroupRoots({ root, structure: startStructure }, operation, triple, chord2Structure, chord3Structure),
    [root, startStructure, operation, triple, chord2Structure, chord3Structure],
  );
  const chromaticStructures: StructureId[] = [startStructure, chord2Structure, chord3Structure];

  const join = useMemo(() => buildHybridSegmentJoin(chromaticRoots[1], chromaticRoots[2]), [chromaticRoots]);
  const symmetricRoots = useMemo(() => symmetricTonics(3, join.joinRoot), [join.joinRoot]);

  const chords = [
    ...chromaticRoots.map((r, i) => ({ root: r, structure: chromaticStructures[i] })),
    ...symmetricRoots.map((r) => ({ root: r, structure: symmetricStructure })),
  ];

  const notes: NoteEvent[] = useMemo(() => {
    return chords.flatMap((c, i) =>
      symmetricTriad(c.structure, c.root).map((midiNote, voice) => ({ midiNote, startUnits: i, durationUnits: 0.9, velocity: 90, voice })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chromaticRoots, symmetricRoots, symmetricStructure]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = chords.length * secondsPerUnit;

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
    link.download = "schillinger-hybrid-harmonic-continuity.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Hybrid Harmonic Continuities (Book V, Ch. 17)</h3>
      <p className="schillinger__hint">
        Mixes chromatic (Ch. 13) and symmetric (Ch. 3) progressions — "the most desirable of the simple
        ratios... is di + 2ch + sy," refined to Hy = di{HYBRID_CONTINUITY_RATIO.diatonic}H + ch
        {HYBRID_CONTINUITY_RATIO.chromatic}H + sy{HYBRID_CONTINUITY_RATIO.symmetric}H (p.552). This demo
        shows one chromatic-to-symmetric join: "maintaining an identical intervallic root-relation
        between the last two chords of the chromatic group and the first chord of the following
        symmetric group" — the book's own worked example, E→F→F#, is reproduced exactly by{" "}
        <code>smoothJoinRoot</code>.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Basis
          <select value={basis} onChange={(e) => { setBasis(e.target.value as "major" | "minor"); setOperationIndex(0); }}>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
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
          Symmetric structure
          <select value={symmetricStructure} onChange={(e) => setSymmetricStructure(Number(e.target.value) as StructureId)}>
            {([1, 2, 3, 4] as StructureId[]).map((s) => (
              <option key={s} value={s}>
                {S5_STRUCTURES[s].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        Chromatic: {chromaticRoots.map((r, i) => chordLabel(r, chromaticStructures[i])).join(" → ")}
        <br />
        Join interval {join.interval >= 0 ? "+" : ""}
        {join.interval} semitones → symmetric starts at {noteName(join.joinRoot)}
        <br />
        Symmetric: {symmetricRoots.map((r) => chordLabel(r, symmetricStructure)).join(" → ")}
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
