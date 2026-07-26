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

/** Every distinct reordering of `values` (n! divided by repeated-value factorials, matching the book's own reduced counts). */
export function generalPermutations(values: readonly number[]): number[][] {
  const results: number[][] = [];
  const remaining = [...values].sort((a, b) => a - b);

  function backtrack(current: number[]): void {
    if (remaining.length === 0) {
      results.push([...current]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
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

/** The n cyclic rotations of `values` as given -- always exactly `values.length` rows, regardless of repeated values. */
export function circularPermutations(values: readonly number[]): number[][] {
  return values.map((_, i) => [...values.slice(i), ...values.slice(0, i)]);
}
