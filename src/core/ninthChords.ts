/**
 * Book V, Chapter 10, Section A: The Ninth Chord, Diatonic System (p.460-463).
 *
 * "Ninth-chords in four-part harmony are used with the root-tone in the
 * bass only, thus operating as a hybrid four-part harmony -- like S(5)
 * with the doubled root. The three upper parts are 3, 7 and 9" (p.460).
 * So S(9) is NOT a 5-note stack of root+3+5+7+9 -- the fifth is omitted
 * entirely, and the structure is exactly 4 voices: the root alone in the
 * bass, plus third/seventh/ninth above it. This is a direct extension of
 * `stackedSeventhChord`'s degree-stacking (root=0, third=2, seventh=6),
 * skipping the fifth (4) and adding the ninth (8).
 *
 * "As the bass remains constant, the three upper voices are subject to
 * six permutations resulting in corresponding distributions" (p.460,
 * Figure 156) -- the exact same "positions" mechanic already built for
 * Ch.6/7's doubling forms (`doublingPositions`/`positionCount` in
 * `variableDoublings.ts`), reused here via `generalPermutations` on the
 * three fixed upper functions (third/seventh/ninth never change, unlike
 * Ch.6's *which* function is doubled -- so there's exactly one "form",
 * always 6 positions, no 3-position repeated-pair case).
 *
 * Resolutions (p.460-461, Figure 157 -- legible once rendered at scale 6
 * and read with positive cycles running downward): "the 7 and the 9 are
 * subject to resolution through stepwise downward motion. If one function
 * resolves at a time, it is always the higher one (the ninth)... [this]
 * produces C0. Other cycles derive from the simultaneous resolutions of
 * two functions," and "the resolutions (except in C0) produce positive
 * cycles only." From C S(9), c | e-b-d: C0 resolves d to c over the same
 * bass (an S(7)); C3 and C5 resolve b-d to a-c over e, A minor with c --
 * its third -- left in the bass (the figure's circled ③, an S(6)) and F
 * S(7) over f; C7 resolves b-d to a-c while e rises to f over d, "two
 * pairs of voices moving in thirds in contrary motion." So "S(9)
 * alternates with S(7) and S(5)" -- `NINTH_RESOLUTIONS`.
 *
 * Section B (p.464-465, Figures 162-163): two families of S(9), "not to
 * be mixed except when in C0," named by their third and ninth --
 * `NINTH_FAMILIES` -- and the four C0 pairs the book rules out for
 * consecutive sevenths, which `consecutiveSevenths` finds.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { generalPermutations } from "./permutations.ts";

/** Stacks a root-position ninth-chord: bass = root alone, upper = third, seventh, ninth (p.460 -- the fifth is omitted). */
export function stackedNinthChord(scale: PitchScale, rootMidiNote: number, rootDegree: number): { bass: number; upper: number[] } {
  const bass = midiNoteForDegree(scale, rootMidiNote, rootDegree);
  const upper = [2, 6, 8].map((offset) => midiNoteForDegree(scale, rootMidiNote, rootDegree + offset));
  return { bass, upper };
}

export type NinthUpperFunction = "third" | "seventh" | "ninth";
export const NINTH_UPPER_FUNCTIONS: readonly NinthUpperFunction[] = ["third", "seventh", "ninth"];

/** Every distinct ordering of the three upper voices (p.460, Figure 156) -- always 6, since third/seventh/ninth are always distinct. */
export function ninthPositions(): NinthUpperFunction[][] {
  return generalPermutations([0, 1, 2]).map((indices) => indices.map((i) => NINTH_UPPER_FUNCTIONS[i])) as NinthUpperFunction[][];
}

/**
 * Builds the four MIDI notes (bass + 3 upper voices) for one position,
 * stacked upward in plain close position above the bass in the order the
 * position gives -- this project's own register choice, not a
 * reproduction of Figure 156's specific spacing (see module docstring).
 */
export function buildNinthVoicing(
  position: readonly NinthUpperFunction[],
  scale: PitchScale,
  rootMidiNote: number,
  rootDegree: number,
): { bass: number; upper: number[] } {
  const { bass, upper: rootPositionUpper } = stackedNinthChord(scale, rootMidiNote, rootDegree);
  const pitchClassFor: Record<NinthUpperFunction, number> = {
    third: rootPositionUpper[0],
    seventh: rootPositionUpper[1],
    ninth: rootPositionUpper[2],
  };

  let previous = bass;
  const upper = position.map((fn) => {
    let note = pitchClassFor[fn];
    while (note <= previous) note += 12;
    previous = note;
    return note;
  });

  return { bass, upper };
}

export type NinthPreparationMethod = "suspending" | "descending" | "ascending";

export interface NinthPreparationEntry {
  method: NinthPreparationMethod;
  /** Which two functions of the PRECEDING chord move to become the seventh and ninth. */
  fromSeventh: 1 | 3 | 5;
  fromNinth: 3 | 5 | 7;
  /** The resulting cycle label relative to the S(9) chord being prepared (p.461). */
  cycle: "C7" | "C5" | "C3" | "C0" | "C-3" | "C-5" | "C-7";
}

/** Table of Preparations (p.461) -- transcribed directly from the book's own clean typeset table, no figure-reading involved. */
export const NINTH_PREPARATION_TABLE: readonly NinthPreparationEntry[] = [
  { method: "suspending", fromSeventh: 1, fromNinth: 3, cycle: "C7" },
  { method: "suspending", fromSeventh: 3, fromNinth: 5, cycle: "C5" },
  { method: "suspending", fromSeventh: 5, fromNinth: 7, cycle: "C3" },
  { method: "descending", fromSeventh: 1, fromNinth: 3, cycle: "C0" },
  { method: "descending", fromSeventh: 3, fromNinth: 5, cycle: "C-3" },
  { method: "descending", fromSeventh: 5, fromNinth: 7, cycle: "C-5" },
  { method: "ascending", fromSeventh: 1, fromNinth: 3, cycle: "C-3" },
  { method: "ascending", fromSeventh: 3, fromNinth: 5, cycle: "C-5" },
  { method: "ascending", fromSeventh: 5, fromNinth: 7, cycle: "C-7" },
];

/** Where each upper function of S(9) goes in a resolution, and the next chord's form (p.460-461, Figure 157). */
export interface NinthResolution {
  cycle: "C0" | "C3" | "C5" | "C7";
  /** Each upper function's function in the next chord. */
  moves: Readonly<Record<NinthUpperFunction, 1 | 3 | 5 | 7>>;
  /** The function the bass takes in the next chord: 1, or 3 under C3 (the bass holds, an S(6)). */
  bass: 1 | 3;
  result: "S(7)" | "S(6)";
  /**
   * The figure's "or:" -- the same upper voices with the bass moved to g:
   * in C0 the fifth, "a complete S(4/3)" (as p.469 recalls it); in C3 the
   * seventh of A, an S(2).
   */
  alternative?: { bass: 5 | 7; result: "S(4/3)" | "S(2)" };
}

/**
 * Figure 157, from C S(9): C0 -- d to c, the rest held: c | e-b-c, an S(7).
 * C3 -- b-d to a-c, e held, bass c held: A minor over its third. C5 -- b-d
 * to a-c, e held, bass to f: F S(7) without its root above. C7 -- b-d to
 * a-c, e up to f, bass up to d: D S(7) without its root above.
 */
export const NINTH_RESOLUTIONS: readonly NinthResolution[] = [
  { cycle: "C0", moves: { third: 3, seventh: 7, ninth: 1 }, bass: 1, result: "S(7)", alternative: { bass: 5, result: "S(4/3)" } },
  { cycle: "C3", moves: { third: 5, seventh: 1, ninth: 3 }, bass: 3, result: "S(6)", alternative: { bass: 7, result: "S(2)" } },
  { cycle: "C5", moves: { third: 7, seventh: 3, ninth: 5 }, bass: 1, result: "S(7)" },
  { cycle: "C7", moves: { third: 3, seventh: 5, ninth: 7 }, bass: 1, result: "S(7)" },
];

export type NinthFamily = "minor seventh" | "major seventh";

/**
 * Section B, the two families of S(9) (Figures 162-163, rendered): the
 * seventh fixes the family, and each member is named by its third and
 * ninth, in semitones above the root. "These are the only possible forms."
 */
export const NINTH_FAMILIES: readonly { family: NinthFamily; index: 1 | 2 | 3 | 4; name: string; third: number; seventh: number; ninth: number }[] = [
  { family: "minor seventh", index: 1, name: "large", third: 4, seventh: 10, ninth: 14 },
  { family: "minor seventh", index: 2, name: "diminished", third: 4, seventh: 10, ninth: 13 },
  { family: "minor seventh", index: 3, name: "minor", third: 3, seventh: 10, ninth: 14 },
  { family: "minor seventh", index: 4, name: "small", third: 3, seventh: 10, ninth: 13 },
  { family: "major seventh", index: 1, name: "major", third: 4, seventh: 11, ninth: 14 },
  { family: "major seventh", index: 2, name: "augmented I", third: 4, seventh: 11, ninth: 15 },
  { family: "major seventh", index: 3, name: "augmented II", third: 3, seventh: 11, ninth: 14 },
];

type NinthForm = (typeof NINTH_FAMILIES)[number];

/**
 * Whether moving between two S(9) forms on one root (C0) makes two upper
 * voices a seventh apart move together into another seventh -- the
 * "consecutive sevenths" the book rules out: 7bS4 <-> 7nS1, 7nS2 <-> 7nS3,
 * 7bS3 <-> 7nS2, 7bS1 <-> 7bS4 (p.465).
 */
export function consecutiveSevenths(from: NinthForm, to: NinthForm): boolean {
  const voices = ["third", "seventh", "ninth"] as const;
  return voices.some((x, i) =>
    voices.some((y, j) => {
      if (j <= i) return false;
      const before = from[y] - from[x];
      const after = to[y] - to[x];
      const moved = from[x] !== to[x];
      return moved && before === after && (before % 12 === 10 || before % 12 === 11);
    }),
  );
}
