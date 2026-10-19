import { useMemo, useState } from "react";
import {
  LINKING_FORMS,
  symmetricSectionStarts,
  keysContaining,
  diatonicCycleConnection,
  type CycleConnection,
} from "../core/linkingHarmonicContinuities";
import { chordProgression } from "../core/diatonicHarmony";
import { intervalCellScale } from "../core/scales";
import { symmetricTriad } from "../core/symmetricHarmony";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import { spelledChord, chromaticSteps } from "../core/linkingHarmonicContinuities";
import { pitchClass, spell, type Letter, type SpelledNote } from "../core/chromaticModulation";
import "./SchillingerGenerator.css";

const STRUCTURES: Record<string, number[]> = { major: [4, 3], minor: [3, 4], "dominant seventh": [4, 3, 3] };
const LETTERS: Letter[] = ["C", "D", "E", "F", "G", "A", "B"];
/** A spelled chord as pitches stacked upward from the first octave above `base`. */
const voice = (notes: readonly SpelledNote[], base: number) => notes.map((n) => base + ((pitchClass(n) - (base % 12) + 12) % 12));

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const KEY_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const name = (n: number) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
/** A short diatonic section: I IV V I. */
const SECTION_DEGREES = [0, 3, 4, 0];
const CYCLES: readonly CycleConnection[] = [3, 5, 7, -3, -5, -7];

export default function LinkingHarmonicContinuitiesPanel() {
  // Form 2: diatonic progressions, symmetrically connected.
  const [tonicCount, setTonicCount] = useState(4); // "the ∜2 relation" of the Pilgrims' Chorus
  const [sections, setSections] = useState(3);
  const starts = useMemo(() => symmetricSectionStarts(60, tonicCount, sections), [tonicCount, sections]);
  const sectionChords = useMemo(
    () => starts.flatMap((start) => chordProgression(MAJOR, ((start - 60) % 12) + 60, SECTION_DEGREES).map((c) => [c[0] - 12, ...c])),
    [starts],
  );
  const sectionNotes = useMemo(() => chordsToNotes(sectionChords), [sectionChords]);

  // Forms 4 and 7: a diatonic connection from a chord's key.
  const [chordRoot, setChordRoot] = useState(4); // E major, as a chord ending a symmetric or chromatic progression
  const keys = useMemo(() => keysContaining(symmetricTriad(1, chordRoot)), [chordRoot]);
  const [keyIndex, setKeyIndex] = useState(0);
  const [cycle, setCycle] = useState<CycleConnection>(5);
  const key = keys[Math.min(keyIndex, keys.length - 1)];
  const connection = useMemo(() => (key === undefined ? null : diatonicCycleConnection(chordRoot, key, cycle)), [chordRoot, key, cycle]);
  const connectionChords = useMemo(
    () => (connection ? [symmetricTriad(1, 60 + chordRoot), connection.triad] : []),
    [connection, chordRoot],
  );
  const connectionNotes = useMemo(() => chordsToNotes(connectionChords, 2), [connectionChords]);

  // Form 8: a symmetric connection of chromatic progressions, with no chromatic step in any voice.
  const [form8Structure, setForm8Structure] = useState("dominant seventh");
  const [form8Root, setForm8Root] = useState<SpelledNote>({ letter: "D", accidental: 0 });
  const [form8Interval, setForm8Interval] = useState(2);
  // Every spelling of the connecting root (letter and at most one accidental) a symmetric interval away.
  const form8Options = useMemo(() => {
    const from = spelledChord(form8Root, STRUCTURES[form8Structure]);
    const target = (pitchClass(form8Root) + form8Interval) % 12;
    return LETTERS.flatMap((letter) =>
      [-1, 0, 1]
        .filter((acc) => pitchClass({ letter, accidental: acc }) === target)
        .map((accidental) => {
          const to = spelledChord({ letter, accidental }, STRUCTURES[form8Structure]);
          return { to, steps: chromaticSteps(from, to) };
        }),
    ).map((o) => ({ ...o, from }));
  }, [form8Root, form8Structure, form8Interval]);
  const form8Notes = useMemo(() => {
    const chords = form8Options.slice(0, 1).flatMap((o) => [voice(o.from, 48), voice(o.to, 48)]);
    return chordsToNotes(chords.map((c) => [...c].sort((a, b) => a - b)), 2);
  }, [form8Options]);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Linking Harmonic Continuities (Book V, Ch. 18)</h3>
      <p className="schillinger__hint">
        "Assuming that any form of harmonic progression is used either as continuity or as connection,
        we obtain the following nine forms of combined harmonic continuity" (p.554) — with the book's
        answer to whether each connection gains an extra chord:
      </p>
      <div className="schillinger__readout">
        {LINKING_FORMS.map((f) => (
          <div key={f.number}>
            ({f.number}) {f.progression} progressions, {f.connection === "diatonic" ? "diatonically" : f.connection === "symmetric" ? "symmetrically" : "chromatically"} connected —{" "}
            {f.extraChord === null ? "not stated" : f.extraChord ? "an extra chord" : "no extra chord"}
          </div>
        ))}
      </div>

      <h4>Diatonic progressions, symmetrically connected (form 2, p.554-556)</h4>
      <p className="schillinger__hint">
        "It is typical of Wagner to make symmetric connections between the portions of diatonic
        continuity. The starting point of each consecutive section is in the ∜2 relation to the
        preceding section" (Figure 297, the Pilgrims' Chorus). Each section here is I IV V I; the
        sections start one tonic-gap apart. The connection "does not produce an extra chord, but rather
        an interval."
      </p>
      <div className="schillinger__row">
        <label>
          Symmetry
          <select value={tonicCount} onChange={(e) => setTonicCount(Number(e.target.value))}>
            {[2, 3, 4, 6].map((n) => (
              <option key={n} value={n}>
                {n} tonics ({12 / n} semitones)
              </option>
            ))}
          </select>
        </label>
        <label>
          Sections
          <input type="number" min={2} max={6} value={sections} onChange={(e) => setSections(Math.max(2, Math.min(6, Number(e.target.value) || 2)))} />
        </label>
      </div>
      <div className="schillinger__readout">
        Sections in {starts.map((s) => KEY_NAMES[((s % 12) + 12) % 12]).join(" → ")}: {sectionChords.map((c) => c.slice(1).map(name).join("-")).join(" · ")}
      </div>
      <NotePlayback notes={sectionNotes} lengthUnits={sectionChords.length} fileName="schillinger-symmetric-sections.mid" />

      <h4>A diatonic connection (forms 4 and 7, p.555-557)</h4>
      <p className="schillinger__hint">
        "Assigning the last chord [of a symmetric or chromatic progression] to the key in which such a
        chord may exist. The latter is connected by a diatonic cycle with some other chord in the same
        key." A major triad lives in exactly three major keys — as I, IV and V — and the key decides
        what the cycle reaches.
      </p>
      <div className="schillinger__row">
        <label>
          Last chord
          <select value={chordRoot} onChange={(e) => { setChordRoot(Number(e.target.value)); setKeyIndex(0); }}>
            {KEY_NAMES.map((n, pc) => (
              <option key={pc} value={pc}>
                {n} major
              </option>
            ))}
          </select>
        </label>
        <label>
          In the key of
          <select value={keyIndex} onChange={(e) => setKeyIndex(Number(e.target.value))}>
            {keys.map((k, i) => (
              <option key={k} value={i}>
                {KEY_NAMES[k]} major
              </option>
            ))}
          </select>
        </label>
        <label>
          Cycle
          <select value={cycle} onChange={(e) => setCycle(Number(e.target.value) as CycleConnection)}>
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                C{c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {connection
          ? `${KEY_NAMES[chordRoot]} major in ${KEY_NAMES[key]} → by C${cycle} → ${connectionChords[1].map(name).join("-")}`
          : "—"}
      </div>
      <NotePlayback notes={connectionNotes} lengthUnits={4} fileName="schillinger-diatonic-connection.mid" />
      <h4>Chromatic progressions, symmetrically connected (form 8, p.557)</h4>
      <p className="schillinger__hint">
        "Achieved through the selection of a root which does not produce chromatic steps in any voice." A
        chromatic step keeps a tone's name (d to d♭), so the chords are read spelled: no letter may appear in
        both with different accidentals. Figure 306 joins D7 to E7 and A to B by ⁶√2 this way.
      </p>
      <div className="schillinger__row">
        <label>
          Chord
          <select value={`${form8Root.letter}${form8Root.accidental}`} onChange={(e) => setForm8Root({ letter: e.target.value[0] as Letter, accidental: Number(e.target.value.slice(1)) })}>
            {LETTERS.flatMap((l) => [-1, 0, 1].map((a) => ({ letter: l, accidental: a }))).map((n) => (
              <option key={`${n.letter}${n.accidental}`} value={`${n.letter}${n.accidental}`}>
                {spell(n)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Structure
          <select value={form8Structure} onChange={(e) => setForm8Structure(e.target.value)}>
            {Object.keys(STRUCTURES).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label>
          Symmetric step
          <select value={form8Interval} onChange={(e) => setForm8Interval(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 8, 9, 10, 11].map((k) => (
              <option key={k} value={k}>
                {k} semitones
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {form8Options.map((o) => (
          <div key={o.to.map(spell).join()}>
            {o.from.map(spell).join(" ")} → {o.to.map(spell).join(" ")}:{" "}
            {o.steps.length === 0 ? "no chromatic step — a form 8 connection" : `chromatic ${o.steps.map((st) => st.letter).join(", ")}`}
          </div>
        ))}
      </div>
      <NotePlayback notes={form8Notes} lengthUnits={4} fileName="schillinger-form8.mid" />
    </section>
  );
}
