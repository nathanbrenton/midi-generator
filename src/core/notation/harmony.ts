/**
 * Book V (Special Theory of Harmony) in Schillinger's own symbols.
 *
 *   import * as H from "./notation/harmony.ts";
 *   H.C(5)                         // [0,3,6,2,5,1,4] -- C₅: c-f-b-e-a-d-g, "constructed downward"
 *   H.formatCycle(-5)              // "C₋₅"
 *   H.HS_E(1)                      // 5 -- HS_E₁ = C₅
 *   H.parseCycleGroup("2C7 + C3 + C5")        // [[2,7],[1,3],[1,5]]
 *   H.parseStructuralGroup("3S1 + S3 + 2S2")  // [[3,1],[1,3],[2,2]]
 *   H.formatDoubling(5, 3)         // "S(5)③"
 *   H.formatG6(-5)                 // "G₆(C₋₅)"
 *   H.formatFamily("minor seventh", 1) // "7♭S₁"
 *
 * Symbol table, by chapter:
 *
 *   Ch.2   C₀ C₃ C₅ C₇, C₋₃ C₋₅ C₋₇ (positive downward, p.362)   C, cycleStep, cycleBetween, formatCycle, parseCycle
 *          HS_E₀…HS_E₅ (= C₃ C₅ C₇ C₋₇ C₋₅ C₋₃, p.386)          HS_E, formatHS
 *          binomial/trinomial cycles (p.363)                     binomial, trinomial
 *          ↻ ↺ const. 3; open/close positions (p.376-381)        TRANSFORMATIONS, POSITIONS
 *          negative form, chords built downward (p.386-387)      negativeForm
 *   Ch.3   S₁ S₂ S₃ S₄ = 4+3, 3+4, 4+4, 3+3; structural groups   S5, formatStructure, parseStructuralGroup, formatStructuralGroup
 *   Ch.4-5 Types I (diatonic), II (diatonic-symmetric), III      TYPES, tonicSystem
 *   Ch.6-7 S(5)① ③ ⑤, S(6)① ③ ⑤ (doublings)                     formatDoubling
 *   Ch.8   G₆ = S(5) + S(6)③ + S(5), G₆(Cₙ); G₄₋₆                 formatG6, G6_FORMULA, G46_FORMULA
 *   Ch.9   S(7) structures S₁…S₇, major … augmented II          S7
 *   Ch.10-11 families 7♭Sₖ, 7♮Sₖ                                 formatFamily
 *   Ch.12  descending interval numbers, c → g = 5 (p.489)        interval
 *   Ch.17  Hy = di3H + ch6H + sy3H                               HY
 *   and cycle groups with coefficients, "2C₇ + C₃ + C₅" (p.393)  parseCycleGroup, formatCycleGroup
 */

import {
  binomialCycle,
  cycleBetween as cycleBetweenOf,
  cycleDegreeStep,
  diatonicCycle,
  negativeFormCycle,
  S5_POSITIONS,
  trinomialCycle,
  type SignedCycleType,
} from "../diatonicHarmony.ts";
import { S5_STRUCTURES, S7_STRUCTURES, symmetricRoots, type CycleGroup, type StructuralGroup, type StructureId, type TonicCount } from "../symmetricHarmony.ts";
import { HYBRID_CONTINUITY_RATIO } from "../hybridHarmonicContinuity.ts";
import { descendingInterval } from "../generalizedSymmetricProgressions.ts";
import { formatRoot, subscript } from "./format.ts";

export type Cycle = 0 | SignedCycleType;

// ---- Ch.2: cycles -------------------------------------------------------------

/** Cₙ from `startDegree`: the seven roots of a diatonic cycle; C₀ is the one root, held. */
export function C(n: Cycle, startDegree = 0): number[] {
  return n === 0 ? Array.from({ length: 7 }, () => startDegree) : diatonicCycle(n, startDegree);
}

/** The scale-degree step of Cₙ: C₃ is -2, C₋₅ is +4 (positive cycles run downward, p.362). */
export function cycleStep(n: Cycle): number {
  return n === 0 ? 0 : cycleDegreeStep(n);
}

/** The cycle between two roots. */
export function cycleBetween(fromDegree: number, toDegree: number): Cycle {
  return cycleBetweenOf(fromDegree, toDegree);
}

/** "C₃", "C₋₅", "C₀". */
export function formatCycle(n: Cycle): string {
  return `C${subscript(String(n))}`;
}

/** Reads "C5", "C-5", "C₋₅" or "C0"; null if it isn't a cycle. */
export function parseCycle(text: string): Cycle | null {
  const plain = text.trim().replace(/[₀-₉₋]/g, (ch) => (ch === "₋" ? "-" : String(ch.charCodeAt(0) - 0x2080)));
  const match = plain.match(/^C(-?[0357])$/);
  if (!match) return null;
  const n = Number(match[1]);
  return n === -0 ? 0 : (n as Cycle);
}

/** HS_Eₖ, the expansions of the harmony scale: HS_E₀ = C₃, HS_E₁ = C₅, HS_E₂ = C₇, HS_E₃ = C₋₇, HS_E₄ = C₋₅, HS_E₅ = C₋₃ (p.362, 386). */
export function HS_E(k: 0 | 1 | 2 | 3 | 4 | 5): SignedCycleType {
  return ([3, 5, 7, -7, -5, -3] as const)[k];
}

export function formatHS(k: number): string {
  return `HS_E${subscript(String(k))}`;
}

/** A binomial cycle, Cₐ + C_b alternating (p.363, Figure 3). */
export function binomial(a: SignedCycleType, b: SignedCycleType, startDegree = 0): number[] {
  return binomialCycle(a, b, startDegree);
}

/** A trinomial cycle. */
export function trinomial(a: SignedCycleType, b: SignedCycleType, c: SignedCycleType, startDegree = 0): number[] {
  return trinomialCycle(a, b, c, startDegree);
}

/** The cycle a negative-form progression takes for Cₙ: C₋ₙ (p.387). */
export function negativeForm(n: SignedCycleType): SignedCycleType {
  return negativeFormCycle(n);
}

/** The three transformations of S(5) and their marks (p.376-381). */
export const TRANSFORMATIONS = {
  clockwise: { mark: "↻", map: "a→b, b→c, c→a" },
  counterclockwise: { mark: "↺", map: "a→c, c→b, b→a" },
  const3: { mark: "const. 3", map: "b→b, a↔c" },
} as const;

/** Open positions are the clockwise phases, close the counterclockwise (p.377). */
export const POSITIONS = S5_POSITIONS;

// ---- Ch.3, Ch.9: structures ---------------------------------------------------

/** S₁…S₄ of S(5): 4+3 major, 3+4 minor, 4+4 augmented, 3+3 diminished (p.388). */
export const S5 = S5_STRUCTURES;

/** S₁…S₇ of S(7) (Figure 141). */
export const S7 = S7_STRUCTURES;

/** "S₁". */
export function formatStructure(k: number): string {
  return `S${subscript(String(k))}`;
}

/** Reads a structural group, "3S1 + S3 + 2S2" or "3S₁ + S₃ + 2S₂" (p.390-391); null if it isn't one. */
export function parseStructuralGroup(text: string): StructuralGroup | null {
  const terms = parseTerms(text, "S", /^[1-7]$/);
  return terms && (terms as [number, StructureId][]);
}

/** [[3,1],[1,3],[2,2]] -> "3S₁ + S₃ + 2S₂". */
export function formatStructuralGroup(group: StructuralGroup): string {
  return group.map(([k, s]) => `${k === 1 ? "" : k}${formatStructure(s)}`).join(" + ");
}

/** Reads a group of tonal cycles with coefficients, "2C7 + C3 + C5" (p.393); null if it isn't one. */
export function parseCycleGroup(text: string): CycleGroup | null {
  const terms = parseTerms(text, "C", /^-?[357]$/);
  return terms && (terms as [number, SignedCycleType][]);
}

/** [[2,7],[1,3],[1,5]] -> "2C₇ + C₃ + C₅". */
export function formatCycleGroup(group: CycleGroup): string {
  return group.map(([k, c]) => `${k === 1 ? "" : k}${formatCycle(c)}`).join(" + ");
}

function parseTerms(text: string, letter: "S" | "C", index: RegExp): [number, number][] | null {
  const plain = text.replace(/[₀-₉₋]/g, (ch) => (ch === "₋" ? "-" : String(ch.charCodeAt(0) - 0x2080)));
  const terms: [number, number][] = [];
  for (const token of plain.split("+").map((t) => t.trim())) {
    const match = token.match(new RegExp(`^(\\d*)${letter}(-?\\d+)$`));
    if (!match || !index.test(match[2])) return null;
    terms.push([match[1] === "" ? 1 : Number(match[1]), Number(match[2])]);
  }
  return terms;
}

// ---- Ch.4-8: types, tonics, doublings, groups -----------------------------------

/** The three types of harmonic progression (p.393, 452). */
export const TYPES = { I: "diatonic", II: "diatonic-symmetric", III: "symmetric" } as const;

/** A Type III system: its root notation (√2 … ¹²√2), roots and cycles (p.396). */
export function tonicSystem(tonicCount: Exclude<TonicCount, 1>, form: "positive" | "negative" = "positive") {
  return { notation: formatRoot(tonicCount), ...symmetricRoots(tonicCount, form) };
}

const CIRCLED: Record<1 | 3 | 5, string> = { 1: "①", 3: "③", 5: "⑤" };

/** "S(5)③": the doubled function circled (Ch.6-7). */
export function formatDoubling(chord: 5 | 6, doubled: 1 | 3 | 5): string {
  return `S(${chord})${CIRCLED[doubled]}`;
}

/** "G₆ = S(5) + S(6)③ + S(5)" (p.415). */
export const G6_FORMULA = `G${subscript("6")} = S(5) + ${formatDoubling(6, 3)} + S(5)`;
/** "G₄₋₆ = S(5) + S(4/6) + S(6)" (p.427). */
export const G46_FORMULA = `G${subscript("4-6")} = S(5) + S(4/6) + S(6)`;

/** "G₆(C₋₅)": a group with a passing sixth-chord over a cycle (p.417). */
export function formatG6(cycle: SignedCycleType): string {
  return `G${subscript("6")}(${formatCycle(cycle)})`;
}

/** "7♭S₁", "7♮S₂" -- the families of S(9) and S(11) (p.464, 473). */
export function formatFamily(family: "minor seventh" | "major seventh", k: number): string {
  return `7${family === "minor seventh" ? "♭" : "♮"}${formatStructure(k)}`;
}

// ---- Ch.12, Ch.17 -------------------------------------------------------------------

/** The descending interval number between two roots: c → g = 5, c → b = 1 (p.489). */
export function interval(fromPitchClass: number, toPitchClass: number): number {
  return descendingInterval(fromPitchClass, toPitchClass);
}

/** Hy = di3H + ch6H + sy3H (p.552). */
export const HY = {
  ratio: HYBRID_CONTINUITY_RATIO,
  formula: `Hy = di${HYBRID_CONTINUITY_RATIO.diatonic}H + ch${HYBRID_CONTINUITY_RATIO.chromatic}H + sy${HYBRID_CONTINUITY_RATIO.symmetric}H`,
};
