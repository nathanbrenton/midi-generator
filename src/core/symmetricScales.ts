/**
 * Book II, Chapter 7: Pitch-Scales -- The Third Group. Symmetrical Scales.
 *
 * Section A (Table of Symmetric Systems, p.149): the octave is split into
 * `t` equally-spaced tonics (t in {2,3,4,6,12}, the divisors of 12 the book
 * actually tables), each tonic being a root derived from the t-th root of
 * 2. `symmetricTonics` reuses `symmetricDivisionScale` (Book II Ch.1-2,
 * `scales.ts`) for these root pitches -- no new math there, same octave
 * division, just relabeled as "tonics" rather than scale degrees.
 *
 * Section B: a "sectional scale" fills the gap between one tonic and the
 * next (12/t semitones) with N positive-integer steps -- e.g. the book's
 * own Arabic "string of pearls" example, t=2 (tonics a tritone apart, a
 * 6-semitone gap), fills it with the 4-step composition (2,1,2,1) --
 * confirmed by hand: 2+1+2+1=6, matching the gap exactly.
 *
 * Section C (Composition of Melodic Continuity, p.152-153) gives an exact
 * counting table that this module's `compositionCount` and
 * `melodicFormCount` reproduce exactly. The OCR renders the exponents
 * illegibly (e.g. "62 equals 36"), but decoding them against N! and
 * binomial coefficients confirms the underlying formulas precisely --
 * every single one of the 20 tabulated numbers across all 5 tonic-count
 * tables (t=2,3,4,6,12) matches:
 *   - "Total number of scales" for an N-unit sectional scale on a `t`-tonic
 *     system = C(gap-1, N-1), where gap = 12/t -- the number of distinct
 *     ways to write `gap` as an ordered sum of N positive integers (a
 *     "composition"). Book's own t=2 table (gap=6): N=1..6 give
 *     1,5,10,10,5,1 = C(5,0..5) exactly, summing to 32 = 2^5, matching the
 *     book's own stated "Total number equals 32."
 *   - "Melodic forms" producible from an N-unit sectional scale replicated
 *     independently across all `t` tonics = (N!)^t -- book's own t=2,N=3:
 *     "6^2 equals 36" (3!=6, squared); t=3,N=4: "24^3 equals 13,824"
 *     (4!=24, cubed). All 20 tabulated values confirmed against this
 *     formula by hand before writing any code.
 *
 * The rest of Section C (worked melodic-continuity examples applying
 * circular permutation to a chosen sectional scale) and Section D
 * (historical/critical commentary) are compositional workflow, not
 * additional formulas -- the same scoping call made throughout this
 * project. Chapter 6 (Symmetric Distribution of Pitch-Units) is entirely
 * historical/cultural commentary on tuning traditions (Javanese, Siamese,
 * equal temperament) with no deterministic formula of its own, so it
 * contributes no core module.
 *
 * Book II, Chapter 8: Pitch-Scales -- The Fourth Group. Symmetrical Scales
 * of More Than One Octave in Range (p.163-165). The same "N tonics, each
 * gap filled by a composition" model as Ch.7, just spread across
 * `tonicCount - 1` octaves instead of confined to one: for tonicCount in
 * {3,4,6,12}, the book's own stated ranges are 2, 3, 5, and 11 octaves --
 * exactly tonicCount minus one in every case -- giving gap = (tonicCount-1)
 * * 12 / tonicCount semitones between adjacent tonics, which comes out to
 * an exact integer (8, 9, 10, 11) for all four of the book's own tabulated
 * systems. The book's own roots (cube root of 4, fourth root of 8, sixth
 * root of 32, twelfth root of 2048 -- decoded from badly garbled OCR by
 * matching the surviving digits 8/32/2048 against 2^(tonicCount-1)) confirm
 * the same formula from the frequency-ratio side: step ratio =
 * 2^((tonicCount-1)/tonicCount). Verified against both the book's own
 * worked tonic tables exactly: 3 tonics over 2 octaves gives C-Ab-E(-C1),
 * step 8 semitones; 4 tonics over 3 octaves gives C-A-F#-Eb(-C1), step 9.
 * `gapSemitones`/`compositionCount`/`melodicFormCount`/`generateCompositions`/
 * `buildCompoundSymmetricScale` all generalize unchanged -- they were never
 * tied to a single-octave gap, just to *a* gap, so the fourth group reuses
 * every one of them. Section B (Directional Units) is a specific worked
 * example (auxiliary tones around a chosen scale, illustrated via a
 * Gershwin quote) rather than a general reusable formula, so isn't
 * implemented.
 */

import { symmetricDivisionScale } from "./scales.ts";
import { intervalsToMidiNotes } from "./pitchScaleEvolution.ts";

/** The five tonic-count systems the book actually tables -- the divisors of 12 (p.149). */
export const TONIC_COUNTS = [2, 3, 4, 6, 12] as const;

/** Semitone gap between adjacent tonics of a `tonicCount`-tonic system. Always exact: 12 is divisible by every value in TONIC_COUNTS. */
export function gapSemitones(tonicCount: number): number {
  if (!Number.isInteger(tonicCount) || tonicCount < 1 || 12 % tonicCount !== 0) {
    throw new Error("tonicCount must be a divisor of 12");
  }
  return 12 / tonicCount;
}

/** The `tonicCount` root pitches (MIDI notes) of a symmetric system, one octave from `rootMidiNote`. */
export function symmetricTonics(tonicCount: number, rootMidiNote = 60): number[] {
  const scale = symmetricDivisionScale(tonicCount);
  return scale.degrees.map((degree) => rootMidiNote + degree);
}

/** The four Fourth Group tonic counts the book tables -- each paired with a fixed octave range (p.163). */
export const FOURTH_GROUP_TONIC_COUNTS = [3, 4, 6, 12] as const;

/** Octave range of a Fourth Group system: always tonicCount - 1, per the book's own four tabulated cases. */
export function fourthGroupRangeOctaves(tonicCount: number): number {
  if (!(FOURTH_GROUP_TONIC_COUNTS as readonly number[]).includes(tonicCount)) {
    throw new Error(`tonicCount must be one of ${FOURTH_GROUP_TONIC_COUNTS.join(", ")}`);
  }
  return tonicCount - 1;
}

/** Semitone gap between adjacent tonics of a Fourth Group system -- always an exact integer for the book's own four systems. */
export function fourthGroupGapSemitones(tonicCount: number): number {
  return (fourthGroupRangeOctaves(tonicCount) * 12) / tonicCount;
}

/** The `tonicCount` root pitches of a Fourth Group system, spanning `tonicCount - 1` octaves from `rootMidiNote`. */
export function fourthGroupTonics(tonicCount: number, rootMidiNote = 60): number[] {
  const step = fourthGroupGapSemitones(tonicCount);
  return Array.from({ length: tonicCount }, (_, i) => rootMidiNote + i * step);
}

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}

/** Number of distinct N-unit sectional scales (ordered compositions of `gap` into N positive parts) -- "Total number of scales" (p.152-153). */
export function compositionCount(gap: number, unitsPerSectionalScale: number): number {
  return binomialCoefficient(gap - 1, unitsPerSectionalScale - 1);
}

/** Melodic forms from an N-unit sectional scale independently permuted across `tonicCount` tonics: (N!)^tonicCount (p.152-153). */
export function melodicFormCount(unitsPerSectionalScale: number, tonicCount: number): number {
  return Math.pow(factorial(unitsPerSectionalScale), tonicCount);
}

/** Every ordered composition of `total` into exactly `parts` positive integers, in lexicographic order. */
export function generateCompositions(total: number, parts: number): number[][] {
  if (parts < 1 || total < parts) return [];
  if (parts === 1) return [[total]];
  const results: number[][] = [];
  for (let first = 1; first <= total - (parts - 1); first++) {
    for (const rest of generateCompositions(total - first, parts - 1)) {
      results.push([first, ...rest]);
    }
  }
  return results;
}

/**
 * Tiles one sectional-scale composition across every tonic of a symmetric
 * system, concatenated into a single continuous scale spanning the octave
 * (Section A/B's "compound symmetric scale," p.149-151) -- reuses
 * `intervalsToMidiNotes` per tonic, dropping each segment's final note
 * since it's identical to the next tonic (or the octave root on the last).
 */
export function buildCompoundSymmetricScale(tonics: readonly number[], composition: readonly number[]): number[] {
  const notes: number[] = [];
  for (const tonic of tonics) {
    const segment = intervalsToMidiNotes(tonic, composition);
    notes.push(...segment.slice(0, -1));
  }
  return notes;
}
