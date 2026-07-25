/**
 * A "technique" is which of the resultant-building methods (Book I, Ch.
 * 2A/4/5) is currently active. Kept as a single canonical definition
 * since it's used across the UI, time-signature derivation, and
 * cross-technique pattern search.
 */

import { generateResultant, type Resultant } from "./resultant.ts";
import { generateFractionedResultant } from "./fractioning.ts";
import { buildExpansion, buildContraction, buildBalance } from "./groupsByPairs.ts";

export type Technique = "plain" | "fractioned" | "expansion" | "contraction" | "balance";

export const ALL_TECHNIQUES: readonly Technique[] = [
  "plain",
  "fractioned",
  "expansion",
  "contraction",
  "balance",
];

export function buildResultantForTechnique(technique: Technique, a: number, b: number): Resultant {
  switch (technique) {
    case "fractioned":
      return generateFractionedResultant(a, b);
    case "expansion":
      return buildExpansion(a, b);
    case "contraction":
      return buildContraction(a, b);
    case "balance":
      return buildBalance(a, b);
    default:
      return generateResultant([a, b]);
  }
}
