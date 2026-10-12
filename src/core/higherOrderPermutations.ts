/**
 * Book I, Chapter 10: Generalization of Variation Techniques (Section A,
 * "Permutations of the Higher Order," p.63-66).
 *
 * "The elements of the preceding order become the elements of the next
 * order" -- each element of the next order is one general permutation of
 * ALL the preceding order's elements, concatenated. For two elements this
 * is the book's own formula (Figure 120, p.63):
 *
 *   a1 + b1 = a2      b1 + a1 = b2
 *   a2 + b2 = a3      b2 + a2 = b3   ...   a(n-1) + b(n-1) = an
 *
 * and for three (p.65, confirmed by rendering the page):
 *
 *   a1 + b1 + c1 = a2    a1 + c1 + b1 = b2    c1 + a1 + b1 = c2
 *   b1 + a1 + c1 = d2    b1 + c1 + a1 = e2    c1 + b1 + a1 = f2
 *
 * So the element count grows as a factorial of itself -- 2 stays 2 forever
 * (2! = 2), but 3 becomes 3! = 6 on the second order and 6! = 720 on the
 * third, exactly as the prose says ("this will give 6 elements in the
 * second order, 720 in the third"). An earlier version of this module kept
 * n elements per order (element i joined only to element i+1), which
 * matches the two-element formula but not the three-element one, and
 * wrongly called the prose self-inconsistent.
 *
 * The next order's elements follow the book's own naming order for three
 * elements (a2..f2 above, which isn't lexicographic); for two it's simply
 * a, b; beyond three the book gives no order, so general permutations'
 * own order is used.
 *
 * The book then builds continuity from "combinations by 2, by 3, by 4, by
 * 5 and by 6" of the second-order elements, with "the total number of
 * cases" being combinations x permutations each -- 15 x 2 = 30, 20 x 6 =
 * 120, 15 x 24 = 360, 6 x 120 = 720, 1 x 720 = 720 for six elements.
 * `combinationsBy` lists them in the book's own order and
 * `combinationCases` reproduces those totals.
 */

import { generalPermutations } from "./permutations.ts";

/** The book's own order for naming the six second-order elements of a three-element group (p.65). */
const THREE_ELEMENT_ORDER: readonly (readonly number[])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [2, 0, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 1, 0],
];

function permutationOrder(count: number): number[][] {
  if (count === 3) return THREE_ELEMENT_ORDER.map((row) => [...row]);
  return generalPermutations(Array.from({ length: count }, (_, i) => i));
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/** How many elements a group of `seedCount` elements has at `order` (n -> n! each order). */
export function higherOrderElementCount(seedCount: number, order: number): number {
  let count = seedCount;
  for (let step = 1; step < order; step++) {
    count = factorial(count);
    if (!Number.isFinite(count)) return Infinity;
  }
  return count;
}

/** The highest order whose element count stays within `maxElements` (unbounded for two seeds, whose count is always 2). */
export function maxHigherOrder(seedCount: number, maxElements = 720): number {
  if (seedCount <= 2) return Infinity;
  let order = 1;
  while (higherOrderElementCount(seedCount, order + 1) <= maxElements) order++;
  return order;
}

/** Every element of `order`, each a concatenation of one permutation of the previous order's elements (p.63-65). */
export function higherOrderElements(seeds: readonly (readonly number[])[], order: number, maxElements = 720): number[][] {
  if (seeds.length < 2) {
    throw new Error("higherOrderElements needs at least two seed elements");
  }
  if (order < 1) {
    throw new Error("order must be >= 1");
  }
  if (higherOrderElementCount(seeds.length, order) > maxElements) {
    throw new Error(`order ${order} of ${seeds.length} elements has more than ${maxElements} elements`);
  }

  let current: number[][] = seeds.map((seed) => [...seed]);
  for (let step = 1; step < order; step++) {
    const previous = current;
    current = permutationOrder(previous.length).map((row) => row.flatMap((i) => previous[i]));
  }
  return current;
}

function combinationsOfIndices(n: number, k: number): number[][] {
  const result: number[][] = [];
  const pick = (start: number, chosen: number[]) => {
    if (chosen.length === k) {
      result.push([...chosen]);
      return;
    }
    for (let i = start; i < n; i++) pick(i + 1, [...chosen, i]);
  };
  pick(0, []);
  return result;
}

/** "Combinations by k" of `elementCount` elements, as index lists in the book's own listing order (a2+b2, a2+c2, ...). */
export function combinationsBy(elementCount: number, k: number): number[][] {
  return combinationsOfIndices(elementCount, k);
}

/** "The total number of cases" for combinations by k: combinations x permutations of each (p.65-66). */
export function combinationCases(elementCount: number, k: number): { combinations: number; permutationsEach: number; total: number } {
  const combinations = combinationsBy(elementCount, k).length;
  const permutationsEach = factorial(k);
  return { combinations, permutationsEach, total: combinations * permutationsEach };
}
