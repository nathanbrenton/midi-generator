/**
 * Classifies pitch content into Schillinger's Theory of Pitch-Scales
 * groups (Book II, Ch. 1, p.101) and, for two-unit scales, the specific
 * interval (Book II, Ch. 2B, p.103). Both tables confirmed verbatim
 * against the book (see project memory) — see tests/pitchClassification.test.mjs.
 *
 * The book's Group One/Two split is about *actual performed range*
 * (Group One: one root-tone, range ≤11; Group Two: one root-tone, range
 * over an octave), not about how many distinct pitch classes are
 * present — two pitch classes an octave-plus apart (e.g. C3 and D4) are
 * still Group Two. Folding to pitch class before classifying (the
 * earlier approach) throws that information away, so classifyScaleGroup
 * now takes the actual MIDI note numbers.
 *
 * The Three/Four split ("more than one root-tone") is Schillinger's own
 * term for a *symmetric* scale — one built from equal division of the
 * octave, which by construction reads the same starting from more than
 * one of its own pitches. That's exactly what scales.ts's
 * symmetricDivisionScale already generates for the exact divisors of 12
 * (2, 3, 4, 6, 12); a pitch-class set is classified as Group Three/Four
 * when it matches one of those shapes at any rotation, and defaults to
 * Group One/Two (the general, non-symmetric case Book II Ch.2 covers)
 * otherwise. This is a reasonable, book-grounded default, not a
 * guarantee — an unusual non-symmetric collection Schillinger would
 * classify differently for reasons outside this table isn't ruled out.
 */

import { symmetricDivisionScale } from "./scales.ts";

export type ScaleGroup = 1 | 2 | 3 | 4;

export interface ScaleGroupResult {
  group: ScaleGroup;
  rootToneCount: "one" | "more than one";
  range: number;
  /** The equal-division count (3 = augmented, 4 = diminished, 6 = whole tone, ...) when the match is symmetric. */
  symmetricDivision: number | null;
  label: string;
}

const TWO_UNIT_INTERVAL_LABELS: Readonly<Record<number, string>> = {
  1: "minor second (m2)",
  2: "major second (M2)",
  3: "minor third (m3)",
  4: "major third (M3)",
  5: "perfect fourth (P4)",
  6: "augmented fourth / diminished fifth / tritone (A4, d5)",
  7: "perfect fifth (P5)",
  8: "minor sixth (m6)",
  9: "major sixth (M6)",
  10: "minor seventh (m7)",
  11: "major seventh (M7)",
};

/** Exact equal divisors of 12 — the unambiguous "symmetric" scale family (Book II's Third/Fourth Group). */
const SYMMETRIC_DIVISIONS = [2, 3, 4, 6, 12];

/** Reduces MIDI note numbers to their distinct pitch classes (0-11), sorted. */
export function pitchClassesFromMidiNotes(midiNotes: readonly number[]): number[] {
  return [...new Set(midiNotes.map((note) => ((note % 12) + 12) % 12))].sort((a, b) => a - b);
}

function intervalsFromRoot(pitchClasses: readonly number[], root: number): number[] {
  return pitchClasses.map((pc) => ((pc - root + 12) % 12)).sort((a, b) => a - b);
}

/**
 * Checks whether `pitchClasses` is an exact equal division of the octave
 * (Book II's symmetric scale family) at any rotation — a symmetric
 * scale's defining property is that it reads the same shape starting
 * from more than one of its own pitches, so every pitch class is tried
 * as a candidate root.
 */
export function matchesSymmetricDivision(pitchClasses: readonly number[]): number | null {
  for (const division of SYMMETRIC_DIVISIONS) {
    if (pitchClasses.length !== division) continue;
    const target = symmetricDivisionScale(division).degrees;
    for (const root of pitchClasses) {
      if (intervalsFromRoot(pitchClasses, root).every((value, i) => value === target[i])) {
        return division;
      }
    }
  }
  return null;
}

/**
 * Classifies pitch content into one of the four scale groups, from the
 * actual MIDI note numbers (not pre-folded pitch classes, so real range
 * beyond one octave is preserved).
 */
export function classifyScaleGroup(midiNotes: readonly number[]): ScaleGroupResult | null {
  if (midiNotes.length === 0) return null;

  const pitchClasses = pitchClassesFromMidiNotes(midiNotes);
  const range = Math.max(...midiNotes) - Math.min(...midiNotes);
  const symmetricDivision = matchesSymmetricDivision(pitchClasses);

  if (symmetricDivision != null) {
    const group: ScaleGroup = range <= 12 ? 3 : 4;
    return {
      group,
      rootToneCount: "more than one",
      range,
      symmetricDivision,
      label: `Group ${group === 3 ? "Three" : "Four"}: more than one root-tone (symmetric ÷${symmetricDivision}), range ${range}`,
    };
  }

  const group: ScaleGroup = range <= 11 ? 1 : 2;
  return {
    group,
    rootToneCount: "one",
    range,
    symmetricDivision: null,
    label: `Group ${group === 1 ? "One" : "Two"}: one root-tone, range ${range}`,
  };
}

/**
 * For an exactly-2-pitch-class scale, the named interval from the book's
 * two-unit scale table (1-11) — measured straight up from the lower pitch
 * class, matching the book's "constructed from c" convention (c-g is 7,
 * P5, not folded down to its 5-semitone complement).
 */
export function twoUnitScaleLabel(pitchClasses: readonly number[]): string | null {
  if (pitchClasses.length !== 2) return null;
  const interval = Math.abs(pitchClasses[1] - pitchClasses[0]);
  return TWO_UNIT_INTERVAL_LABELS[interval] ?? null;
}
