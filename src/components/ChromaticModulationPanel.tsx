import { useMemo, useState } from "react";
import {
  allCommonNameChords,
  majorTonic,
  pitchClass,
  scalewiseModulation,
  spell,
  triadOnLetter,
  KEY_SIGNATURE_SCALE,
  type Letter,
  type SpelledNote,
} from "../core/chromaticModulation";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import "./SchillingerGenerator.css";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const LETTER_PITCH: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Spelled triad -> MIDI pitches, stacked upward from the first note in octave 4. */
function toPitches(notes: readonly SpelledNote[]): number[] {
  let below = -Infinity;
  return notes.map((note) => {
    let pitch = 60 + LETTER_PITCH[note.letter] + note.accidental;
    while (pitch <= below) pitch += 12;
    below = pitch;
    return pitch;
  });
}

/** The Roman numeral of a triad on `degree`, in the case of its quality. */
function roman(degree: number, notes: readonly SpelledNote[]): string {
  const [r, t, f] = notes.map(pitchClass);
  const third = (t - r + 12) % 12;
  const fifth = (f - r + 12) % 12;
  const numeral = ROMAN[degree - 1];
  if (third === 4 && fifth === 7) return numeral;
  if (third === 3 && fifth === 7) return numeral.toLowerCase();
  if (third === 3 && fifth === 6) return `${numeral.toLowerCase()}°`;
  return `${numeral}+`;
}

const chordText = (notes: readonly SpelledNote[]) => notes.map(spell).join("-");

export default function ChromaticModulationPanel() {
  const [fromSignature, setFromSignature] = useState(0);
  const [toSignature, setToSignature] = useState(-3);
  const [letterIndex, setLetterIndex] = useState(0);

  const rows = useMemo(() => allCommonNameChords(fromSignature, toSignature), [fromSignature, toSignature]);
  const row = rows[letterIndex];
  const plan = useMemo(
    () => (fromSignature === toSignature ? [spell(majorTonic(fromSignature))] : scalewiseModulation(fromSignature, toSignature)),
    [fromSignature, toSignature],
  );

  // The preceding tonic, the common chord in the preceding key, respelled in the following key, the following tonic.
  const chords = useMemo(() => {
    const fromTonic = triadOnLetter(majorTonic(fromSignature).letter, fromSignature);
    const toTonic = triadOnLetter(majorTonic(toSignature).letter, toSignature);
    return [fromTonic, row.from, row.to, toTonic].map(toPitches);
  }, [fromSignature, toSignature, row]);
  const notes = useMemo(() => chordsToNotes(chords, 2), [chords]);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Modulations in the Chromatic System (Book V, Ch. 14)</h3>
      <p className="schillinger__hint">
        The chapter works with musical names, not pitches. A common chord is the chord on one letter
        in both keys, respelled with the following key's accidentals: "all names which are not the
        same in pitch in both the preceding and the following signatures must be altered," and when
        none are, "modulation becomes diatonic... a special case of chromatic modulation" (p.520). So
        any two keys have "seven modulations," one per letter, each corresponding to a fixed degree
        of the following key. Keys here are natural majors by signature. Play: the preceding tonic,
        the common chord as the preceding key spells it, as the following key respells it, and the
        following tonic.
      </p>
      <div className="schillinger__row">
        <label>
          Preceding key
          <select value={fromSignature} onChange={(e) => setFromSignature(Number(e.target.value))}>
            {KEY_SIGNATURE_SCALE.map((k) => (
              <option key={k.signature} value={k.signature}>
                {k.major} major ({k.signature === 0 ? "no accidentals" : `${Math.abs(k.signature)}${k.signature > 0 ? "♯" : "♭"}`})
              </option>
            ))}
          </select>
        </label>
        <label>
          Following key
          <select value={toSignature} onChange={(e) => setToSignature(Number(e.target.value))}>
            {KEY_SIGNATURE_SCALE.map((k) => (
              <option key={k.signature} value={k.signature}>
                {k.major} major ({k.signature === 0 ? "no accidentals" : `${Math.abs(k.signature)}${k.signature > 0 ? "♯" : "♭"}`})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {rows.map((r, i) => (
          <div key={r.letter}>
            <label>
              <input type="radio" name="common-chord" checked={i === letterIndex} onChange={() => setLetterIndex(i)} />{" "}
              {r.letter}: {chordText(r.from)} ({roman(r.degrees[0], r.from)}) → {chordText(r.to)} ({roman(r.degrees[1], r.to)})
              {r.diatonic ? " — diatonic" : ` — alter ${r.altered.join(", ")}`}
            </label>
          </div>
        ))}
      </div>
      <NotePlayback notes={notes} lengthUnits={chords.length * 2} fileName="schillinger-chromatic-modulation.mid" />

      <h4>The scale of key signatures (Section A, Figures 247-248)</h4>
      <p className="schillinger__hint">
        Key signatures run from seven flats through "zero accidentals... the axis of symmetry" to
        seven sharps. The academic plan for a remote modulation is "scalewise motion through the
        scale of key signatures," majors and minors alternating — "and such a form never produces
        anything of interest"; any other trajectory (Book IV's resistances and axes) does better.
      </p>
      <div className="schillinger__readout">Scalewise plan: {plan.join(" + ")}</div>
    </section>
  );
}
