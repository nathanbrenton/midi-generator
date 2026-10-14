/**
 * Book V, Chapter 24: Contrapuntal Variations of Harmony (p.606-612).
 *
 * "When different parts of a harmonic continuity enter and drop out at
 * different time intervals, the continuity acquires contrapuntal
 * characteristics... The sequence in which the different parts may enter
 * or drop out is naturally subject to permutations." Three parts: "six
 * variations for either entering or dropping out, making a total of 12,"
 * reducible by circular permutations to 3 each way, 6; four parts 24 and
 * 48, or 4 and 8; five parts 120 and 240, or 5 and 10
 * (`contrapuntalVariationCount`, `partOrders`).
 *
 * "The number of attacks for each voice may be rhythmically arranged...
 * the part-sequence group might be distributed in one-to-one
 * correspondence to the attack-group": entering S, A, T, B with A = 4a +
 * 3a + 2a + 2a, "S4a + S3a + S2a + S2a; A3a + A2a + A2a; T2a + T2a; B2a"
 * -- each voice plays the attack group from its own entrance on
 * (`entrancePlan`), so over an 11-chord theme the soprano starts alone,
 * the alto enters at the fifth chord, the tenor at the eighth, the bass at
 * the tenth.
 */

import { circularPermutations } from "./permutations.ts";
import { generalPermutationsOf } from "./permutations.ts";

/** Variations for `parts` voices, entering and dropping out: 2·n!, or 2·n through circular permutations (p.606-607). */
export function contrapuntalVariationCount(parts: number, circular = false): number {
  const each = circular ? parts : Array.from({ length: parts }, (_, k) => k + 1).reduce((a, b) => a * b, 1);
  return 2 * each;
}

/** The orders in which parts may enter (or drop out): all permutations, or the circular ones. */
export function partOrders(parts: readonly string[], circular = false): string[][] {
  return circular
    ? circularPermutations(parts.map((_, i) => i)).map((p) => p.map((i) => parts[i]))
    : generalPermutationsOf(parts);
}

/**
 * Figure 368: each voice, in the order it enters, plays the attack group
 * from its own place on. Returns, per voice, its attack terms and the
 * attack at which it enters.
 */
export function entrancePlan(order: readonly string[], attackGroup: readonly number[]): { voice: string; attacks: number[]; entersAt: number }[] {
  return order.map((voice, k) => ({
    voice,
    attacks: attackGroup.slice(k),
    entersAt: attackGroup.slice(0, k).reduce((a, b) => a + b, 0),
  }));
}

/** Which voices sound at each attack, entering (or, reversed, dropping out) by the plan. */
export function soundingVoices(order: readonly string[], attackGroup: readonly number[], mode: "enter" | "drop" = "enter"): string[][] {
  const total = attackGroup.reduce((a, b) => a + b, 0);
  const plan = entrancePlan(order, attackGroup);
  const attacks = Array.from({ length: total }, (_, t) => plan.filter((p) => t >= p.entersAt).map((p) => p.voice));
  return mode === "enter" ? attacks : attacks.reverse();
}
