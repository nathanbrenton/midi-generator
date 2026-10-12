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
 * scale before repeating. "The respective intervals representing cycles
 * must be constructed downward for the positive form regardless of their
 * actual position on the musical staff" (p.362): the cycle of the third
 * (C3) steps the root DOWN a third (2 degree positions), the cycle of the
 * fifth (C5) down a fifth (4), the cycle of the seventh (C7) down a
 * seventh (6) -- i.e. up a step. The negative cycles C-3/C-5/C-7 step the
 * same intervals upward. Since 7 is prime, every one of these steps is
 * coprime with 7, so each cycle always visits all 7 degrees exactly once
 * before returning to the start -- "a sequence of seven chords each
 * appearing once and none repeating itself" (p.363).
 *
 * Read off Figure 2 (p.363, rendered): from C in the natural major scale,
 * positive C3 is c-a-f-d-b-g-e-c, C5 is c-f-b-e-a-d-g-c, and C7 is
 * c-d-e-f-g-a-b-c. The same direction is what makes the book's other
 * statements true: "plagal cadences are the starting cadences of the
 * cycle, and... authentic [cadences] the ending cadences" (p.363) holds
 * only when C5 starts C->F and ends G->C; HS_E0, the harmony scale in
 * thirds, is itself built downward (Figure 1); Ch.9's "C3: the seventh
 * alone" moves only under Cmaj7->Am7; and Ch.11's own Table of
 * Preparations calls the suspended 1-into-7 preparation (C under D) C7.
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
 * (A minor) gives {bass 45, root 69, third 60, fifth 64} -- C and E stay
 * put as A minor's third and fifth and only G moves, up a step to A:
 * precisely the "smooth" voice-leading the transformation is meant to
 * produce.
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
 *
 * Chapter 8, Section A (Groups with Passing Sixth-chords, p.415-416): "A
 * group with a passing S(6) is a pre-set combination of three chords:
 * S(5) + S(6) + S(5). Every passing chord occupies the center of its
 * group... In order to obtain G6, it is necessary to connect S(5) with the
 * next S(5)... and add the intermediate third of the first chord in the
 * bass, WITHOUT MOVING THE REMAINING VOICES." That's a complete,
 * unambiguous rule -- the passing S(6) is literally the first chord's own
 * `Voicing`, unchanged except its bass moves from the root's pitch class
 * to the third's (via `nearestPitch`, same minimal-movement voice-leading
 * used everywhere else in this module). Confirmed by hand: a C-major
 * voicing {bass 48, root 60, third 64, fifth 67} produces a passing bass
 * of 52 (E3) -- exactly a third above 48, matching the book's own "3 in
 * the bass under S(6) is a third above its preceding position" (p.415).
 * The classical form connects the outer S(5) chords by C-5, but "we shall
 * extend this principle to all cycles" (p.415) and Section C explicitly
 * generalizes to G6(C3)/G6(C5)/G6(C7)/G6(C-5)/G6(C-3)/G6(C-7) -- so
 * `buildPassingSixthGroups` is deliberately generic over *any* already-built
 * `Voicing` progression (from `voiceLeadProgression` with whatever cycle
 * the caller chooses), rather than hard-coding C-5.
 *
 * Not built: Section B's cadence-cycle framing (C6 closes, C5/C7 continue
 * -- compositional guidance, not a formula), Section D's "16 forms of G6"
 * combinatorics for Type II/III (a plain 4x4=16 product of independent
 * S(5)-structure choices for the two outer chords, confirmed by hand but
 * not wired into a function since it's a one-line arithmetic fact, not a
 * reusable primitive), and Section E's generalized "passing third" (the
 * same device applied after any S(5), not just within a fixed G6 shape).
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";

export type CycleType = 3 | 5 | 7;
/** A cycle with its form: C3, C5, C7 positive; C-3, C-5, C-7 negative. */
export type SignedCycleType = CycleType | -3 | -5 | -7;

/**
 * The scale-degree step of a cycle. An interval of a 3rd/5th/7th spans
 * (N-1) degree steps; positive cycles are "constructed downward" (p.362),
 * so C5 is -4 (C->F) and C-5 is +4 (C->G).
 */
export function cycleDegreeStep(cycle: SignedCycleType): number {
  return cycle > 0 ? -(cycle - 1) : -cycle - 1;
}

/** One full diatonic cycle: 7 chord roots (scale-degree indices), each appearing exactly once, stepping by the cycle's own interval (p.362-363). */
export function diatonicCycle(cycleType: SignedCycleType, startDegree = 0): number[] {
  const step = cycleDegreeStep(cycleType);
  return Array.from({ length: 7 }, (_, k) => (((startDegree + k * step) % 7) + 7) % 7);
}

/**
 * Alternates a sequence of cycles chord by chord -- "assigning a sequence
 * of two or three cycles at a time" (p.363) -- until the root returns to
 * the start: 7 chords per cycle in the group, so each root appears once
 * per cycle "in a different combination with the preceding and the
 * following chord." Figure 3: C3 + C5 from c is c-a-d-b-e-c-f-d-g-e-a-f-b-g,
 * then c again. Throws when the steps cancel out (e.g. C3 + C-3), since
 * such a group never leaves its first chord.
 */
export function alternatingCycles(cycles: readonly SignedCycleType[], startDegree = 0): number[] {
  const steps = cycles.map(cycleDegreeStep);
  if (steps.reduce((s, step) => s + step, 0) % 7 === 0) throw new Error("these cycles cancel out and never leave the first chord");
  const roots = [((startDegree % 7) + 7) % 7];
  for (let k = 1; k < 7 * cycles.length; k++) roots.push((((roots[k - 1] + steps[(k - 1) % steps.length]) % 7) + 7) % 7);
  return roots;
}

/** A binomial progression: two cycles alternating, (2 x 7 =) 14 chords (p.363, Figure 3). */
export function binomialCycle(first: SignedCycleType, second: SignedCycleType, startDegree = 0): number[] {
  return alternatingCycles([first, second], startDegree);
}

/** A trinomial progression: three cycles alternating, 21 chords (p.363). */
export function trinomialCycle(first: SignedCycleType, second: SignedCycleType, third: SignedCycleType, startDegree = 0): number[] {
  return alternatingCycles([first, second, third], startDegree);
}

/** Stacks a root-position triad (S(5)) on `scale` at `rootDegree`: root, third, fifth -- "root-chord: S(5)" (p.211). */
export function stackedTriad(scale: PitchScale, rootMidiNote: number, rootDegree: number): number[] {
  return [0, 2, 4].map((offset) => midiNoteForDegree(scale, rootMidiNote, rootDegree + offset));
}

/**
 * Section F: the cycle a negative-form progression actually takes. With
 * chords built downward from a negative root, every cycle runs the other
 * way -- "CS(5) + C3 + ES(5)": c-a-f to e-c-a, the negative root moving UP
 * a third (p.387). Read upward that is F -> A, "transposing this upward
 * reading to C... this progression is C -> E": the positive form read in
 * position ⓒ.
 */
export function negativeFormCycle(cycle: SignedCycleType): SignedCycleType {
  return -cycle as SignedCycleType;
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
/** The three transformations of S(5): clockwise, counterclockwise, and "constant b" (const. 3), p.376-381. */
export type TransformDirection = "clockwise" | "counterclockwise" | "const3";

/** "The root of the first chord becomes the third of the next... the third becomes the fifth... the fifth becomes the root" (p.379). */
const CLOCKWISE_NEXT: Record<ChordFunction, ChordFunction> = { root: "third", third: "fifth", fifth: "root" };
/** The mirror: root->fifth, fifth->third, third->root (p.379). */
const COUNTERCLOCKWISE_NEXT: Record<ChordFunction, ChordFunction> = { root: "fifth", fifth: "third", third: "root" };
/** "Constant b transformation": b->b, c->a, a->c -- 3 stays 3, 5 and 1 trade places (p.381). */
const CONST3_NEXT: Record<ChordFunction, ChordFunction> = { root: "fifth", third: "third", fifth: "root" };

const NEXT_FUNCTION: Record<TransformDirection, Record<ChordFunction, ChordFunction>> = {
  clockwise: CLOCKWISE_NEXT,
  counterclockwise: COUNTERCLOCKWISE_NEXT,
  const3: CONST3_NEXT,
};

/** An S(5) position: the three upper functions read from the top voice down. */
export type S5Position = readonly [ChordFunction, ChordFunction, ChordFunction];

/**
 * "The different positions of S(5) = 1, 3, 5 can be obtained by
 * constructing the chordal functions downward from each phase of the
 * transformations" (p.377): the clockwise phases abc, bca, cab give
 * 1-3-5, 3-5-1, 5-1-3 from the top down, "commonly known as open"; the
 * counterclockwise phases acb, cba, bac give 1-5-3, 5-3-1, 3-1-5, "closed."
 */
export const S5_POSITIONS: Readonly<Record<"open" | "close", readonly S5Position[]>> = {
  open: [
    ["root", "third", "fifth"],
    ["third", "fifth", "root"],
    ["fifth", "root", "third"],
  ],
  close: [
    ["root", "fifth", "third"],
    ["fifth", "third", "root"],
    ["third", "root", "fifth"],
  ],
};

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

/**
 * Transforms `voicing` into the next chord (rooted at `nextRootDegree`)
 * (p.379-381): each upper voice takes the function the transformation
 * maps its own to, and the voices keep their vertical order -- "when the
 * first chord is in the open position, the entire progression remains
 * automatically in such a position" (p.381), while const. 3, a swap
 * rather than a rotation, turns close into open and back. The chord is
 * placed in that position at the octave nearest the previous one; this
 * is plain nearest-tone voice-leading (`nearestPitch`) except where that
 * would cross voices, as in C7's parallel fourths. The bass doubles the
 * new root at the nearest pitch.
 */
export function transformVoicing(
  voicing: Voicing,
  scale: PitchScale,
  rootMidiNote: number,
  nextRootDegree: number,
  direction: TransformDirection,
): Voicing {
  const [nextRoot, nextThird, nextFifth] = stackedTriad(scale, rootMidiNote, nextRootDegree);
  const pitchClassFor: Record<ChordFunction, number> = { root: nextRoot, third: nextThird, fifth: nextFifth };
  const nextMap = NEXT_FUNCTION[direction];
  const fns: ChordFunction[] = ["root", "third", "fifth"];

  // Where each new function's voice was: the target to stay near.
  const from = {} as Record<ChordFunction, number>;
  fns.forEach((fn) => (from[nextMap[fn]] = voicing[fn]));

  // The new position, bottom voice first, stacked as `positionVoicing` does.
  const bottomUp = [...fns].sort((x, y) => voicing[x] - voicing[y]).map((fn) => nextMap[fn]);
  const shape = {} as Record<ChordFunction, number>;
  let below = -Infinity;
  for (const fn of bottomUp) {
    let note = pitchClassFor[fn];
    if (below === -Infinity) note = nearestPitch(from[fn], note);
    else {
      while (note <= below) note += 12;
      while (note - 12 > below) note -= 12;
    }
    shape[fn] = below = note;
  }

  const movement = (octaves: number) => fns.reduce((sum, fn) => sum + Math.abs(shape[fn] + 12 * octaves - from[fn]), 0);
  const octaves = [-1, 0, 1].reduce((best, k) => (movement(k) < movement(best) ? k : best), 0);

  const next: Voicing = { bass: nearestPitch(voicing.bass, pitchClassFor.root), root: 0, third: 0, fifth: 0 };
  fns.forEach((fn) => (next[fn] = shape[fn] + 12 * octaves));
  return next;
}

/**
 * An S(5) voiced in `position` (top voice first) over a bass doubling the
 * root an octave below: each upper function is placed at its first
 * occurrence above the voice beneath it. Close 5-3-1 on c gives
 * c4-e4-g4; open 1-3-5 gives g3-e4-c5 (Figure 25).
 */
export function positionVoicing(scale: PitchScale, rootMidiNote: number, rootDegree: number, position: S5Position): Voicing {
  const [root, third, fifth] = stackedTriad(scale, rootMidiNote, rootDegree);
  const pitchClass: Record<ChordFunction, number> = { root, third, fifth };
  const bass = root - 12;
  const voicing: Voicing = { bass, root: 0, third: 0, fifth: 0 };
  let below = bass;
  for (const fn of [...position].reverse()) {
    let note = pitchClass[fn];
    while (note <= below) note += 12;
    while (note - 12 > below) note -= 12;
    voicing[fn] = below = note;
  }
  return voicing;
}

/** Whether a voicing's upper voices stand in an open (clockwise) or close (counterclockwise) position (p.377). */
export function voicingPosition(voicing: Voicing): "open" | "close" {
  const fns: ChordFunction[] = ["root", "third", "fifth"];
  const topDown = [...fns].sort((x, y) => voicing[y] - voicing[x]);
  return S5_POSITIONS.open.some((p) => p.every((fn, k) => fn === topDown[k])) ? "open" : "close";
}

/**
 * "The commas indicate an octave variation introduced when the extension
 * of range becomes impractical" (p.380): the bass, a constant root, stays
 * within a fourth of where it began, and the upper voices move together
 * by an octave once their middle wanders more than an octave from home --
 * the transformation itself, and so the position, is untouched.
 */
function octaveVariation(voicing: Voicing, home: Voicing): Voicing {
  const middle = (v: Voicing) => (v.root + v.third + v.fifth) / 3;
  const upperShift = 12 * Math.round((middle(home) - middle(voicing)) / 12);
  let bass = voicing.bass;
  while (bass - home.bass > 6) bass -= 12;
  while (home.bass - bass > 6) bass += 12;
  const upper = Math.abs(middle(voicing) - middle(home)) > 12 ? upperShift : 0;
  return { bass, root: voicing.root + upper, third: voicing.third + upper, fifth: voicing.fifth + upper };
}

/**
 * Builds a full voice-led progression: a starting triad (plus bass) in
 * `startPosition` -- close 5-3-1 by default -- then each subsequent chord
 * via `transformVoicing` (p.379-381). A list of transformations is applied
 * periodically, one per connection: ["clockwise", "counterclockwise"] is
 * the binomial form C + C (p.382). Clockwise and counterclockwise keep the
 * starting position, open or close; const. 3 switches it (p.381).
 */
export function voiceLeadProgression(
  scale: PitchScale,
  rootMidiNote: number,
  rootDegrees: readonly number[],
  direction: TransformDirection | readonly TransformDirection[],
  startPosition: S5Position = S5_POSITIONS.close[1],
): Voicing[] {
  const directions = typeof direction === "string" ? [direction] : direction;
  let current = positionVoicing(scale, rootMidiNote, rootDegrees[0], startPosition);
  const progression: Voicing[] = [current];
  const home = current;
  for (let i = 1; i < rootDegrees.length; i++) {
    current = transformVoicing(current, scale, rootMidiNote, rootDegrees[i], directions[(i - 1) % directions.length] as TransformDirection);
    current = octaveVariation(current, home);
    progression.push(current);
  }
  return progression;
}

/**
 * Ch.8 Section A: the passing S(6) belonging to `voicing` -- the same
 * root/third/fifth, unmoved, with only the bass shifted to the nearest
 * pitch sharing the third's pitch class (p.415).
 */
export function passingSixthChord(voicing: Voicing): Voicing {
  return { ...voicing, bass: nearestPitch(voicing.bass, voicing.third) };
}

/**
 * Inserts a passing S(6) between every consecutive pair of chords in an
 * existing S(5) progression, forming a chain of G6 groups: S(5) + S(6) +
 * S(5) + S(6) + S(5) + ... Generic over any `Voicing` progression (see
 * module docstring) -- the classical form passes a C-5-connected
 * `voiceLeadProgression`, but any cycle works equally well.
 */
export function buildPassingSixthGroups(progression: readonly Voicing[]): Voicing[] {
  const result: Voicing[] = [];
  progression.forEach((voicing, i) => {
    result.push(voicing);
    if (i < progression.length - 1) result.push(passingSixthChord(voicing));
  });
  return result;
}
