/**
 * Book IV (Theory of Melody) in Schillinger's own symbols -- chiefly his
 * notation system itself (Ch.2, "Preliminary Discussion of Notation,"
 * p.239-243), plus the axial expressions of Ch.3.
 *
 *   import * as M from "./notation/melody.ts";
 *   M.formatTimeGroup([3, 1, 1, 1])        // "6/6 = 3t₁/6 + t₂/6 + t₃/6 + t₄/6"
 *   M.formatPitchMotion([60, 65, 62, 67, 60]) // "5p − 3p + 5p − 7p"
 *   M.parseAxes("a2T2P + bTP")             // [{axis:"a",T:2,P:2}, {axis:"b",T:1,P:1}]
 *   M.INTENSITY_SCALES[5]                  // i, 2i, 3i, 4i, 6i -- pp p mf f ff
 *
 * The book's four components, each measured from a minimum unit:
 *   time       t (the common denominator), τ (a unit of deviation), T = t/t = 1
 *              (the group as unity); terms t₁ … tₙ keep their place through variations
 *   pitch      p (the semitone, the unit of ¹²√2), signed for direction; P a pitch
 *              range, split among axes as P₁, P₂ …
 *   intensity  i₁ = i, i₂ = 2i, i₃ = 3i …; rests i₀ = 0i
 *   quality    q₁ = q, q₂ = 2q …, harmonic saturation from "oo" to "ee"
 *   and dt, dp, di, dq for continuous deviations from those scales.
 *
 * Symbol table: Ch.2 time -- timeFractions, timeTerms, formatTimeGroup,
 * formatTerms; pitch -- pitchMotion, formatPitchMotion, range,
 * partialRanges; intensity -- INTENSITY_SCALES, formatIntensity; quality --
 * QUALITY_SCALES, QUALITY_LIMITS, formatQuality; DIFFERENTIALS.
 * Ch.3 axes 0 a b c d, "a2T2P + bTP" -- parseAxes, formatAxes, toAxialTerms.
 * Ch.5-6 4ⁿ geometrical-position combinations -- positionCombinations.
 * Ch.8 spirals -- spiralBasic, spiralDeveloped, spiralExtended.
 */

import type { AxialTerm, AxisType } from "../melodicAxes.ts";
import { axisInversionCombinationCount } from "../melodicContinuity.ts";
import { spiralSequenceBasic, spiralSequenceDeveloped, spiralSequenceExtended } from "../organicMelody.ts";
import { subscript } from "./format.ts";

const sum = (values: readonly number[]) => values.reduce((s, v) => s + v, 0);
const coefficient = (k: number, unit: string) => (k === 1 ? unit : `${k}${unit}`);

// ---- Ch.2: time ------------------------------------------------------------

/** T = t/t = 1: "every bar representing a group will always correspond to unity" (p.239). */
export const T = 1;

/** Every value as a rational fraction of the group: 3+1+1+1 -> 3/6, 1/6, 1/6, 1/6 (p.239). */
export function timeFractions(durations: readonly number[]): { numerator: number; denominator: number }[] {
  const denominator = sum(durations);
  return durations.map((numerator) => ({ numerator, denominator }));
}

/** A term with its place in the original group: 3t₁ is { coefficient: 3, position: 1 }. */
export interface TimeTerm {
  coefficient: number;
  position: number;
}

/** "The consecutive enumeration of such terms will be expressed by t₁, t₂ … tₙ" (p.239). */
export function timeTerms(durations: readonly number[]): TimeTerm[] {
  return durations.map((coefficient, i) => ({ coefficient, position: i + 1 }));
}

/**
 * Writes terms as the book does, keeping each term's original position
 * through any variation: [t₃, 3t₁, t₂, t₄] -> "6/6 = t₃/6 + 3t₁/6 + t₂/6 + t₄/6"
 * -- "the original third term now appears in the first place" (p.240).
 * Without a denominator: "t₃ + 3t₁ + t₂ + t₄".
 */
export function formatTerms(terms: readonly TimeTerm[], denominator?: number): string {
  const body = terms
    .map((term) => {
      const t = coefficient(term.coefficient, `t${subscript(String(term.position))}`);
      return denominator === undefined ? t : `${t}/${denominator}`;
    })
    .join(" + ");
  return denominator === undefined ? body : `${denominator}/${denominator} = ${body}`;
}

/** A duration group in the book's fractional notation: [3,1,1,1] -> "6/6 = 3t₁/6 + t₂/6 + t₃/6 + t₄/6". */
export function formatTimeGroup(durations: readonly number[]): string {
  return formatTerms(timeTerms(durations), sum(durations));
}

// ---- Ch.2: pitch -----------------------------------------------------------

/** Signed motion between consecutive pitches, in p: ascending positive, descending negative (p.240-241). */
export function pitchMotion(midiNotes: readonly number[]): number[] {
  return midiNotes.slice(1).map((note, k) => note - midiNotes[k]);
}

/** c-f-d-g-c -> "5p − 3p + 5p − 7p" (p.241). */
export function formatPitchMotion(midiNotes: readonly number[]): string {
  return pitchMotion(midiNotes)
    .map((step, k) => {
      const magnitude = coefficient(Math.abs(step), "p");
      if (k === 0) return step < 0 ? `−${magnitude}` : magnitude;
      return `${step < 0 ? "−" : "+"} ${magnitude}`;
    })
    .join(" ");
}

/** P, the pitch range a melody spans, in p. */
export function range(midiNotes: readonly number[]): number {
  return Math.max(...midiNotes) - Math.min(...midiNotes);
}

/**
 * Splits a range into partial ranges P₁, P₂ … of the given sizes, one per
 * axis: 15p over three axes is P₁ = P₂ = P₃ = 5p (c-f, f-bb, bb-eb'); 12p
 * may split unevenly, P₁ = 5, P₂ = 7 (p.241, 268).
 */
export function partialRanges(low: number, sizes: readonly number[]): { label: string; from: number; to: number; size: number }[] {
  let from = low;
  return sizes.map((size, k) => {
    const part = { label: `P${subscript(String(k + 1))}`, from, to: from + size, size };
    from += size;
    return part;
  });
}

// ---- Ch.2: intensity and quality --------------------------------------------

export interface Degree {
  /** The degree's value in units: 3 for 3i. */
  units: number;
  name: string;
}

/**
 * The book's scales of intensity (p.241). As printed, the five-degree
 * scale's top step is 6i, not 5i -- a wider step at the loud end, in
 * keeping with the Weber-Fechner remark that opens the section. Rests are
 * i₀ = 0i.
 */
export const INTENSITY_SCALES: Readonly<Record<2 | 3 | 5, readonly Degree[]>> = {
  2: [
    { units: 1, name: "piano" },
    { units: 2, name: "forte" },
  ],
  3: [
    { units: 1, name: "piano" },
    { units: 2, name: "mezzo-forte" },
    { units: 3, name: "forte" },
  ],
  5: [
    { units: 1, name: "pianissimo" },
    { units: 2, name: "piano" },
    { units: 3, name: "mezzo-forte" },
    { units: 4, name: "forte" },
    { units: 6, name: "fortissimo" },
  ],
};

/** "i", "2i", and "0i" for a rest. */
export function formatIntensity(units: number): string {
  return units === 0 ? "0i" : coefficient(units, "i");
}

/** Scales of quality, q₁ = q, q₂ = 2q … (p.242). */
export const QUALITY_SCALES: Readonly<Record<2 | 3 | 5, readonly number[]>> = {
  2: [1, 2],
  3: [1, 2, 3],
  5: [1, 2, 3, 4, 5],
};

/** The limits of harmonic saturation the q scales measure between (p.242). */
export const QUALITY_LIMITS = {
  minimum: { wave: "one-component", organStop: "flute (tibia clausa)", vowel: "oo" },
  maximum: { wave: "oboe-like (predominant 5th, 7th and 13th harmonics)", organStop: "reed (English horn)", vowel: "ee" },
} as const;

/** "q", "3q". */
export function formatQuality(units: number): string {
  return coefficient(units, "q");
}

/** The differentials for continuous deviation from each scale (p.242). */
export const DIFFERENTIALS = { time: "dt", pitch: "dp", intensity: "di", quality: "dq" } as const;

// ---- Ch.3: axial expressions -------------------------------------------------

/** One term of an axial expression as the book writes it: "a2T2P" is { axis: "a", T: 2, P: 2 }. */
export interface AxisTermNotation {
  axis: AxisType;
  T?: number;
  P?: number;
}

/**
 * Parses the book's axial expressions: "a3T + a2T + aT" (time ratios,
 * p.262), "a3P + b2P + aP" (pitch ratios, p.274), "a2T2P + bTP"
 * (correlated, p.275). A coefficient left off means 1. Returns null when
 * the text isn't such an expression.
 */
export function parseAxes(text: string): AxisTermNotation[] | null {
  const tokens = text.split("+").map((s) => s.trim());
  const terms: AxisTermNotation[] = [];
  for (const token of tokens) {
    const match = token.match(/^([0abcd])(?:(\d*)T)?(?:(\d*)P)?$/);
    if (!match || (match[2] === undefined && match[3] === undefined)) return null;
    const [, axis, t, p] = match;
    const term: AxisTermNotation = { axis: axis as AxisType };
    if (t !== undefined) term.T = t === "" ? 1 : Number(t);
    if (p !== undefined) term.P = p === "" ? 1 : Number(p);
    terms.push(term);
  }
  return terms;
}

/** The inverse of `parseAxes`: [{a,2,2},{b,1,1}] -> "a2T2P + bTP". */
export function formatAxes(terms: readonly AxisTermNotation[]): string {
  return terms
    .map((term) => {
      const t = term.T === undefined ? "" : coefficient(term.T, "T");
      const p = term.P === undefined ? "" : coefficient(term.P, "P");
      return `${term.axis}${t}${p}`;
    })
    .join(" + ");
}

/**
 * Converts parsed terms into `buildAxialMelody`'s terms: T time-units each,
 * and P scaled by how many p one P stands for. On a or d, P is the
 * distance reached; on b or c it is the distance the term starts from,
 * leaping there and returning to the axis. Figures 33-37 settle this
 * (rendered: "a4P + bP + c3P" rises to +4, leaps to +1, falls to the axis,
 * leaps to -3, rises to the axis), so "a2T2P + bTP" ends on the axis -- b's
 * P is not a partial return.
 */
export function toAxialTerms(terms: readonly AxisTermNotation[], pPerP = 1): AxialTerm[] {
  return terms.map((term) => ({
    axis: term.axis,
    timeUnits: term.T ?? 1,
    pitchUnits: term.P === undefined ? undefined : term.P * pPerP,
  }));
}

// ---- Ch.5-6, Ch.8 -----------------------------------------------------------

/** Each axis-segment can take any of the four geometrical positions: 4ⁿ combinations (3 axes -> 64, p.313). */
export function positionCombinations(segments: number): number {
  return axisInversionCombinationCount(segments);
}

/** Basic spiral: series terms t, t+1, then t+3 descending -- First series from 5 gives 5, 8, −21 (p.341-343). */
export function spiralBasic(series: readonly number[], start: number): number[] {
  return spiralSequenceBasic(series, start);
}

/** Developed spiral: series terms t, t+1, t+2, then t+4 descending (p.345-346). */
export function spiralDeveloped(series: readonly number[], start: number): number[] {
  return spiralSequenceDeveloped(series, start);
}

/** Extended spiral: series terms t, t+1, t+2, then t+5 descending (p.350-352). */
export function spiralExtended(series: readonly number[], start: number): number[] {
  return spiralSequenceExtended(series, start);
}
