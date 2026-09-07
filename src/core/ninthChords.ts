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
 * Honest scope note on the rest of the chapter (resolution/preparation,
 * p.461-462, Figures 155/157): the book gives a completely unambiguous
 * *table* of preparation methods (`NINTH_PREPARATION_TABLE` below, p.461,
 * transcribed directly from clean typeset text -- no figure-reading
 * needed) but the actual chord-to-chord voice-leading realization of a
 * *resolution* is genuinely more involved than Ch.9's same-shape cycling:
 * "No consecutive S(9)'s are possible through this particular type of
 * system, for S(9) alternates with S(7) and S(5)" (p.460) -- i.e.
 * resolving an S(9) does NOT produce another fresh S(9) the way each
 * Ch.9 seventh-chord cycle step produces another seventh-chord. It
 * collapses to a *reduced* triad or seventh-chord first, and a fresh S(9)
 * has to be re-prepared afterward. Figure 157's own noteheads (the exact
 * pitches each resolution lands on) did not resolve unambiguously even
 * after rendering PDF p.257 at high resolution and cropping in on
 * individual chords -- the same kind of scan-quality wall as Ch.9
 * Section B (p.439-442, documented in `seventhChords.ts`'s module
 * comment... see README) and Ch.6/7's registral-spacing figures. Rather
 * than guess at the alternating S(9)<->S(7)/S(5) mechanic, this module
 * stops at construction + positions, and documents the preparation table
 * as reference data only. A natural next step if clearer scans turn up.
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
