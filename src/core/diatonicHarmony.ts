/**
 * Book V, Chapters 1-2: Introduction; The Diatonic System of Harmony.
 *
 * Chapter 1: "There are 36 such [seven-unit, all-letter-names] scales in
 * all. The total number of seven-unit scales equals 462" (p.206) -- the
 * 462 is exactly `compositionCount(12, 7)` from Book II Ch.7
 * (`symmetricScales.ts`): the number of ways to divide the 12-semitone
 * octave into 7 ordered positive parts, C(11,6) = 462. A genuinely nice
 * cross-book confirmation, not a new formula.
 *
 * Chapter 2, Section A (Diatonic Progressions, Positive Form, p.362-363):
 * a chord structure S(5) is a root-position triad -- root, third, fifth,
 * stacked by skipping every other scale degree ("root-chord: S(5),"
 * p.211). A "diatonic cycle" is a progression where the chord root steps
 * by a constant scale-degree interval through all 7 degrees of a 7-unit
 * scale before repeating: the cycle of the third (C3) steps by 2 degree
 * positions each time, the cycle of the fifth (C5) steps by 4, the cycle
 * of the seventh (C7) steps by 6 (equivalently -1, "purely contrapuntal
 * derivation" from stepwise-descending leading-tone resolution, p.369).
 * Since 7 is prime, every one of these steps is coprime with 7, so each
 * cycle always visits all 7 degrees exactly once before returning to the
 * start -- "a sequence of seven chords each appearing once and none
 * repeating itself" (p.363), matching the book's own statement exactly.
 *
 * These aren't arbitrary: applied to the natural major scale from C,
 * `diatonicCycle(3)` gives the root sequence C-E-G-B-D-F-A (the classic
 * "cycle of thirds"), and `diatonicCycle(5)` gives C-G-D-A-E-B-F -- the
 * circle of fifths exactly, independently confirming the step values
 * against standard music theory before any code was written.
 *
 * "Binomial progressions" concatenate two full cycles back to back --
 * "each chord appears twice... in a different combination with the
 * preceding and following chord... a complete binomial cycle in a
 * seven-unit scale consists of (2x7=)14 chords" (p.363), confirmed
 * exactly: `binomialCycle` just concatenates `diatonicCycle` twice.
 *
 * Section B (Historical Development of Cycle Styles) is musicological
 * commentary (Bach, Wagner, Palestrina lineage) with no formula, so isn't
 * implemented -- the same scoping call made throughout this project.
 * Sections C-F (Transformations of S(5), Voice-Leading, Cycle/Transform
 * correlation, the Negative Form) are natural next steps but not yet
 * built, given Book V's own size (24 chapters, far larger than any prior
 * book) -- this module covers the foundational cycle/triad machinery the
 * rest of the book is expected to build on.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";

export type CycleType = 3 | 5 | 7;

/** Scale-degree step size for each named cycle -- an interval of a 3rd/5th/7th spans that many degrees inclusively, i.e. (N-1) index steps (p.362-363). */
const CYCLE_STEPS: Record<CycleType, number> = { 3: 2, 5: 4, 7: 6 };

/** One full diatonic cycle: 7 chord roots (scale-degree indices), each appearing exactly once, stepping by the cycle's own interval (p.362-363). */
export function diatonicCycle(cycleType: CycleType, startDegree = 0): number[] {
  const step = CYCLE_STEPS[cycleType];
  return Array.from({ length: 7 }, (_, k) => (((startDegree + k * step) % 7) + 7) % 7);
}

/** A binomial progression: two full cycles concatenated, 14 chords total -- "each chord appears twice... in a different combination" (p.363). */
export function binomialCycle(first: CycleType, second: CycleType, startDegree = 0): number[] {
  return [...diatonicCycle(first, startDegree), ...diatonicCycle(second, startDegree)];
}

/** A trinomial progression: three full cycles concatenated, 21 chords total, generalizing the same binomial principle. */
export function trinomialCycle(first: CycleType, second: CycleType, third: CycleType, startDegree = 0): number[] {
  return [...diatonicCycle(first, startDegree), ...diatonicCycle(second, startDegree), ...diatonicCycle(third, startDegree)];
}

/** Stacks a root-position triad (S(5)) on `scale` at `rootDegree`: root, third, fifth -- "root-chord: S(5)" (p.211). */
export function stackedTriad(scale: PitchScale, rootMidiNote: number, rootDegree: number): number[] {
  return [0, 2, 4].map((offset) => midiNoteForDegree(scale, rootMidiNote, rootDegree + offset));
}

/** Builds the actual triad progression for a sequence of root-degrees (e.g. from `diatonicCycle`/`binomialCycle`). */
export function chordProgression(scale: PitchScale, rootMidiNote: number, rootDegrees: readonly number[]): number[][] {
  return rootDegrees.map((degree) => stackedTriad(scale, rootMidiNote, degree));
}
