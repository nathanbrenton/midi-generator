/**
 * Book IV, Chapters 5-6: Superimposition of Pitch and Time on the Axes;
 * Composition of Melodic Continuity.
 *
 * Chapter 6 opens with an 8-item list of ways a melody built from
 * secondary axes (Ch. 3) can be varied -- permuting the axes' own order,
 * circularly permuting pitch-units within one axis, geometrically
 * inverting the whole melody or individual axis-segments, tonally
 * expanding the whole melody or individual segments (with *different*
 * coefficients per segment), and any combination of these (p.313).
 * Every one of these turns out to be a thin composition of primitives
 * already built and tested elsewhere in this project -- (1) is
 * `generalPermutationsOf` (used for the same purpose already, Book II
 * Ch. 4's axis-continuity fix); (2) is `circularPermutations` (Ch. 9);
 * (3)/(4)/(7)/(8) are Book III Ch. 1's `geometricalPosition`; (5)/(6) are
 * Book III Ch. 2's `expandPitch`. `buildMelodicContinuity` composes all
 * of these per-segment, exactly as items 4/6/8 describe ("different axes
 * may appear with different coefficients of expansion").
 *
 * The chapter's own worked combinatorics (p.313, rendered as a page image
 * since the OCR text mangled it) is the one genuinely new formula: "each
 * of the individual axes has four geometrical inversions. Thus, the
 * number of combinations of the three axes... equals 4^3 = 64." This
 * generalizes cleanly to `axisInversionCombinationCount(N) = 4^N` for any
 * number of axis-segments. The book's own further claim ("if any axis
 * appears in three forms of tonal expansion, the entire quantity will be
 * 64^3 = 262,144") is NOT implemented -- the derivation of cubing 64
 * again for expansion isn't reconstructable from the surrounding text
 * with confidence, unlike the first (verified) formula.
 *
 * Chapter 5's own Section A worked example (p.299, also page-image
 * verified) composes a segment's *internal* rhythm from already-built
 * Book I machinery directly -- "r4÷3, or (2+1+1)^2, or any of the
 * variations, i.e. the permutations or the resultants" cites Book I's
 * binary-synchronization resultants and Ch. 12's `distributivePower`
 * literally by name, not a new formula. Section B (sin/cos "forms of
 * trajectorial motion," "ascribed vs. inscribed" sine/cosine phase
 * choice, the psychological circle of Ch. 4) are vocabulary/labeling
 * frameworks without a checkable numeric formula, and Chapter 4 in full
 * was already confirmed the same way -- both left undocumented as code.
 */

import { buildAxialMelody, type AxialTerm, type TimedNote } from "./melodicAxes.ts";
import { geometricalPosition, type GeometricalPosition } from "./geometricalInversions.ts";
import { expandPitch } from "./geometricalExpansions.ts";
import { generalPermutationsOf } from "./permutations.ts";

/** 4^N: every axis-segment independently choosing one of Book III Ch.1's 4 geometrical positions (p.313). Verified: 3 segments -> 4^3=64. */
export function axisInversionCombinationCount(segmentCount: number): number {
  return Math.pow(4, segmentCount);
}

export interface ContinuitySegmentSpec {
  term: AxialTerm;
  /** Which of Book III Ch.1's 4 geometrical positions to apply to this segment. */
  position: GeometricalPosition;
  /** Tonal-expansion coefficient for this segment only (Book III Ch.2); defaults to 1 (no expansion). */
  expansionCoefficient?: number;
}

/**
 * Builds one axis-segment (Ch.3's `buildAxialMelody` applied to a single
 * term, always starting fresh from the primary axis), then applies this
 * segment's own tonal-expansion coefficient and geometrical position --
 * "different axes may appear with different coefficients of expansion"
 * (item 6, p.313) combined with "geometrical convertibility of portions
 * of melody pertaining to individual secondary axes" (item 4).
 */
export function buildContinuitySegment(spec: ContinuitySegmentSpec, primaryAxisPitch: number, timeUnit: number): TimedNote[] {
  const raw = buildAxialMelody([spec.term], primaryAxisPitch, timeUnit);
  const expanded = expandPitch(raw, primaryAxisPitch, spec.expansionCoefficient ?? 1);
  return geometricalPosition(expanded, primaryAxisPitch, spec.position);
}

/**
 * Builds every segment independently (its own inversion and expansion,
 * item 8's "combined application... to portions of melody"), then
 * concatenates them in time -- "permutability of the secondary axes with
 * their respective melodies in time continuity" (item 1) is the caller's
 * own choice of `segments` order, since `generalPermutationsOf` (reused
 * from Book II Ch.4's own fix) already generates every ordering.
 */
export function buildMelodicContinuity(
  segments: readonly ContinuitySegmentSpec[],
  primaryAxisPitch: number,
  timeUnit: number,
): TimedNote[] {
  const notes: TimedNote[] = [];
  let cursor = 0;
  for (const spec of segments) {
    const segmentNotes = buildContinuitySegment(spec, primaryAxisPitch, timeUnit);
    const segmentSpan = Math.max(0, ...segmentNotes.map((n) => n.startUnits + n.durationUnits));
    for (const note of segmentNotes) {
      notes.push({ ...note, startUnits: note.startUnits + cursor });
    }
    cursor += segmentSpan;
  }
  return notes;
}

/** Every ordering of `segments` as elements of one continuity -- item 1 (p.313), reusing the same permutation machinery as Book II Ch.4's axial continuity. */
export function continuityOrderings(segments: readonly ContinuitySegmentSpec[]): ContinuitySegmentSpec[][] {
  return generalPermutationsOf(segments);
}
