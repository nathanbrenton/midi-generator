/**
 * Book V, Chapter 18: Linking Harmonic Continuities (p.554-558).
 *
 * "Assuming that any form of harmonic progression is used either as
 * continuity or as connection, we obtain the following nine forms of
 * combined harmonic continuity" (p.554): every pairing of a progression
 * type {diatonic, symmetric, chromatic} with a connection type from the
 * same three. `LINKING_FORMS` transcribes all nine, with each one's
 * stated answer to the chapter's one recurring quantitative question --
 * does the connection gain an extra chord?
 *
 *   1 diatonic/diatonic     -- yes, when cycle progressions are joined
 *                              through a passing-chord group (G6/G4-6);
 *                              no, in the reverse case ("when groups are
 *                              connected by a cycle, there is no extra
 *                              chord to be gained")
 *   2 diatonic/symmetric    -- no: "does not produce an extra chord, but
 *                              rather an interval"
 *   3 diatonic/chromatic    -- yes
 *   4 symmetric/diatonic    -- no
 *   5 symmetric/symmetric   -- not stated
 *   6 symmetric/chromatic   -- yes ("introduces one extra chord")
 *   7 chromatic/diatonic    -- no
 *   8 chromatic/symmetric   -- no
 *   9 chromatic/chromatic   -- yes
 *
 * The chapter's precise mechanical claims, each built here:
 *
 * - Group connection (form 1, p.555): "the first chord of the group is
 *   the last chord of the preceding progression, the middle chord of the
 *   group is the extra chord and the last chord of the group is the first
 *   chord of the succeeding progression." `linkThroughGroup` enforces that
 *   overlap exactly (and refuses a group whose ends don't coincide with
 *   the progressions it claims to join), generic over any chord
 *   representation -- e.g. Ch.8's own G6 groups from `diatonicHarmony.ts`.
 *
 * - Symmetric connection of diatonic progressions (form 2, p.556): each
 *   section starts a symmetric interval from the previous one ("planned
 *   either in relation to the first or to the last chord") --
 *   `symmetricSectionStarts`, which is Book II Ch.7's `gapSemitones`
 *   stepped section by section.
 *
 * - Symmetric connection of symmetric progressions (form 5, p.556):
 *   "must be based on selection of such forms of symmetry as do not appear
 *   in the progression itself." A "form of symmetry" is read here as a
 *   tonic system (2/3/4/6/12 tonics, Book II Ch.7), and an interval's own
 *   system is 12/gcd(interval,12) -- so a 4-semitone and an 8-semitone
 *   step are the same form (3 tonics), as they should be.
 *   `isDistinctSymmetricConnection` checks the connecting interval's
 *   system against every step of the progression.
 *
 * - Chromatic connection of symmetric progressions (form 6, p.557): "the
 *   interval between the extreme chords of the chromatic connection should
 *   not duplicate any steps of the symmetric progression" --
 *   `chromaticConnectionAvoidsSteps`, comparing pitch-class intervals (so
 *   +4 and -8 count as the same step).
 *
 * - Diatonic connection of symmetric or chromatic progressions (forms 4
 *   and 7, p.555-557): "assigning the last chord... to the key in which
 *   such a chord may exist. The latter is connected by a diatonic cycle
 *   with some other chord in the same key." `keysContaining` finds every
 *   key a chord exists in (confirmed against standard theory: a major
 *   triad lives in exactly 3 major keys, as I/IV/V; a diminished triad in
 *   exactly 1; an augmented triad in none), and `diatonicCycleConnection`
 *   steps the chord's root by a C3/C5/C7 cycle (or its negative) inside
 *   one chosen key, reusing Ch.2's own cycle step sizes and
 *   `stackedTriad`.
 *
 * Honest scope note: form 8 ("selection of a root which does not produce
 * chromatic steps in any voice") is not built. A chromatic step in this
 * book is an alteration that keeps a tone's *name* (C -> C#), and this
 * project models pitch classes, not note names -- so a semitone motion
 * can't be told apart from a diatonic one (B -> C) without inventing a
 * spelling system the book hasn't supplied here. Form 9's "contrasting
 * forms of chromatics" (parallel vs. contrary, chromatics vs.
 * enharmonics) is qualitative guidance, not a formula.
 */

import { intervalCellScale, type PitchScale } from "./scales.ts";
import { stackedTriad } from "./diatonicHarmony.ts";
import { gapSemitones } from "./symmetricScales.ts";

export type HarmonyType = "diatonic" | "symmetric" | "chromatic";

export interface LinkingForm {
  number: number;
  progression: HarmonyType;
  connection: HarmonyType;
  /** Whether the connection gains an extra chord; `null` where the book doesn't say. */
  extraChord: boolean | null;
}

/** The nine forms of combined harmonic continuity (p.554), each with the book's own stated extra-chord answer. */
export const LINKING_FORMS: readonly LinkingForm[] = [
  { number: 1, progression: "diatonic", connection: "diatonic", extraChord: true },
  { number: 2, progression: "diatonic", connection: "symmetric", extraChord: false },
  { number: 3, progression: "diatonic", connection: "chromatic", extraChord: true },
  { number: 4, progression: "symmetric", connection: "diatonic", extraChord: false },
  { number: 5, progression: "symmetric", connection: "symmetric", extraChord: null },
  { number: 6, progression: "symmetric", connection: "chromatic", extraChord: true },
  { number: 7, progression: "chromatic", connection: "diatonic", extraChord: false },
  { number: 8, progression: "chromatic", connection: "symmetric", extraChord: false },
  { number: 9, progression: "chromatic", connection: "chromatic", extraChord: true },
];

export function linkingForm(progression: HarmonyType, connection: HarmonyType): LinkingForm {
  const form = LINKING_FORMS.find((f) => f.progression === progression && f.connection === connection);
  if (!form) throw new Error(`no linking form for ${progression}/${connection}`);
  return form;
}

/**
 * Joins two progressions through a 3-chord connecting group (p.555): the
 * group's first chord IS the preceding progression's last chord, its last
 * chord IS the succeeding progression's first chord, and only its middle
 * chord is new -- the one extra chord the connection gains.
 */
export function linkThroughGroup<T>(
  preceding: readonly T[],
  group: readonly [T, T, T],
  succeeding: readonly T[],
  same: (a: T, b: T) => boolean,
): T[] {
  if (preceding.length === 0 || succeeding.length === 0) throw new Error("both progressions must be non-empty");
  if (!same(group[0], preceding[preceding.length - 1])) {
    throw new Error("the group's first chord must be the preceding progression's last chord");
  }
  if (!same(group[2], succeeding[0])) {
    throw new Error("the group's last chord must be the succeeding progression's first chord");
  }
  return [...preceding, group[1], ...succeeding];
}

/** Starting roots of successive sections linked by a symmetric interval (p.556): each section starts one tonic-gap from the last. */
export function symmetricSectionStarts(firstRoot: number, tonicCount: number, sections: number): number[] {
  const gap = gapSemitones(tonicCount);
  return Array.from({ length: sections }, (_, k) => firstRoot + k * gap);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function pitchClassInterval(semitones: number): number {
  return ((semitones % 12) + 12) % 12;
}

/** The tonic system ("form of symmetry") an interval belongs to: 12/gcd(interval,12) tonics. A unison/octave is the 1-tonic zero cycle. */
export function tonicSystemOfInterval(semitones: number): number {
  const pc = pitchClassInterval(semitones);
  return pc === 0 ? 1 : 12 / gcd(pc, 12);
}

/** Form 5's condition (p.556): the connecting interval's form of symmetry must not appear among the progression's own steps. */
export function isDistinctSymmetricConnection(progressionSteps: readonly number[], connectionInterval: number): boolean {
  const used = new Set(progressionSteps.map(tonicSystemOfInterval));
  return !used.has(tonicSystemOfInterval(connectionInterval));
}

/** Form 6's condition (p.557): the interval between the chromatic connection's extreme chords must not duplicate any step of the symmetric progression. */
export function chromaticConnectionAvoidsSteps(progressionSteps: readonly number[], extremeInterval: number): boolean {
  const used = new Set(progressionSteps.map(pitchClassInterval));
  return !used.has(pitchClassInterval(extremeInterval));
}

const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

/** Every key (tonic pitch class, 0-11) of `scale` whose pitch collection contains all of `pitchClasses` (p.555, 557: "the key in which such a chord may exist"). */
export function keysContaining(pitchClasses: readonly number[], scale: PitchScale = MAJOR_SCALE): number[] {
  const wanted = pitchClasses.map(pitchClassInterval);
  const keys: number[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    const collection = new Set(scale.degrees.map((d) => (tonic + d) % 12));
    if (wanted.every((pc) => collection.has(pc))) keys.push(tonic);
  }
  return keys;
}

export type CycleConnection = 3 | 5 | 7 | -3 | -5 | -7;

const CONNECTION_STEPS: Record<CycleConnection, number> = { 3: 2, 5: 4, 7: 6, [-3]: -2, [-5]: -4, [-7]: -6 };

/**
 * A diatonic cycle connection (forms 4 and 7): treats `chordRootPitchClass`
 * as a degree of the key on `keyTonicPitchClass`, steps its root by the
 * given cycle (Ch.2's own step sizes; negative cycles step backward), and
 * returns the target chord stacked in that key. Throws if the root isn't
 * in the key at all.
 */
export function diatonicCycleConnection(
  chordRootPitchClass: number,
  keyTonicPitchClass: number,
  cycle: CycleConnection,
  rootMidiNote = 60,
  scale: PitchScale = MAJOR_SCALE,
): { rootDegree: number; triad: number[] } {
  const offset = pitchClassInterval(chordRootPitchClass - keyTonicPitchClass);
  const degree = scale.degrees.indexOf(offset);
  if (degree < 0) throw new Error("the chord's root is not a degree of that key");

  const length = scale.degrees.length;
  const rootDegree = (((degree + CONNECTION_STEPS[cycle]) % length) + length) % length;
  const keyRoot = rootMidiNote + pitchClassInterval(keyTonicPitchClass - rootMidiNote);
  return { rootDegree, triad: stackedTriad(scale, keyRoot, rootDegree) };
}
