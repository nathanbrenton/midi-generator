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
 *
 * Sections C-D (Transformations of S(5); Voice-Leading, p.376-381): an
 * S(5) triad has three "functions" -- root (a), third (b), fifth (c) --
 * plus a constant bass doubling the root, unaffected by transformation
 * ("the transformation of functions affects all parts except the bass,"
 * p.376). Two transformations connect consecutive chords in a
 * progression: clockwise, where "the root of the first chord becomes the
 * third of the next chord; the third... becomes the fifth...; the fifth...
 * becomes the root..." (p.379), and counterclockwise, the mirror (root to
 * fifth, fifth to third, third to root). This is voice-leading by
 * function-reassignment: whichever voice sang a given function now sings
 * its mapped function in the next chord, placed at the nearest available
 * octave -- confirmed by hand before coding: starting from a C major
 * triad in root position (bass 48, root 60, third 64, fifth 67) and
 * applying clockwise voice-leading into the next chord of a C3 cycle
 * (E minor) gives {bass 52, root 64, third 55, fifth 59} -- exactly an E
 * minor triad's pitch classes (E,G,B), each voice moving by no more than
 * a few semitones, precisely the "smooth" voice-leading the transformation
 * is meant to produce.
 *
 * Section E (How Cycles and Transformations Are Related, p.382-385) is a
 * 4-category taxonomy of constant/variable cycle and transformation
 * choices, not a new formula -- its two concrete-sounding sub-items both
 * turn out to be reuses of primitives already built elsewhere: "24
 * variations of 4 elements" for voice redistribution is `generalPermutations`
 * again (4!=24, the same reuse already confirmed for Book III Ch.1's own
 * "24 permutations of 4 elements" chord-voicing passage), and the
 * "coefficients of recurrence" applied to transformation sequencing is
 * free compositional choice, the same category as every other
 * coefficients-of-recurrence passage in this project.
 *
 * Section F (The Negative Form, p.386-388): chord-structures are built
 * *downward* instead of upward -- "in order to construct a negative S(5),
 * it is necessary to take the next pitch-unit downward, which becomes the
 * negative third (-3), and the next unit downward from the latter, which
 * becomes the negative fifth (-5)." Confirmed by hand before coding: "if
 * we start from c as -1, a is -3 and f is -5" -- with C=60 in the natural
 * major scale, stepping two scale-degrees downward twice gives A (57, a
 * minor third below C) then F (53, a perfect fifth below C), exactly
 * matching the book's own example. This is the exact mirror of the
 * positive `stackedTriad` (offsets 0,+2,+4), just with offsets 0,-2,-4.
 * Negative-form voice-leading ("if everything is read downward, the C and
 * O transformations correspond" -- i.e. clockwise/counterclockwise swap
 * meaning) is a natural next step, not yet built.
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

/** Section F: the negative form's triad, built downward instead of upward -- root, negative third, negative fifth (p.386). */
export function negativeStackedTriad(scale: PitchScale, rootMidiNote: number, rootDegree: number): number[] {
  return [0, -2, -4].map((offset) => midiNoteForDegree(scale, rootMidiNote, rootDegree + offset));
}

/** Builds the actual triad progression for a sequence of root-degrees (e.g. from `diatonicCycle`/`binomialCycle`). */
export function chordProgression(scale: PitchScale, rootMidiNote: number, rootDegrees: readonly number[]): number[][] {
  return rootDegrees.map((degree) => stackedTriad(scale, rootMidiNote, degree));
}

export type ChordFunction = "root" | "third" | "fifth";
export type TransformDirection = "clockwise" | "counterclockwise";

/** "The root of the first chord becomes the third of the next... the third becomes the fifth... the fifth becomes the root" (p.379). */
const CLOCKWISE_NEXT: Record<ChordFunction, ChordFunction> = { root: "third", third: "fifth", fifth: "root" };
/** The mirror: root->fifth, fifth->third, third->root (p.379). */
const COUNTERCLOCKWISE_NEXT: Record<ChordFunction, ChordFunction> = { root: "fifth", fifth: "third", third: "root" };

/** The pitch nearest to `referencePitch` sharing `targetPitchClass` (0-11) -- standard nearest-tone voice-leading, minimal melodic movement. */
export function nearestPitch(referencePitch: number, targetPitchClass: number): number {
  const refClass = ((referencePitch % 12) + 12) % 12;
  const targetClass = ((targetPitchClass % 12) + 12) % 12;
  let delta = ((targetClass - refClass) % 12 + 12) % 12;
  if (delta > 6) delta -= 12;
  return referencePitch + delta;
}

export interface Voicing {
  /** Constant root-doubling bass, unaffected by the a/b/c transformation (p.376). */
  bass: number;
  root: number;
  third: number;
  fifth: number;
}

/** Transforms `voicing` into the next chord (rooted at `nextRootDegree`) via clockwise or counterclockwise voice-leading (p.379-381). */
export function transformVoicing(
  voicing: Voicing,
  scale: PitchScale,
  rootMidiNote: number,
  nextRootDegree: number,
  direction: TransformDirection,
): Voicing {
  const [nextRoot, nextThird, nextFifth] = stackedTriad(scale, rootMidiNote, nextRootDegree);
  const pitchClassFor: Record<ChordFunction, number> = { root: nextRoot, third: nextThird, fifth: nextFifth };
  const nextMap = direction === "clockwise" ? CLOCKWISE_NEXT : COUNTERCLOCKWISE_NEXT;

  const next: Voicing = { bass: nearestPitch(voicing.bass, pitchClassFor.root), root: 0, third: 0, fifth: 0 };
  (Object.keys(pitchClassFor) as ChordFunction[]).forEach((fn) => {
    const newFn = nextMap[fn];
    next[newFn] = nearestPitch(voicing[fn], pitchClassFor[newFn]);
  });
  return next;
}

/** Builds a full voice-led progression: a starting root-position triad (plus bass), then each subsequent chord via `transformVoicing` (p.379-381). */
export function voiceLeadProgression(
  scale: PitchScale,
  rootMidiNote: number,
  rootDegrees: readonly number[],
  direction: TransformDirection,
): Voicing[] {
  const [root, third, fifth] = stackedTriad(scale, rootMidiNote, rootDegrees[0]);
  let current: Voicing = { bass: root - 12, root, third, fifth };
  const progression: Voicing[] = [current];
  for (let i = 1; i < rootDegrees.length; i++) {
    current = transformVoicing(current, scale, rootMidiNote, rootDegrees[i], direction);
    progression.push(current);
  }
  return progression;
}
