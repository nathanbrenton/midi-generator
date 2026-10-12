/**
 * Book V, Chapter 9, Section A: The Seventh Chord, Diatonic System (p.436-438).
 *
 * A seventh-chord stacks four scale-degree-thirds instead of three: root,
 * third, fifth, seventh (p.436, Figure 115) -- "S(7) consists of: 1, 3, 5,
 * 7" (p.439), a direct extension of `stackedTriad`. Unlike the S(5)/S(6)
 * system (Ch.2/6/7), there's no separate doubled bass -- the chord is
 * already a plain 4-note structure, and its 4 inversions are just "which
 * of the 4 functions is voiced lowest" (Fundamental=root, First=third,
 * Second=fifth, Third=seventh).
 *
 * The chapter's actual content is how S(7) generates diatonic continuity:
 * "the postulate of resolving seventh: the seventh moves one step down...
 * the basis of the entire system of diatonic continuity (cycles)" (p.436).
 * Figures 117-119 give the exact 4-function voice-leading map for each
 * cycle, read directly off the book's own circular-arrow diagrams (OCR
 * mangles this passage badly -- confirmed by rendering PDF p.245 at high
 * resolution before writing any of this):
 *
 * - C3 ("one movement... the seventh alone... clockwise"): the diagram
 *   shows a single 4-cycle, 1->3->5->7->1 -- a direct extension of Ch.2's
 *   existing clockwise map (root->third->fifth->root) by one more step.
 * - C7 ("three movements... the seventh, the fifth, and the third...
 *   counter-clockwise"): the exact mirror, 1->7->5->3->1.
 * - C5 ("two movements... the seventh and the fifth... crosswise"): NOT
 *   a 4-cycle at all -- the diagram shows a "+"-shaped cross pairing
 *   1<->5 and 3<->7, a double-swap (order 2), matching the figure's own
 *   alternating 2-chord pattern (root position <-> second inversion)
 *   rather than clockwise/counterclockwise's 4-chord cycle.
 *
 * The maps only make sense with positive cycles constructed downward
 * (p.362, `cycleDegreeStep`), and then they make exact sense: a Cmaj7
 * {C, E, G, B} under C3 goes to Am7 -- C, E, G stay as Am7's third, fifth
 * and seventh, and only B steps down to A ("the seventh alone"). Under C5
 * it goes to Fmaj7 -- C and E stay, G steps down to F and B to A ("the
 * seventh and the fifth"). Under C7 it goes to Dm7 -- C stays, B, G and E
 * step down to A, F and D ("the seventh, the fifth, and the third"). The
 * C3 sequence runs 7 -> 6/5 -> 4/3 -> 2 -> 7 through all four inversions,
 * matching Figure 117.
 *
 * The "one/two/three movements" language describes how many of the four
 * relabeled voices need an actual downward step (the rest arrive via
 * `nearestPitch`'s already-minimal movement) -- explanatory, not a
 * separate parameter this module needs to track.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { cycleBetween, cycleDegreeStep, nearestPitch, type SignedCycleType } from "./diatonicHarmony.ts";

export type SeventhCycleType = 3 | 5 | 7;
/** With the negative cycles of Section C (p.443-444). */
export type SignedSeventhCycle = SeventhCycleType | -3 | -5 | -7;

/** One full diatonic cycle of seventh-chord roots, stepping downward exactly like Ch.2's triad cycles (p.362-363). */
export function seventhCycle(cycleType: SignedSeventhCycle, startDegree = 0): number[] {
  const step = cycleDegreeStep(cycleType);
  return Array.from({ length: 7 }, (_, k) => (((startDegree + k * step) % 7) + 7) % 7);
}

/** Stacks a root-position seventh-chord: root, third, fifth, seventh (p.436). */
export function stackedSeventhChord(scale: PitchScale, rootMidiNote: number, rootDegree: number): number[] {
  return [0, 2, 4, 6].map((offset) => midiNoteForDegree(scale, rootMidiNote, rootDegree + offset));
}

/** The plain (non-voice-led) progression for a sequence of root-degrees. */
export function seventhChordProgression(scale: PitchScale, rootMidiNote: number, rootDegrees: readonly number[]): number[][] {
  return rootDegrees.map((degree) => stackedSeventhChord(scale, rootMidiNote, degree));
}

export type SeventhFunction = "root" | "third" | "fifth" | "seventh";

export interface SeventhVoicing {
  root: number;
  third: number;
  fifth: number;
  seventh: number;
}

/** C3: "the seventh alone" -- 1->3->5->7->1 (p.436, Figure 117). */
const CLOCKWISE_SEVENTH_NEXT: Record<SeventhFunction, SeventhFunction> = {
  root: "third",
  third: "fifth",
  fifth: "seventh",
  seventh: "root",
};
/** C7: "the seventh, the fifth, and the third" -- the exact mirror, 1->7->5->3->1 (p.437, Figure 119). */
const COUNTERCLOCKWISE_SEVENTH_NEXT: Record<SeventhFunction, SeventhFunction> = {
  root: "seventh",
  seventh: "fifth",
  fifth: "third",
  third: "root",
};
/** C5: "the seventh and the fifth" -- a double-swap, 1<->5 and 3<->7, not a 4-cycle (p.437, Figure 118). */
const CROSSWISE_SEVENTH_NEXT: Record<SeventhFunction, SeventhFunction> = {
  root: "fifth",
  fifth: "root",
  third: "seventh",
  seventh: "third",
};

/**
 * Section C: "the negative system is in reality a geometrical inversion of
 * the positive system... clockwise transformations become counterclockwise
 * and vice versa" (p.443); read with positive chords, "the C-3 requires
 * the ascending of 1; the C-5... of 1 and 3; the C-7... of 1, 3 and 5"
 * (p.444). So C-3 takes the counterclockwise map (Cmaj7 -> Em7, only c
 * moves, up to d), C-5 the crosswise one, C-7 the clockwise one.
 */
function nextMapForCycle(cycle: SignedSeventhCycle): Record<SeventhFunction, SeventhFunction> {
  if (cycle === 3 || cycle === -7) return CLOCKWISE_SEVENTH_NEXT;
  if (cycle === 7 || cycle === -3) return COUNTERCLOCKWISE_SEVENTH_NEXT;
  return CROSSWISE_SEVENTH_NEXT;
}

/** Transforms `voicing` into the next seventh-chord (rooted at `nextRootDegree`) via the cycle's own voice-leading map. */
export function transformSeventhVoicing(
  voicing: SeventhVoicing,
  scale: PitchScale,
  rootMidiNote: number,
  nextRootDegree: number,
  cycle: SignedSeventhCycle,
): SeventhVoicing {
  const [nextRoot, nextThird, nextFifth, nextSeventh] = stackedSeventhChord(scale, rootMidiNote, nextRootDegree);
  const pitchClassFor: Record<SeventhFunction, number> = { root: nextRoot, third: nextThird, fifth: nextFifth, seventh: nextSeventh };
  const nextMap = nextMapForCycle(cycle);

  const next = {} as SeventhVoicing;
  (Object.keys(pitchClassFor) as SeventhFunction[]).forEach((fn) => {
    const newFn = nextMap[fn];
    next[newFn] = nearestPitch(voicing[fn], pitchClassFor[newFn]);
  });
  return next;
}

/** Builds a full voice-led progression of seventh-chords for a sequence of root-degrees (typically from `seventhCycle`). */
export function seventhVoiceLeadProgression(
  scale: PitchScale,
  rootMidiNote: number,
  rootDegrees: readonly number[],
  cycle: SignedSeventhCycle,
): SeventhVoicing[] {
  const [root, third, fifth, seventh] = stackedSeventhChord(scale, rootMidiNote, rootDegrees[0]);
  let current: SeventhVoicing = { root, third, fifth, seventh };
  const progression: SeventhVoicing[] = [current];
  for (let i = 1; i < rootDegrees.length; i++) {
    current = transformSeventhVoicing(current, scale, rootMidiNote, rootDegrees[i], cycle);
    progression.push(current);
  }
  return progression;
}

/** "A seventh-chord, including all of its inversions, has 24 positions altogether" (p.436): 4! orders of 1, 3, 5, 7. */
export const SEVENTH_CHORD_POSITIONS = 24;

/**
 * Section B, the resolution S(7) -> S(5) (p.439-440): "the function which
 * would otherwise have become a seventh in the continuity of
 * seventh-chords now becomes a root-tone." So it is the cycle's own map
 * with 7 replaced by 1 -- for C3, 7->1 5->1 3->5 1->3 (Figure 127) -- and
 * the triad that results has the normal doubled root. "Do not move S(7)
 * -> S(5) in C0."
 */
export function seventhResolutionMap(cycle: SeventhCycleType): Record<SeventhFunction, "root" | "third" | "fifth"> {
  const next = nextMapForCycle(cycle);
  const resolved = {} as Record<SeventhFunction, "root" | "third" | "fifth">;
  (Object.keys(next) as SeventhFunction[]).forEach((fn) => (resolved[fn] = next[fn] === "seventh" ? "root" : next[fn]));
  return resolved;
}

/** Resolves a seventh-chord voicing into the triad on `nextRootDegree`: each voice takes its function by `seventhResolutionMap`, at the nearest pitch. */
export function resolveSeventhVoicing(
  voicing: SeventhVoicing,
  scale: PitchScale,
  rootMidiNote: number,
  nextRootDegree: number,
  cycle: SeventhCycleType,
): { from: SeventhFunction; to: "root" | "third" | "fifth"; pitch: number }[] {
  const [root, third, fifth] = stackedSeventhChord(scale, rootMidiNote, nextRootDegree);
  const target = { root, third, fifth };
  const map = seventhResolutionMap(cycle);
  return (["root", "third", "fifth", "seventh"] as SeventhFunction[]).map((fn) => ({
    from: fn,
    to: map[fn],
    pitch: nearestPitch(voicing[fn], target[map[fn]]),
  }));
}

export type PreparationMethod = "suspending" | "descending" | "ascending";

/**
 * Section B.1, preparing S(7) from S(5) (p.440-441): one function of the
 * triad is held over the bar line (suspending), or moved a step down or
 * up, and becomes the seventh of the next chord, whose root is therefore
 * six degrees below it. The cycle that results is the book's Figure 129:
 * suspending 1, 3, 5 gives C7, C5, C3 -- "the only [method] producing the
 * positive cycles"; descending gives C0, C-3, C-5; ascending C-3, C-5,
 * C-7. "The preparation of S(7) may be either positive or negative; the
 * resolution is always positive."
 */
export function seventhPreparationCycle(method: PreparationMethod, from: 1 | 3 | 5): 0 | SignedCycleType {
  const move = method === "suspending" ? 0 : method === "descending" ? -1 : 1;
  const toneDegree = from - 1 + move;
  return cycleBetween(0, toneDegree - 6);
}
