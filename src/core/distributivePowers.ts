/**
 * Book I, Chapter 12: Distributive Powers (Section B, "Composition of
 * Rhythmic Counterthemes by Means of Distributive Powers").
 *
 * A distributive power keeps every product term separate rather than
 * collapsing like terms the way an algebraic power would -- the book's
 * own footnote: "the algebraic square of a+b is a2+2ab+b2. But the
 * distributive square would be a2+ab+ab+b2." Concretely, for a *numeric*
 * duration-group, the distributive square of (2,1) is (4,2,2,1) -- every
 * ordered pairwise product, in order (p.75) -- and the cube is
 * (8,4,4,2,4,2,2,1) -- computed as `2*(distributive square) followed by
 * 1*(distributive square)` (p.77). Both are reproduced exactly here.
 *
 * `distributivePower(terms, power)` always has `terms.length ** power`
 * entries and sums to `sum(terms) ** power` -- the book's own generalization
 * (Section III/VII): "the number of terms in a distributive square of any
 * polynomial equals the square of this number... a binomial gives 4 terms
 * (2^2=4), a trinomial gives 9 terms (3^2=9)."
 *
 * The book pairs a group with its distributive power as theme and
 * countertheme, and gives an explicit rule for synchronizing them so their
 * totals match: multiply the *lower*-power group's own terms by
 * `sum(terms) ** (toPower - fromPower)`. Confirmed against two of the
 * book's own worked examples for (2,1): synchronizing the first power with
 * the cube gives `9*(2+1) = 18+9 = 27` (p.77), and synchronizing the square
 * with the cube gives `3*(4+2+2+1) = 12+6+6+3 = 27` (p.79-80) -- both
 * exactly reproduced by `synchronizeToPower`.
 */

export function distributivePower(terms: readonly number[], power: number): number[] {
  if (power < 1) {
    throw new Error("power must be >= 1");
  }
  if (power === 1) {
    return [...terms];
  }
  const previous = distributivePower(terms, power - 1);
  return terms.flatMap((term) => previous.map((value) => term * value));
}

/**
 * Scales the distributive power at `fromPower` up so its total matches the
 * distributive power at `toPower` (toPower must be >= fromPower) -- the
 * book's own "theme"/"countertheme" pairing rule.
 */
export function synchronizeToPower(terms: readonly number[], fromPower: number, toPower: number): number[] {
  if (toPower < fromPower) {
    throw new Error("toPower must be >= fromPower");
  }
  const sum = terms.reduce((a, b) => a + b, 0);
  const scale = sum ** (toPower - fromPower);
  return distributivePower(terms, fromPower).map((value) => value * scale);
}
