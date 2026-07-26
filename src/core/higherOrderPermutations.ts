/**
 * Book I, Chapter 10: Generalization of Variation Techniques (Section A,
 * "Permutations of the Higher Order").
 *
 * The book's own worked formula (Figure 120, p.63) for two seed elements:
 *
 *   a1 + b1 = a2      b1 + a1 = b2
 *   a2 + b2 = a3      b2 + a2 = b3
 *   ...
 *   a(n-1) + b(n-1) = an     b(n-1) + a(n-1) = bn
 *
 * Each "order" concatenates the *previous* order's own two elements, in
 * both circular orders, to produce the next order's two (now longer)
 * elements -- an ever-growing variation built from a tiny seed, while the
 * number of simultaneous voices stays fixed. `higherOrderElements`
 * generalizes this to any number of seeds: element i at order k is the
 * concatenation of element i and element (i+1 mod n) from order k-1 --
 * confirmed to reduce to the book's own a2/b2/a3/b3 formula exactly when
 * there are two seeds.
 *
 * One honest flag: the book's own prose claims the *element count* itself
 * grows ("3 elements -> 9 on the second order, 27 on the third... through
 * circular permutations"), which doesn't square with Figure 120's own
 * formula -- that formula keeps exactly n elements at every order (2 stay
 * 2, forever), only their *length* grows. This implementation follows the
 * formula, which is unambiguous and directly verifiable, over the prose
 * claim, which isn't self-consistent even within the book's own two given
 * examples (order2=9 fits "square of 3", but order3=27 does not fit
 * "square of 9"=81).
 */

export function higherOrderElements(seeds: readonly (readonly number[])[], order: number): number[][] {
  if (seeds.length < 2) {
    throw new Error("higherOrderElements needs at least two seed elements");
  }
  if (order < 1) {
    throw new Error("order must be >= 1");
  }

  let current: number[][] = seeds.map((seed) => [...seed]);
  for (let step = 1; step < order; step++) {
    const n = current.length;
    current = current.map((element, i) => [...element, ...current[(i + 1) % n]]);
  }
  return current;
}
