/**
 * Book V, Chapter 14: Modulations in the Chromatic System (p.518-530).
 *
 * The chapter works with musical names (letters), not pitches: "every
 * possibility within the seven-unit scales... every chord [of a key] may
 * be a common chord" with the following key, as long as the two chords
 * share their names -- the chord on a letter is respelled with the
 * following key's accidentals, "all names which are not the same in pitch
 * in both the preceding and the following signatures must be altered."
 * "When all names of the common chord are common tones (identical
 * pitches), modulation becomes diatonic" (p.520). So a transition from C
 * to any key "may be accomplished by means of seven modulations," one per
 * letter, and the common chord "corresponds to a certain degree of the
 * following key" (Figures 239-241) -- `commonNameChord`.
 *
 * Keys here are natural major keys named by their signature: 0 is C, +1
 * G, -3 Eb, +8 G# (with f##), as far as the arithmetic goes. Letters are
 * counted in the order of fifths, F C G D A E B, which is also the order
 * sharps are added (and, backwards, flats).
 *
 * Section A, Indirect Modulation (p.524-526): "the scale of key-signatures"
 * runs from seven flats through "zero accidentals... the axis of
 * symmetry" to seven sharps (Figure 247), and the academic way of
 * reaching a remote key is "scalewise motion through the scale of key
 * signatures," majors and minors alternating -- Db major to E major as
 * Db + f + Eb + g + F + a + G + b + A + E (Figure 248) --
 * `scalewiseModulation`. The book's point is that this is dull, and that
 * any other trajectory through the signatures (Book IV's resistances and
 * axes) is better; the scale itself is the material.
 *
 * Not built: Ch.14's non-major key-scale examples ("Cdo: c-db-eb-f-g-a-b"
 * and the like) need scales other than the natural major spelled by
 * letter, and the chapter's "36 fundamental scale structures" (36 x 7 =
 * 252 with their modes) is not defined closely enough to reproduce.
 */

const FIFTHS = ["F", "C", "G", "D", "A", "E", "B"] as const;
const NATURAL_PITCH: Record<(typeof FIFTHS)[number], number> = { F: 5, C: 0, G: 7, D: 2, A: 9, E: 4, B: 11 };
const SCALE_ORDER = ["C", "D", "E", "F", "G", "A", "B"] as const;

export type Letter = (typeof SCALE_ORDER)[number];

/** A spelled pitch: a letter and its accidental, +1 a sharp, -2 a double flat. */
export interface SpelledNote {
  letter: Letter;
  accidental: number;
}

/** The accidental a natural major key with `signature` sharps (negative: flats) puts on `letter`. */
export function accidentalInKey(letter: Letter, signature: number): number {
  const i = FIFTHS.indexOf(letter);
  return Math.floor((signature - i + 6) / 7);
}

/** The tonic of the natural major key with `signature`: 0 -> C, -3 -> Eb, +8 -> G#. */
export function majorTonic(signature: number): SpelledNote {
  const letter = FIFTHS[(((signature + 1) % 7) + 7) % 7];
  return { letter, accidental: accidentalInKey(letter, signature) };
}

/** The relative minor's tonic, three letters below the major's. */
export function minorTonic(signature: number): SpelledNote {
  const major = majorTonic(signature);
  const letter = SCALE_ORDER[(SCALE_ORDER.indexOf(major.letter) + 5) % 7];
  return { letter, accidental: accidentalInKey(letter, signature) };
}

export function pitchClass(note: SpelledNote): number {
  return (((NATURAL_PITCH[note.letter] + note.accidental) % 12) + 12) % 12;
}

export function spell(note: SpelledNote): string {
  const mark = note.accidental > 0 ? "#".repeat(note.accidental) : "b".repeat(-note.accidental);
  return `${note.letter}${mark}`;
}

/** The triad on `letter` (letter, letter + 2, letter + 4) with the key's accidentals. */
export function triadOnLetter(letter: Letter, signature: number): SpelledNote[] {
  const start = SCALE_ORDER.indexOf(letter);
  return [0, 2, 4].map((step) => {
    const l = SCALE_ORDER[(start + step) % 7];
    return { letter: l, accidental: accidentalInKey(l, signature) };
  });
}

/** The scale degree (1-7) of `letter` in the natural major key with `signature`. */
export function degreeOf(letter: Letter, signature: number): number {
  return ((SCALE_ORDER.indexOf(letter) - SCALE_ORDER.indexOf(majorTonic(signature).letter) + 7) % 7) + 1;
}

/**
 * A modulation through the chord on one letter (p.518-520): the chord as
 * the preceding key spells it, as the following key respells it, its
 * degree in each key, the names that must be altered, and whether the
 * modulation is diatonic (nothing to alter).
 */
export function commonNameChord(letter: Letter, fromSignature: number, toSignature: number) {
  const from = triadOnLetter(letter, fromSignature);
  const to = triadOnLetter(letter, toSignature);
  const altered = to.filter((note, k) => note.accidental !== from[k].accidental).map((note) => note.letter);
  return {
    from,
    to,
    degrees: [degreeOf(letter, fromSignature), degreeOf(letter, toSignature)] as const,
    altered,
    diatonic: altered.length === 0,
  };
}

/** Every common-name chord between two keys: "seven modulations" (p.518). */
export function allCommonNameChords(fromSignature: number, toSignature: number) {
  return SCALE_ORDER.map((letter) => ({ letter, ...commonNameChord(letter, fromSignature, toSignature) }));
}

/** Figure 247: the scale of key signatures, seven flats to seven sharps, each with its major and relative minor. */
export const KEY_SIGNATURE_SCALE = Array.from({ length: 15 }, (_, k) => {
  const signature = k - 7;
  return { signature, major: spell(majorTonic(signature)), minor: spell(minorTonic(signature)).toLowerCase() };
});

/**
 * The academic plan for a remote modulation (p.525-526, Figure 248):
 * scalewise through the key signatures, one accidental at a time, the
 * keys alternating major and minor -- capitals major, lower case minor.
 */
export function scalewiseModulation(fromSignature: number, toSignature: number): string[] {
  const direction = Math.sign(toSignature - fromSignature);
  const keys: string[] = [];
  for (let s = fromSignature, k = 0; ; s += direction, k++) {
    const isLast = s === toSignature;
    keys.push(k % 2 === 0 || isLast ? spell(majorTonic(s)) : spell(minorTonic(s)).toLowerCase());
    if (isLast) break;
  }
  return keys;
}
