/**
 * Book V, Chapter 16, Section A: Automatic Chromatic Continuities, In
 * Three-Part Harmony (p.544-545).
 *
 * "Automatic chromatic continuity may be devised by means of semitonal
 * motion in which one direction is followed by whatever voice or voices
 * happen to be moving." Rendering Figure 286 (PDF p.299) resolved the
 * exact mechanic, since the prose summary alone ("three modifications to
 * each group... each succeeding group starts one semitone lower... 3x12
 * = 36 groups") is compressed enough to admit more than one reading:
 * each of the 3 upper voices of a plain S(5) triad (Soprano=fifth,
 * Alto=third, Tenor=root -- SATB register order applied to a bare
 * triad) is, in a chosen order, chromatically altered ONE AT A TIME and
 * the alterations ACCUMULATE within a "group": modification 1 alters
 * only the first voice in the order; modification 2 alters that voice
 * AND the second; modification 3 alters all three (which is exactly the
 * whole triad transposed by one semitone -- confirmed directly in the
 * figure: the slur/bracket groups three chords at a time, and the third
 * chord of each group is visibly the same shape as the first, one
 * semitone over). The next group then starts fresh from the ORIGINAL
 * structure transposed one semitone further in the same direction, not
 * from wherever modification 3 left off (they're the same chord anyway).
 * After 12 such groups (one full octave of transposition), chord 37
 * coincides exactly with chord 1 -- "closes at 36+1, i.e. on the 37th
 * chord," confirmed directly by this module's own construction (group 11,
 * modification 3 = the structure transposed by 12 semitones = the same
 * pitch classes as the start).
 *
 * "SAT produce 6 variations of the sequence for each form of intonation"
 * -- the 6 orderings of which voice gets altered first/second/third,
 * reusing `generalPermutationsOf` (Book I Ch.9) on the 3 voice labels,
 * the same combinatorial primitive used everywhere else in this project.
 * "4S produce 4 forms of intonation" is Ch.3's own 4 symmetric structures
 * (`S5_STRUCTURES`). "The 2 directions... double the quantity": total
 * = 4 x 6 x 2 = 48, matching the book's own stated total exactly.
 *
 * Honest scope note: the chapter goes on to describe moving 2 of the 3
 * voices simultaneously ("the number of combinations out of three
 * elements, taken two at a time... = 3") and gives a worked table
 * (Figure 288) of the 6 possible orderings of those 3 pairs -- the
 * combinatorial COUNT (3) is confirmed and trivial (`generalPermutationsOf`
 * on 2-element subsets), but the exact chord-by-chord realization wasn't
 * built here; a natural next step.
 */

import { S5_STRUCTURES, type StructureId } from "./symmetricHarmony.ts";
import { generalPermutationsOf } from "./permutations.ts";

export type Voice = "S" | "A" | "T";
export const VOICES: readonly Voice[] = ["S", "A", "T"];

/** The 6 orderings of which voice moves first/second/third within a group (p.545: "SAT, STA, TSA, AST, ATS, TAS"). */
export function voiceOrders(): Voice[][] {
  return generalPermutationsOf(VOICES);
}

export type ChromaticDirection = "up" | "down";

export interface ChromaticContinuityStep {
  /** Which of the 12 semitone-transposition groups this chord belongs to. */
  group: number;
  /** Which of the 3 cumulative modifications within the group (1, 2, or 3 voices altered so far). */
  modification: 1 | 2 | 3;
  pitches: Record<Voice, number>;
}

/**
 * Builds the full 36-chord automatic chromatic continuity (p.544-545):
 * a plain S(5) triad (Soprano=fifth, Alto=third, Tenor=root), with the
 * voices in `order` chromatically altered one at a time, cumulatively,
 * within each of 12 semitone-transposed groups.
 */
export function automaticChromaticContinuity(
  structure: StructureId,
  order: readonly [Voice, Voice, Voice],
  direction: ChromaticDirection,
  rootMidiNote: number,
): ChromaticContinuityStep[] {
  const delta = direction === "down" ? -1 : 1;
  const [thirdInterval, fifthStep] = S5_STRUCTURES[structure].intervals;
  const baseT = rootMidiNote;
  const baseA = rootMidiNote + thirdInterval;
  const baseS = rootMidiNote + thirdInterval + fifthStep;

  const steps: ChromaticContinuityStep[] = [];
  for (let group = 0; group < 12; group++) {
    const groupOffset = group * delta;
    const groupBase: Record<Voice, number> = { T: baseT + groupOffset, A: baseA + groupOffset, S: baseS + groupOffset };
    for (let modification = 1; modification <= 3; modification++) {
      const pitches = { ...groupBase };
      for (let i = 0; i < modification; i++) pitches[order[i]] += delta;
      steps.push({ group, modification: modification as 1 | 2 | 3, pitches });
    }
  }
  return steps;
}

/** The book's own total form-count (p.545): 4 structures x 6 voice-orders x 2 directions = 48. */
export function automaticContinuityFormCount(): number {
  return Object.keys(S5_STRUCTURES).length * voiceOrders().length * 2;
}
