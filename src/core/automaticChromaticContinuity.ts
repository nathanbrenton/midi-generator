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
 * The rest of the chapter (p.546-551) generalizes the moves:
 * `continuityFromMoves` takes any group of simultaneous moves -- single
 * voices, pairs (Figure 288's "combinations out of three elements, taken
 * two at a time... = 3"), a pair compensated by the remaining voice
 * (Figure 289), three and one in four parts -- and repeats it until the
 * chord returns an octave away. The one condition the book insists on is
 * equal participation: "the direction can be changed only after all
 * three voices have performed their moves" (p.548); "the direction may
 * be changed only after the participation of all four voices in equal
 * quantities" (p.549) -- a group in which every voice moves the same
 * number of times transposes the structure ("identical S", Figure 292).
 * Four-part harmony starts from any of the seven S(7) structures: "4 x 12
 * = 48 chords for the descending and as many for the ascending
 * progressions... 7 x 24 x 2 = 336 forms" (`fourPartFormCount`).
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

/**
 * Repeats a group of simultaneous moves (each a list of voice indices
 * that step a semitone together, in `direction`) until the chord has
 * moved a full octave, returning every chord including the closing one.
 * Every voice must move equally often in the group -- otherwise the
 * structure would not return and, by the book's rule, the direction could
 * not change at the group's end.
 */
export function continuityFromMoves(start: readonly number[], group: readonly (readonly number[])[], direction: ChromaticDirection): number[][] {
  const counts = start.map((_, voice) => group.filter((move) => move.includes(voice)).length);
  if (counts.some((c) => c !== counts[0]) || counts[0] === 0) {
    throw new Error("every voice must move equally often in a group");
  }
  const delta = direction === "down" ? -1 : 1;
  const repetitions = 12 / counts[0];
  if (!Number.isInteger(repetitions)) throw new Error("a group must move each voice a divisor of 12 times");
  const chords = [[...start]];
  let current = [...start];
  for (let r = 0; r < repetitions; r++) {
    for (const move of group) {
      current = current.map((pitch, voice) => (move.includes(voice) ? pitch + delta : pitch));
      chords.push(current);
    }
  }
  return chords;
}

/** Four-part harmony (p.548): 7 S(7) structures x 24 orders of SATB x 2 directions = 336. */
export function fourPartFormCount(): number {
  const orders = generalPermutationsOf(["S", "A", "T", "B"]).length;
  return 7 * orders * 2;
}
