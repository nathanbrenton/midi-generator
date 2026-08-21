/**
 * Book II, Chapter 5: Pitch-Scales -- The Second Group. Scales in Expansion.
 *
 * Section A (Methods of Tonal Expansion, p.132-133): the first expansion
 * (E1) of an N-unit scale is a circular permutation "over one pitch-unit" --
 * concretely, starting from unit 0 and repeatedly stepping by 2 positions
 * (mod N) through the scale's own units, until the walk returns to an
 * already-visited unit; at that point "the recurring unit is omitted" and
 * the walk restarts from the smallest not-yet-visited unit, continuing
 * until every unit has been placed once. Higher expansions E_k use step
 * k+1 instead of step 2. The book's own two worked examples (p.132-133),
 * both confirmed by hand against the rendered page images (the odd-count
 * example's figure wasn't in the OCR text layer):
 *   - c-d-e-f-g (N=5, odd -- a single 5-cycle since gcd(2,5)=1):
 *     E1 = c-e-g-d-f
 *   - c-d-e-f-g-b (N=6, even -- splits into two 3-cycles since gcd(2,6)=2,
 *     the second cycle restarting at d once c recurs):
 *     E1 = c-e-g-d-f-b
 * "The total number of tonal expansions of one scale equals the number of
 * units therein minus one. This includes the original scale" -- i.e. E0
 * (step 1, the identity walk) through E_{N-2} (step N-1), for N-1 total.
 *
 * Sections B-D (translating melodies between expansions, variable pitch
 * axes/modulation via common tones or identical motifs, chromatic-
 * alteration-based modulation) are compositional workflow guidance built
 * on top of this same primitive, not additional formulas -- the same
 * scoping call made throughout Book I and Book II Ch.4.
 */

/**
 * The tonal expansion E_k of `units` (Schillinger's own pitch-unit
 * positions, in original scale order) -- a circular-permutation walk with
 * step (k+1), decomposed into gcd(k+1, N) cycles concatenated in order of
 * each cycle's starting index. `k` must be in [0, units.length - 2]; E0
 * (k=0) is the original scale, unchanged.
 */
export function tonalExpansion<T>(units: readonly T[], k: number): T[] {
  const n = units.length;
  if (n === 0) return [];
  if (!Number.isInteger(k) || k < 0 || k > n - 2) {
    throw new Error(`k must be an integer in [0, ${n - 2}]`);
  }
  const step = k + 1;
  const visited = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;
    let i = start;
    while (!visited[i]) {
      visited[i] = true;
      order.push(i);
      i = (i + step) % n;
    }
  }
  return order.map((index) => units[index]);
}

/** Every tonal expansion of `units`, E0 through E_{N-2} -- "N-1 total, including the original scale" (p.133). */
export function allTonalExpansions<T>(units: readonly T[]): T[][] {
  const n = units.length;
  if (n < 2) return n === 1 ? [[units[0]]] : [];
  const expansions: T[][] = [];
  for (let k = 0; k <= n - 2; k++) {
    expansions.push(tonalExpansion(units, k));
  }
  return expansions;
}
