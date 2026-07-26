/**
 * Book I, Chapter 11: Composition of Homogeneous Rhythmic Continuity.
 *
 * Splits a rhythmic group into n equal pieces (Procedure 1: "the simplest
 * divisor," e.g. a 4-bar group split into 2 pieces of 2 bars each;
 * Procedure 2: individual bars themselves, e.g. 4 bars -> 4 pieces of 1
 * bar), then grows n *parts* out of those pieces via the same circular
 * permutations Ch. 9 already implements -- but each part is the
 * concatenation of *every* rotation, starting from a different offset per
 * part, not just one rotation each. Confirmed against the book's own
 * Figure 124 (p. 67, 4 pieces a1/b1/c1/d1): part 0 reads
 * a,b,c,d | b,c,d,a | c,d,a,b | d,a,b,c (rotations 0,1,2,3 in order);
 * part 1 reads b,c,d,a | c,d,a,b | d,a,b,c | a,b,c,d (rotations 1,2,3,0) --
 * a canon of all n rotations, each part entering one rotation later than
 * the last. This reproduces the book's own "16-bar continuity in 4 parts"
 * (4 parts, each 4 rotations x 4 bars = 16 bars) and "8-bar, 2-part
 * continuity" (2 parts, each 2 rotations x 2 bars = 4... doubled again by
 * the 2-bar piece length = 8 bars) exactly.
 */

import { circularPermutations } from "./permutations.ts";

/** Splits `items` into `pieces` equal contiguous chunks. */
export function chunkIntoPieces<T>(items: readonly T[], pieces: number): T[][] {
  if (pieces < 1 || items.length % pieces !== 0) {
    throw new Error(`cannot split ${items.length} items into ${pieces} equal pieces`);
  }
  const chunkSize = items.length / pieces;
  return Array.from({ length: pieces }, (_, i) => items.slice(i * chunkSize, (i + 1) * chunkSize));
}

/** All divisors of `n`, ascending (including 1 and n itself). */
export function divisorsOf(n: number): number[] {
  const divisors: number[] = [];
  for (let d = 1; d <= n; d++) {
    if (n % d === 0) divisors.push(d);
  }
  return divisors;
}

/**
 * Builds the n "parts" (voices) of a homogeneous continuity from n pieces:
 * part p is the concatenation of every circular rotation of `pieces`,
 * starting at rotation p and wrapping around -- a canon where each part
 * enters one rotation later than the previous one.
 */
export function homogeneousContinuityParts<T>(pieces: readonly T[]): T[][] {
  const n = pieces.length;
  const rotations = circularPermutations(pieces.map((_, i) => i)).map((row) => row.map((i) => pieces[i]));
  return Array.from({ length: n }, (_, p) => {
    const part: T[] = [];
    for (let k = 0; k < n; k++) part.push(...rotations[(p + k) % n]);
    return part;
  });
}
