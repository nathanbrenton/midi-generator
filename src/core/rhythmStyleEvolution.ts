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
 * generally, not just for that one example: for any coprime x,y with
 * b=max(x,y) and a=x+y, `generateResultant([a,b])`'s first two segments
 * are always exactly (b, a-b) = (max(x,y), min(x,y)) -- because b is by
 * construction more than half of a, so generator b's second attack (at
 * time a) always falls before generator a's second attack (at time 2b).
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

export interface TracedOrigin {
  a: number;
  b: number;
}

/** Reverse-engineers the (a, b) generator pair whose resultant opens with segments (x, y). */
export function traceOrigin(x: number, y: number): TracedOrigin {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1) {
    throw new Error("x and y must be positive integers");
  }
  const b = Math.max(x, y);
  const a = x + y;
  return { a, b };
}
