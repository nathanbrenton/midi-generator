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
 * Hand-verified before coding (matching Figure 117's own worked example):
 * a Cmaj7 {C4=60, E4=64, G4=67, B4=71} under C3 (root degree +2, matching
 * the existing `CYCLE_STEPS[3]=2`) produces next-chord pitch classes
 * {E,G,B,D} via the clockwise map with `nearestPitch` -- exactly Em7,
 * matching the book's own Figure 117 chord sequence (7 -> 6/5 -> 4/3 -> 2
 * -> 7, cycling through all four inversions before repeating, consistent
 * with a 4-cycle mapping).
 *
 * The "one/two/three movements" language describes how many of the four
 * relabeled voices need an actual downward step (the rest arrive via
 * `nearestPitch`'s already-minimal movement) -- explanatory, not a
 * separate parameter this module needs to track.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { nearestPitch } from "./diatonicHarmony.ts";

export type SeventhCycleType = 3 | 5 | 7;

/** Scale-degree step for each cycle -- reuses the same intervals as Ch.2's triad cycles (p.362-363, extended to sevenths). */
const SEVENTH_CYCLE_STEPS: Record<SeventhCycleType, number> = { 3: 2, 5: 4, 7: 6 };

/** One full diatonic cycle of seventh-chord roots, mirroring `diatonicCycle` for triads. */
export function seventhCycle(cycleType: SeventhCycleType, startDegree = 0): number[] {
  const step = SEVENTH_CYCLE_STEPS[cycleType];
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

function nextMapForCycle(cycle: SeventhCycleType): Record<SeventhFunction, SeventhFunction> {
  if (cycle === 3) return CLOCKWISE_SEVENTH_NEXT;
  if (cycle === 7) return COUNTERCLOCKWISE_SEVENTH_NEXT;
  return CROSSWISE_SEVENTH_NEXT;
}

/** Transforms `voicing` into the next seventh-chord (rooted at `nextRootDegree`) via the cycle's own voice-leading map. */
export function transformSeventhVoicing(
  voicing: SeventhVoicing,
  scale: PitchScale,
  rootMidiNote: number,
  nextRootDegree: number,
  cycle: SeventhCycleType,
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
  cycle: SeventhCycleType,
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
