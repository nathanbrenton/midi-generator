/**
 * Book III (Variations of Music by Means of Geometrical Projection) in
 * Schillinger's own symbols.
 *
 *   import * as G from "./notation/geometricalProjection.ts";
 *   G.position("d", melody, 67)   // ⓓ: forward, upside down around g
 *   G.expand(melody, 60, 2)       // 2p: every interval doubled
 *   G.formatCoefficient(2, "p")   // "2p"
 *   G.formatUnit(3)               // "∜2" -- 3p's unit is a minor third
 *
 * Symbol table:
 *
 *   Ch.1  positions ⓐ ⓑ ⓒ ⓓ, axis of inversion         POSITIONS, position, invert
 *   Ch.2  p, 2p, 3p ... (pitch); t, 2t, 3t ... (time)   expand, expandTime, formatCoefficient, formatUnit
 */

import { geometricalPosition, invertPitch, type GeometricalPosition, type TimedNote } from "../geometricalInversions.ts";
import { expandPitch, expandTime as expandTimeOf } from "../geometricalExpansions.ts";
import { formatRoot, superscript } from "./format.ts";

export type { GeometricalPosition };

/** The four geometrical positions, as the book marks them (p.185-188). */
export const POSITIONS: Readonly<Record<GeometricalPosition, { mark: string; description: string }>> = {
  a: { mark: "ⓐ", description: "the original" },
  b: { mark: "ⓑ", description: "backwards" },
  c: { mark: "ⓒ", description: "backwards and upside down" },
  d: { mark: "ⓓ", description: "forwards and upside down" },
};

/** A melody in one of the four positions, upside-down forms reflected around the axis of inversion. */
export function position<T extends TimedNote>(which: GeometricalPosition, notes: readonly T[], axis: number): T[] {
  return geometricalPosition(notes, axis, which);
}

/** One pitch reflected around the axis of inversion: 2·axis − pitch (p.199). */
export function invert(pitch: number, axis: number): number {
  return invertPitch(pitch, axis);
}

/** kp: every pitch's distance from the axis multiplied by k (p.208-209); k < 1 contracts. */
export function expand<T extends { midiNote: number }>(notes: readonly T[], axis: number, k: number): T[] {
  return expandPitch(notes, axis, k);
}

/** kt: every start and duration multiplied by k (p.213-214). */
export function expandTime<T extends { startUnits: number; durationUnits: number }>(notes: readonly T[], k: number): T[] {
  return expandTimeOf(notes, k);
}

/** "p", "2p", "3t" -- the coefficient as the book writes it ("pt represents the original"). */
export function formatCoefficient(k: number, axis: "p" | "t"): string {
  return k === 1 ? axis : `${k}${axis}`;
}

/**
 * The pitch-unit a coefficient produces, in the book's root notation:
 * 2p makes the semitone a whole tone, ⁶√2; 3p gives ∜2 (the diminished
 * seventh's unit); 4p gives ∛2; 6p gives √2 (p.208-211). Coefficients that
 * don't divide 12 have no simpler root than (¹²√2)ᵏ, written ¹²√2ᵏ.
 */
export function formatUnit(k: number): string {
  if (12 % k === 0) return formatRoot(12 / k);
  return `${formatRoot(12)}${superscript(String(k))}`;
}
