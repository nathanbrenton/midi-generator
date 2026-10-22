import { useEffect, useMemo, useRef, useState } from "react";
import {
  DOUBLED_FUNCTIONS,
  VARIABLE_DOUBLING_FORMS,
  INVERSION_DOUBLING_FORMS,
  doublingPositions,
  buildDoublingVoicing,
  doublingTransformations,
  type DoubledFunction,
  type DoublingForm,
  type FunctionMove,
} from "../core/variableDoublings";
import { cycleDegreeStep, nearestPitch, stackedTriad } from "../core/diatonicHarmony";
import { intervalCellScale } from "../core/scales";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import { S5_STRUCTURES, type StructureId } from "../core/symmetricHarmony";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const ALL_FORMS: readonly DoublingForm[] = [
  ...DOUBLED_FUNCTIONS.map((fn) => VARIABLE_DOUBLING_FORMS[fn]),
  ...DOUBLED_FUNCTIONS.map((fn) => INVERSION_DOUBLING_FORMS[fn]),
];

/**
 * Plays one transformation map in C major: the first form on c, voiced
 * close from the bass with its functions in the map's order (lowest
 * last-listed), then each voice -- bass included -- moving to the nearest
 * pitch of its new function on the cycle's next root.
 */
function realizeMap(from: DoublingForm, to: DoublingForm, map: readonly FunctionMove[], cycle: 3 | 5 | 7): number[][] {
  const pitchOf = (degree: number) => {
    const [r, t, f] = stackedTriad(MAJOR_SCALE, 60, degree);
    return { 1: r, 3: t, 5: f } as Record<1 | 3 | 5, number>;
  };
  const first = pitchOf(0);
  const next = pitchOf(cycleDegreeStep(cycle));
  const bass = first[from.bassFunction] - 12;
  let below = bass;
  const upper = [...map].reverse().map(([fn]) => {
    let note = first[fn as 1 | 3 | 5];
    while (note <= below) note += 12;
    while (note - 12 > below) note -= 12;
    below = note;
    return note;
  });
  const movedUpper = [...map].reverse().map(([, fn], k) => nearestPitch(upper[k], next[fn as 1 | 3 | 5]));
  return [
    [bass, ...upper],
    [nearestPitch(bass, next[to.bassFunction]), ...movedUpper],
  ];
}

/** Bass first, then the upper voices from low to high, for reading. */
function lowToHigh(chord: readonly number[]): string {
  return [chord[0], ...chord.slice(1).sort((x, y) => x - y)].map(noteName).join("-");
}

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function VariableDoublingsPanel() {
  const [root, setRoot] = useState(60);
  const [structureId, setStructureId] = useState<StructureId>(1);
  const [inversion, setInversion] = useState<"root" | "first">("root");
  const [doubledFunction, setDoubledFunction] = useState<DoubledFunction>(3);
  const [positionIndex, setPositionIndex] = useState(0);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const structure = S5_STRUCTURES[structureId];
  const intervals = { third: structure.intervals[0], fifth: structure.intervals[0] + structure.intervals[1] };

  const forms = inversion === "root" ? VARIABLE_DOUBLING_FORMS : INVERSION_DOUBLING_FORMS;
  const form = forms[doubledFunction];

  const positions = useMemo(() => doublingPositions(form), [form]);

  // Ch.6 Figures 58-62, Ch.7 Figures 68-69: transformations between doubling forms.
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(1);
  const [tableCycle, setTableCycle] = useState<3 | 5 | 7>(3);
  const maps = useMemo(() => doublingTransformations(ALL_FORMS[fromIndex], ALL_FORMS[toIndex]), [fromIndex, toIndex]);
  const mapChords = useMemo(
    () => maps.flatMap((map) => realizeMap(ALL_FORMS[fromIndex], ALL_FORMS[toIndex], map, tableCycle)),
    [maps, fromIndex, toIndex, tableCycle],
  );
  const mapNotes = useMemo(() => chordsToNotes(mapChords), [mapChords]);
  useEffect(() => setPositionIndex(0), [inversion, doubledFunction]);
  const activePosition = positions[Math.min(positionIndex, positions.length - 1)];

  const voicing = useMemo(
    () => buildDoublingVoicing(form, activePosition, root, intervals),
    [form, activePosition, root, intervals.third, intervals.fifth],
  );

  const notes: NoteEvent[] = useMemo(() => {
    const chordNotes = [voicing.bass, ...voicing.upper];
    return chordNotes.map((midiNote, voice) => ({
      midiNote,
      startUnits: 0,
      durationUnits: 3,
      velocity: 90,
      voice,
    }));
  }, [voicing]);

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
    link.download = "schillinger-variable-doubling.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Variable Doublings &amp; Inversions of S(5) (Book V, Ch. 6-7)</h3>
      <p className="schillinger__hint">
        With the root held in the bass (S(5)), one function is additionally doubled among the
        upper three voices: ① keeps all three functions distinct up top (1,3,5); ③ doubles the
        third instead, so the root drops out of the upper voices (3,3,5); ⑤ doubles the fifth
        (3,5,5) — the book's own comparative table (p.401). "Only three positions are possible"
        for ③ and ⑤ — exactly <code>generalPermutations</code> (Ch. 9) on a multiset with a
        repeated pair (3!/2!=3); ① gets the full six, since its three functions are distinct.
        Ch. 7's S(6) is the first inversion — the third stays in the bass instead — and reuses
        the exact same doubling notation, but since the bass now removes a "3" from the full
        chord instead of a "1", the position-count pairing flips: S(6)① and S(6)⑤ get only 3
        positions, S(6)③ gets 6 (confirmed by rendering p.406-407, including the book's own
        "S(6)① is identical with S(5)① positions, except the bass has constant 3"). The specific
        register each position stacks into is this app's own choice, not a reproduction of
        either chapter's figure (the scans didn't resolve that level of detail cleanly) — only
        the doubling forms and position counts are book-verified.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Structure
          <select value={structureId} onChange={(e) => setStructureId(Number(e.target.value) as StructureId)}>
            {Object.entries(S5_STRUCTURES).map(([id, s]) => (
              <option key={id} value={id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inversion
          <select value={inversion} onChange={(e) => setInversion(e.target.value as "root" | "first")}>
            <option value="root">Root position — S(5) (Ch. 6)</option>
            <option value="first">First inversion — S(6) (Ch. 7)</option>
          </select>
        </label>
        <label>
          Doubled function
          <select value={doubledFunction} onChange={(e) => setDoubledFunction(Number(e.target.value) as DoubledFunction)}>
            {DOUBLED_FUNCTIONS.map((fn) => (
              <option key={fn} value={fn}>
                {forms[fn].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Position
          <select value={positionIndex} onChange={(e) => setPositionIndex(Number(e.target.value))}>
            {positions.map((p, i) => (
              <option key={i} value={i}>
                {i + 1}: {p.join("-")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {positions.length} position{positions.length === 1 ? "" : "s"} for {form.label} · bass{" "}
        {noteName(voicing.bass)} · upper {voicing.upper.map(noteName).join("-")}
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

      <h4>Transformations between forms (Ch. 6, Figures 58-62; Ch. 7, Figures 68-69)</h4>
      <p className="schillinger__hint">
        Each of the book's tables lists how the upper voices of one form take the functions of the
        next — "5↔5, 3↔3, 1↔3" — the same maps serving C3, C5 and C7. All seven tables follow one
        rule: voices that share a function (an upper voice doubling the bass included) must take
        different functions in the next chord, so no octaves move into octaves. That is why "there
        always are three transformations when S(5)① participates and only one when it does not."
        Play hears each map on c, then on the cycle's next root, in C major.
      </p>
      <div className="schillinger__row">
        <label>
          From
          <select value={fromIndex} onChange={(e) => setFromIndex(Number(e.target.value))}>
            {ALL_FORMS.map((f, i) => (
              <option key={f.label} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={toIndex} onChange={(e) => setToIndex(Number(e.target.value))}>
            {ALL_FORMS.map((f, i) => (
              <option key={f.label} value={i}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cycle
          <select value={tableCycle} onChange={(e) => setTableCycle(Number(e.target.value) as 3 | 5 | 7)}>
            <option value={3}>C3</option>
            <option value={5}>C5</option>
            <option value={7}>C7</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {ALL_FORMS[fromIndex].label} ↔ {ALL_FORMS[toIndex].label}: {maps.length} transformation{maps.length === 1 ? "" : "s"}
        {maps.map((map, i) => (
          <span key={i}>
            <br />
            ({i + 1}) {map.map(([f, t]) => `${f}↔${t}`).join(", ")} — {lowToHigh(mapChords[2 * i])} →{" "}
            {lowToHigh(mapChords[2 * i + 1])}
          </span>
        ))}
      </div>
      <NotePlayback notes={mapNotes} lengthUnits={mapChords.length} fileName="schillinger-doubling-transformations.mid" />
    </section>
  );
}
