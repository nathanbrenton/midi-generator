import { useEffect, useMemo, useRef, useState } from "react";
import {
  stackedEleventhChord,
  eleventhPositions,
  buildEleventhVoicing,
  resolveEleventhToNinth,
  eleventhResolutionChain,
  ELEVENTH_RESOLUTIONS,
  prepareEleventh,
  ELEVENTH_FAMILIES,
  eleventhFormName,
  symmetricEleventhChord,
  type EleventhUpperFunction,
} from "../core/eleventhChords";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
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

  // The C0 chain S(11) -> S(9) -> S(7) -> S(6)③ (p.469).
  const chain = useMemo(() => eleventhResolutionChain(MAJOR_SCALE, root - 12, 0), [root]);
  const chainChords = useMemo(() => chain.map((c) => [c.bass, ...c.upper]), [chain]);
  const chainNotes = useMemo(() => chordsToNotes(chainChords, 2), [chainChords]);

  // Section B, preparation (p.470-471).
  const [preparation, setPreparation] = useState<"C0" | "C7">("C7");
  const prepared = useMemo(() => prepareEleventh(MAJOR_SCALE, root - 12, 0, preparation), [root, preparation]);
  const preparationChords = useMemo(
    () => [
      [prepared.from.bass, ...prepared.from.upper],
      [prepared.to.bass, ...prepared.to.upper],
    ],
    [prepared],
  );
  const preparationNotes = useMemo(() => chordsToNotes(preparationChords, 2), [preparationChords]);

  // Section C, the two families (Figures 182-183).
  const [familyIndex, setFamilyIndex] = useState(0);
  const family = ELEVENTH_FAMILIES[familyIndex];
  const familyChord = useMemo(() => {
    const c = symmetricEleventhChord(family.family, family.structure, root - 12);
    return [c.bass, ...c.upper];
  }, [family, root]);
  const familyNotes = useMemo(() => chordsToNotes([familyChord], 4), [familyChord]);

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
      <h3>The Eleventh Chord (Book V, Ch. 11)</h3>
      <p className="schillinger__hint">
        S(11) is a hybrid four-part chord like S(9), but the three upper voices are seventh, ninth
        and eleventh — third and fifth are both omitted (p.469). Unlike S(9)'s upper voices, 7-9-11
        are themselves contiguous stacked thirds, "a triad corresponding to a root, a third and a
        fifth" — so it browses the same 6 positions (Figure 176). The resolution chain is stated
        precisely: "An S(11) allows a continuous chain of resolutions: S(11)→S(9)→S(7)→S(6)③" —
        resolving the eleventh alone (C0) lands exactly on Ch. 10's own S(9) ("S(9) has its proper
        structural constitution, i.e. 1,3,7,9"); the whole chain is below.
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

      <h4>The chain of resolutions (p.469-470, Figure 177)</h4>
      <p className="schillinger__hint">
        "The C0 resolutions must follow in the direction of the decreasing functions: if only one is
        resolved, 11 must be resolved first; then, 9; then, 7." Each step lowers one function by a
        degree: S(11), S(9), S(7) without its fifth, and S(6)③ — the last an A minor over its third
        when the root is c. Figure 177 also resolves all three at once:{" "}
        {ELEVENTH_RESOLUTIONS.filter((r) => r.resolves.length === 3)
          .map((r) => `${r.cycle} to ${r.result}${r.alternative ? ` (or ${r.alternative})` : ""}`)
          .join("; ")}
        ; "the C7 resolution does not appear... [it] is 1, 5, 7, 9, and this does not sound
        satisfactory."
      </p>
      <div className="schillinger__readout">
        {chain.map((c) => `${c.label} ${[c.bass, ...c.upper].map(noteName).join("-")}`).join(" → ")}
      </div>
      <NotePlayback notes={chainNotes} lengthUnits={chainChords.length * 2} fileName="schillinger-eleventh-chain.mid" />

      <h4>Preparation (Section B, p.470-471)</h4>
      <p className="schillinger__hint">
        "S(11) has an appearance of an S(5) with a bass corresponding to the pitch-unit one degree
        higher than the root of the triad... take S(5)①, move its bass one step up and this will
        produce an S(11)" — C7. "To prepare S(11) after an S(5) in C0, move all upper functions down
        scalewise and leave the bass stationary."
      </p>
      <div className="schillinger__row">
        <label>
          Cycle
          <select value={preparation} onChange={(e) => setPreparation(e.target.value as "C0" | "C7")}>
            <option value="C7">C7 — the bass a step up</option>
            <option value="C0">C0 — the upper voices a step down</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        S(5) {preparationChords[0].map(noteName).join("-")} → S(11) {preparationChords[1].map(noteName).join("-")}
      </div>
      <NotePlayback notes={preparationNotes} lengthUnits={4} fileName="schillinger-eleventh-preparation.mid" />

      <h4>Two families of S(11) (Section C, Figures 182-183)</h4>
      <p className="schillinger__hint">
        "The structural constitution of S(11) permits the classification of such structures as S(5)
        with regard to their upper functions": the upper 7-9-11 is a triad on the minor or major
        seventh. "There are two less common forms. The diminished in the first group and the
        augmented in the second group."
      </p>
      <div className="schillinger__row">
        <label>
          Form
          <select value={familyIndex} onChange={(e) => setFamilyIndex(Number(e.target.value))}>
            {ELEVENTH_FAMILIES.map((f, i) => (
              <option key={i} value={i}>
                7{f.family === "minor seventh" ? "♭" : "♮"}S{f.structure} — {eleventhFormName(f)}
                {f.common ? "" : " (less common)"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">{familyChord.map(noteName).join("-")}</div>
      <NotePlayback notes={familyNotes} lengthUnits={4} fileName="schillinger-eleventh-family.mid" />
    </section>
  );
}
