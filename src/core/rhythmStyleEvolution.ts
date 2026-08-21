/**
 * Book I, Chapter 13: Evolution of Rhythm Styles (Families).
 *
 * The bulk of this chapter is historical/cultural commentary (which
 * determinants different world musical traditions favor, an analysis of
 * "swing"), not implementable rhythm theory -- deliberately scoped out
 * here. Two crisp, self-contained formulas remain:
 *
 * 1. The "interference-group" size sequence: "the number of terms in the
 * nth interference-group equals the product of the number of terms in the
 * (n-1)th interference-group by 2, minus 1" -- i_n = 2*i_(n-1) - 1, i_1=2.
 * The book's own five terms: 2, 3, 5, 9, 17 (p. 84).
 *
 * 2. "Tracing the origin" of a binomial (a 2-segment rhythmic fragment)
 * back to the two-generator resultant it came from: "take the greater
 * number-value of the binomial and assign it as a minor generator (b).
 * The sum of the binomial is the major generator [a]" (p. 84-85). The
 * book's own example: binomial (5,3) -> determinant/sum 8 -> b=5, a=8 ->
 * "the binomial represents the first two terms of r(8+5)". Verified this
 * generally: for any *coprime* x,y with b=max(x,y) and a=x+y,
 * `generateResultant([a,b])`'s first two segments are always exactly
 * (b, a-b) = (max(x,y), min(x,y)) -- because b is by construction more
 * than half of a, so generator b's second attack (at time a) always
 * falls before generator a's second attack (at time 2b).
 *
 * A non-coprime fragment (e.g. 4,2) has no generator pair of its own to
 * trace to -- r(a,b) is only ever defined up to a common factor, the same
 * way `rhythmAnalysis.ts` reduces an imported pattern to its smallest
 * integer ratio before matching it against a resultant (4,2,2 and 2,1,1
 * are "the same" pattern). `traceOrigin` reduces x,y by their gcd first
 * for exactly that reason -- (4,2) traces the same origin as (2,1) -- so
 * the guarantee above holds unconditionally, not just for already-coprime
 * inputs. (An earlier version skipped this reduction: entering a
 * non-coprime pair like (4,2) into the UI silently traced to a resultant
 * that did *not* actually open with that fragment, since r(6,4) reduces
 * to the same shape as r(3,2) and opens with 2,1, not 4,2 -- caught by a
 * dedicated code review, not by the existing tests, which happened to
 * only ever use coprime pairs.)
 */

export function interferenceGroupSizes(count: number): number[] {
  if (count < 1) {
    throw new Error("count must be >= 1");
  }
  const sizes = [2];
  while (sizes.length < count) {
    sizes.push(2 * sizes[sizes.length - 1] - 1);
  }
  return sizes;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface TracedOrigin {
  a: number;
  b: number;
  /** The fragment actually traced, after reducing (x,y) by their gcd -- equals the input unless it wasn't already coprime. */
  reducedX: number;
  reducedY: number;
}

/** Reverse-engineers the (a, b) generator pair whose resultant opens with segments (x, y) -- reducing (x,y) by their gcd first, since a resultant is only ever defined up to a common factor. */
export function traceOrigin(x: number, y: number): TracedOrigin {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1) {
    throw new Error("x and y must be positive integers");
  }
  const divisor = gcd(x, y);
  const reducedX = x / divisor;
  const reducedY = y / divisor;
  const b = Math.max(reducedX, reducedY);
  const a = reducedX + reducedY;
  return { a, b, reducedX, reducedY };
}
