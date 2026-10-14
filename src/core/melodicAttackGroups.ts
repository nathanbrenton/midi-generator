/**
 * Book VI, Chapter 2, Sections A-B: Composing Melodic Attack-Groups
 * (p.642-651).
 *
 * The number of melodic attacks per chord need not be constant, M/H = A:
 * "binomial attack-groups for the melody... M/2H = A1 + A2," trinomials,
 * and polynomials "based on the resultants of interference" --
 * r4÷3 = 3a + a + 2a + 2a + a + 3a, r̲3÷2 = 2a + a + a + a + a + a + 2a,
 * r9÷8 = 8a + a + 7a + 2a + ... + 8a -- or involution groups, (2 + 1)² =
 * 4a + 2a + 2a + a, and series of growth (Book I supplies them all).
 *
 * "The contrast between the two terms of a binomial decreases when their
 * values approach equality. Thus, a + 6a contrasts more than 2a + 6a;
 * 2a + 6a... more than 3a + 6a; and 3a + 6a has more contrast than the
 * least contrasting, 5a + 6a" (`binomialContrast`). Permuting a binomial
 * gives "a second order binomial attack group," 4a + 2a over four chords
 * as 4a + 2a + 2a + 4a; permuting each pair of a resultant puts the
 * least animation at the ends instead of the most (`permuteBinomials`).
 *
 * Section A: durations for each chord's attacks drawn from one series of
 * Book I's style evolution -- a binomial 3 + 1 "more suitable at the
 * beginning of melody; the latter [1 + 3], at the end," a trinomial
 * 2 + 1 + 1 at the beginning, 1 + 2 + 1 at the center, 1 + 1 + 2 at the
 * end (`balancedAttackDurations`, Figures 19-22). And "the final and most
 * refined technique": attacks and durations composed independently and
 * left to interfere -- A = r5÷4 attacks per chord against durations
 * T = r̲4÷3 -- each chord lasting "the sum of durations during the time of
 * attacks corresponding to such an H": 7t, t, 4t, 4t, 4t, 4t, t, 7t
 * (`chordDurations`, Figure 23).
 *
 * Section B: "synchronizing a polynomial... with its square": each term of
 * (3 + 1 + 2 + 2)² is a melodic duration, each group of four a chord whose
 * duration is 8 times the original term -- 24t, 8t, 16t, 16t
 * (`squareSynchronization`, Figure 24).
 */

import { distributivePower } from "./distributivePowers.ts";

/** How strongly the two terms of a binomial contrast: |a - b| / (a + b), 0 for a monomial. */
export function binomialContrast(a: number, b: number): number {
  return Math.abs(a - b) / (a + b);
}

/** Swaps each pair of terms: 8a + a + 7a + 2a ... becomes a + 8a + 2a + 7a ... (p.643). */
export function permuteBinomials(group: readonly number[]): number[] {
  if (group.length % 2 !== 0) throw new Error("permutation of binomials needs an even number of terms");
  return group.flatMap((_, i) => (i % 2 === 0 ? [group[i + 1], group[i]] : []));
}

/** A binomial and its permutation in turn: 4a + 2a over 4H is 4a + 2a + 2a + 4a. */
export function secondOrderBinomial(a: number, b: number, chords: number): number[] {
  return Array.from({ length: chords }, (_, k) => (Math.floor(k / 2) % 2 === 0 ? [a, b] : [b, a])[k % 2]);
}

/**
 * Durations for a melody whose attack groups rise and fall (Figures
 * 19-22): the whole T, then the binomial, trinomial and quintinomial of
 * the series in their opening order, then the trinomial and binomial
 * reversed, then T -- attack group a + 2a + 3a + 5a + 3a + 2a + a.
 */
export function balancedAttackDurations(T: number, binomial: readonly [number, number], trinomial: readonly [number, number, number], quintinomial: readonly number[]): number[][] {
  return [[T], [...binomial], [...trinomial], [...quintinomial], [...trinomial].reverse(), [...binomial].reverse(), [T]];
}

/**
 * Figure 23: attacks per chord against a cycle of durations; each chord
 * lasts the sum of the durations its attacks take, the durations
 * repeating "until the two... come to and end at the same point."
 */
export function chordDurations(attacksPerChord: readonly number[], durations: readonly number[]): { perAttack: number[][]; perChord: number[] } {
  let next = 0;
  const perAttack = attacksPerChord.map((n) =>
    Array.from({ length: n }, () => durations[next++ % durations.length]),
  );
  return { perAttack, perChord: perAttack.map((d) => d.reduce((s, x) => s + x, 0)) };
}

/**
 * Figures 24-25: a polynomial's power synchronized with the power below
 * it -- the higher power's terms are the melody, n to a chord (n the
 * polynomial's length), and each chord lasts their sum, which is the
 * lower power scaled by the polynomial's sum. Square against the
 * polynomial: (3 + 1 + 2 + 2)² against 8(3 + 1 + 2 + 2); cube against
 * square: (2 + 1 + 1)³ against 4(2 + 1 + 1)², "harmony: 9H, and melody:
 * M = 27a, with constant 3 attacks per chord."
 */
export function powerSynchronization(polynomial: readonly number[], power: 2 | 3 = 2): { melody: number[][]; harmony: number[] } {
  const terms = distributivePower(polynomial, power);
  const n = polynomial.length;
  const melody = Array.from({ length: terms.length / n }, (_, k) => terms.slice(k * n, (k + 1) * n));
  return { melody, harmony: melody.map((g) => g.reduce((s, x) => s + x, 0)) };
}

/** Figure 24's case, the square. */
export function squareSynchronization(polynomial: readonly number[]): { melody: number[][]; harmony: number[] } {
  return powerSynchronization(polynomial, 2);
}
