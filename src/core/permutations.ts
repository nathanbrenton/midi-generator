/**
 * Book I, Chapter 9: Homogeneous Simultaneity and Continuity (Variations).
 *
 * "The variability of groups follows the general principles of
 * permutations. There are two fundamental forms: first, general
 * permutations; second, circular permutations (displacement). The quantity
 * of general permutations is the product of all integers from unity up to
 * the number expressing the quantity of the elements in a group... The
 * number of circular permutations equals the number of elements in a
 * group" (p. 46).
 *
 * The book applies this same combinatorics to several different musical
 * parameters in turn -- durations, rests, accents, split-unit groups, and
 * even whole named sub-groups (Figures 76-105) -- but the underlying
 * primitive is identical in every case: general permutations of a
 * duration-group are every *distinct* reordering of its values (n!, or
 * fewer when values repeat -- confirmed against the book's own examples:
 * a trinomial with one repeated value, e.g. 2+1+1, produces only 3 distinct
 * permutations, not 3!=6; a quadrinomial with two identical pairs, e.g.
 * 2+1+1+2, produces 4!/(2!2!)=6, both matching the book's own listed rows
 * exactly), while circular permutations are always exactly n -- the n
 * rotations of the group as given, regardless of repeated values.
 */

/**
 * Every distinct reordering of `values` (n! divided by repeated-value
 * factorials, matching the book's own reduced counts), in lexicographic
 * order. Duplicates are pruned as the tree is walked, so the work is the
 * number of distinct orders, not n!. `limit` stops after that many rows --
 * for callers that only show the first few of a count that can run into
 * the millions (see `distinctPermutationCount` for the total).
 */
export function generalPermutations(values: readonly number[], limit = Infinity): number[][] {
  const results: number[][] = [];
  const remaining = [...values].sort((a, b) => a - b);

  function backtrack(current: number[]): void {
    if (results.length >= limit) return;
    if (remaining.length === 0) {
      results.push([...current]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      if (results.length >= limit) return;
      if (i > 0 && remaining[i] === remaining[i - 1]) continue; // skip duplicate branches
      const value = remaining.splice(i, 1)[0];
      current.push(value);
      backtrack(current);
      current.pop();
      remaining.splice(i, 0, value);
    }
  }

  backtrack([]);
  return results;
}

/** How many distinct reorderings `values` has: n! over the factorial of each value's multiplicity. */
export function distinctPermutationCount(values: readonly unknown[]): number {
  const counts = new Map<unknown, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let total = 1;
  let n = 0;
  for (const k of counts.values()) {
    for (let i = 1; i <= k; i++) total = (total * ++n) / i;
  }
  return Math.round(total);
}

/** The n cyclic rotations of `values` as given -- always exactly `values.length` rows, regardless of repeated values. */
export function circularPermutations(values: readonly number[]): number[][] {
  return values.map((_, i) => [...values.slice(i), ...values.slice(0, i)]);
}

/**
 * Every distinct reordering of arbitrary (non-number) items -- the same
 * index-permutation trick already used by `homogeneousContinuityParts`
 * (Ch. 11): permute the positional indices with `generalPermutations`,
 * then map each index back to its item. Indices are always mutually
 * distinct, so every one of the n! orderings is produced even if two
 * items happen to be equal-valued -- positions are treated as labeled,
 * matching how this project's own axis/scale combinatorics count them.
 */
export function generalPermutationsOf<T>(items: readonly T[]): T[][] {
  return generalPermutations(items.map((_, i) => i)).map((row) => row.map((i) => items[i]));
}
