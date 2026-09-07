/**
 * Book V, Chapter 13: The Chromatic System of Harmony (p.495-499).
 *
 * "The basis of the chromatic is: transformation of diatonic chordal
 * functions into chromatic chordal functions and back into diatonic...
 * every chromatic group consists of three chords which express the three
 * stages of the following mechanical process: balance-tension-release"
 * (p.495) -- a diatonic chord, a chromatically-altered ("intensified")
 * chord, then a new diatonic chord. "A chromatic group may consist of
 * one or more simultaneous operations" -- this module covers the
 * one-operation case (Figure 212): a single voice is chromatically
 * raised or lowered by a semitone, then continues one more semitone in
 * the same direction, landing on a new diatonic pitch a whole tone away
 * from where it started -- "x -> x# -> y" or "x -> xb -> y" (p.495).
 *
 * "Actual realization of chromatic groups must be accomplished on...
 * the major and minor bases" (p.498) -- restricted here (as the book
 * itself restricts this section) to the 1-3-5 triad basis only, not the
 * higher 3-5-7 / 5-7-9-11-13 stacks. "Chromatic operations available
 * from the major basis are: raising of the root-tone; lowering of the
 * third; raising of the fifth. Note that they are the opposite of those
 * of the minor basis" -- confirmed exactly against the book's own table
 * (p.498): Major Basis 1#/3b/5#, Minor Basis 1b/3#/5b.
 *
 * The starting voice's chord-function label changes across the group
 * (Figure 211's "Numerical Table of Transformations," p.497) -- fully
 * legible typeset numerals, no figure-reading risk. "'1-3-5' means that
 * a tone -- say C of the major triad C-E-G -- selected for chromatic
 * alteration will be the 1 (root) of the first chord; it will be, when
 * altered (say C#), the 3 of the second chord; and it will be, when the
 * alteration is completed (say D), the 5 of the third chord" (p.497,
 * editor's note) -- this is the module's one fully-worked, hand-verified
 * example, confirmed by `chromaticGroupRoots` below.
 *
 * The table itself is exactly every ordered triple from {1,3,5,7} (the
 * four "lower functions" -- 9/11/13 excluded per p.497's own restriction
 * to S(5)/S(7) forms) -- 4^3 = 64 total, organized in the book by repeat
 * pattern (4 constant, 36 with one repeat, 24 all-distinct), matching
 * "16 different versions for each starting function" (4x4 second/third
 * choices) exactly. `chromaticGroupFunctionTriples` generates the full
 * set directly, no new combinatorial primitive.
 *
 * The chapter's own total form-count (p.497-498) is pure, checkable
 * arithmetic, verified directly against the book's own numbers: each
 * starting function offers 16 function-triples; each of those pairs with
 * 7 possible S(7) forms for the middle chord, and either 4 S(5) forms or
 * 7 S(7) forms for the last chord (16x7=112 forms total per triple-slot,
 * with 4 giving 28 and 7 giving 49 -- "each starting point offers either
 * 28 or 49 forms"); 16 starting points x (28+49) = 1,232 per starting
 * function; x4 starting functions = 4,928, matching "the total quantity
 * is 4(784+448) = 4,928" exactly. `chromaticGroupFormCount` reproduces
 * this arithmetic.
 *
 * Honest scope note: Figure 212's actual realized musical examples (the
 * specific chord voicings for each function-triple) were not
 * hand-verified note-by-note -- unlike the Ch.9/10/11 chord chapters,
 * this chapter's core mechanic (the basis-operation table + the
 * function-triple table) is unambiguous clean prose and typeset numbers,
 * so this module builds the *mechanic* directly rather than reproducing
 * any one figure's specific voicing choices. `chromaticGroupRoots`'s
 * register/voicing choices are this project's own, matching the
 * established convention from `variableDoublings.ts` onward.
 */

import { S5_STRUCTURES, type StructureId } from "./symmetricHarmony.ts";

export type ChromaticFunction = "root" | "third" | "fifth";
export type ChromaticDirection = "raise" | "lower";

export interface ChromaticOperation {
  function: ChromaticFunction;
  direction: ChromaticDirection;
}

/** Major Basis (p.498): raising of the root-tone; lowering of the third; raising of the fifth. */
export const MAJOR_BASIS_OPERATIONS: readonly ChromaticOperation[] = [
  { function: "root", direction: "raise" },
  { function: "third", direction: "lower" },
  { function: "fifth", direction: "raise" },
];

/** Minor Basis (p.498): "the opposite of those of the minor basis" -- lowering the root; raising the third; lowering the fifth. */
export const MINOR_BASIS_OPERATIONS: readonly ChromaticOperation[] = [
  { function: "root", direction: "lower" },
  { function: "third", direction: "raise" },
  { function: "fifth", direction: "lower" },
];

/** The 3-pitch chromatic path of the one altered voice: balance -> tension -> release (p.495) -- always a whole tone away after 2 semitone steps in the same direction. */
export function chromaticPitchPath(startPitch: number, direction: ChromaticDirection): [number, number, number] {
  const step = direction === "raise" ? 1 : -1;
  return [startPitch, startPitch + step, startPitch + 2 * step];
}

export type ChordFunction = 1 | 3 | 5 | 7;
export const CHORD_FUNCTIONS: readonly ChordFunction[] = [1, 3, 5, 7];

/** Every ordered triple of chord-functions (Figure 211, p.497) -- all 64 ways one voice's function label can read across the 3-chord group. */
export function chromaticGroupFunctionTriples(): [ChordFunction, ChordFunction, ChordFunction][] {
  const triples: [ChordFunction, ChordFunction, ChordFunction][] = [];
  for (const a of CHORD_FUNCTIONS) for (const b of CHORD_FUNCTIONS) for (const c of CHORD_FUNCTIONS) triples.push([a, b, c]);
  return triples;
}

/**
 * The chapter's own total form-count (p.497-498): "each starting point
 * offers either 28 or 49 forms" -- for one fixed (middle-chord-form,
 * last-chord-form) reading, the middle chord has 7 possible S(7) forms,
 * and the last chord has either 4 S(5) forms (7x4=28) or 7 S(7) forms
 * (7x7=49). "The total number of starting points for one function equals
 * 16" (the 4x4 choices of 2nd/3rd function), so one starting function
 * offers 16x(28+49) = 1,232 forms; x4 starting functions (1,3,5,7) gives
 * the book's own stated total, 4,928.
 */
export function chromaticGroupFormCount(): { perStartingFunction: number; total: number } {
  const startingPointsPerFunction = 16; // 4 (2nd function) x 4 (3rd function)
  const middleFormsS7 = 7;
  const formsIfLastIsS5 = middleFormsS7 * 4; // 28
  const formsIfLastIsS7 = middleFormsS7 * 7; // 49
  const perStartingFunction = startingPointsPerFunction * (formsIfLastIsS5 + formsIfLastIsS7);
  return { perStartingFunction, total: 4 * perStartingFunction };
}

/** Semitone offset of a chord function from its root, for a major/minor triad (p.498 restricts the chromatic system to this 1-3-5 basis only). */
function functionOffset(fn: ChromaticFunction, structure: StructureId): number {
  if (fn === "root") return 0;
  const [third, fifthStep] = S5_STRUCTURES[structure].intervals;
  if (fn === "third") return third;
  return third + fifthStep;
}

export interface ChromaticGroupChord {
  root: number;
  structure: StructureId;
}

/** A chord function within the plain 1-3-5 triad basis this module realizes (p.498 itself restricts to this basis; Figure 211's full table also allows 7, the seventh, which needs an S(7) chord and isn't modeled here). */
export type TriadChordFunction = 1 | 3 | 5;

/**
 * Realizes a one-operation chromatic group: `startChord`'s function
 * `operation.function` is chromatically altered (per `operation.direction`),
 * and the resulting 3-pitch path is reinterpreted as `functionTriple`'s
 * three function labels across chord1 (= startChord), chord2 and chord3
 * (in the given structures) -- confirmed against the book's own worked
 * example (p.497): a C major triad, root altered upward, function triple
 * 1-3-5, produces the pitch path C-C#-D and chord1's root of C.
 */
export function chromaticGroupRoots(
  startChord: ChromaticGroupChord,
  operation: ChromaticOperation,
  functionTriple: readonly [TriadChordFunction, TriadChordFunction, TriadChordFunction],
  chord2Structure: StructureId,
  chord3Structure: StructureId,
): [number, number, number] {
  const startPitch = startChord.root + functionOffset(operation.function, startChord.structure);
  const [pitch1, pitch2, pitch3] = chromaticPitchPath(startPitch, operation.direction);

  const root1 = pitch1 - functionOffset(triadFunctionName(functionTriple[0]), startChord.structure);
  const root2 = pitch2 - functionOffset(triadFunctionName(functionTriple[1]), chord2Structure);
  const root3 = pitch3 - functionOffset(triadFunctionName(functionTriple[2]), chord3Structure);

  return [root1, root2, root3];
}

function triadFunctionName(fn: TriadChordFunction): ChromaticFunction {
  return fn === 1 ? "root" : fn === 3 ? "third" : "fifth";
}
