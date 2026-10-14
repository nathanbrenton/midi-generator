/**
 * Book IX: General Theory of Harmony -- Strata Harmony (p.1063-1248).
 *
 * Harmony generalized to "groups of instruments": a score is a sigma Σ of
 * strata S, each stratum of p, 2p, 3p or 4p parts, with structures counted
 * from the twelve-unit octave (`STRUCTURE_COUNTS`): 11 two-part structures
 * (1i … 11i), 55 three-part, 165 four-part -- the two-, three- and
 * four-unit scales brought into simultaneity, C(11, parts - 1).
 *
 * Diatonic structures are the tonal expansions E0-E5 of a seven-unit scale
 * (seconds, thirds … sevenths), "three mutually reciprocating pairs in
 * octave-inversion": E0 with E5, E1 with E4, E2 with E3. Two-part
 * transformations are a⇄b, plus const. ab when the structures differ.
 * Counting (p.1076-1085, 1145): S2p + Sp, 11 x 12 = 132 hybrid three-part
 * structures, 6 x 7 = 42 diatonic; Σ = 2S2p, 11³ = 1,331 general and 6³ =
 * 216 diatonic; Σ = 2S4p, 165² x 11 = 299,475 (`sigmaCounts`).
 *
 * Limits (p.1096-1098, 1120-1122, 1151-1153): a sigma's diatonic limit
 * has as many strata as its scale has units, its symmetric limit as many
 * as its tonics, and a compound sigma Σ(Σ) multiplies them -- from "10
 * parts in 5 strata (11 with the added root-tone)" to "144S2p = 288p",
 * "a score of 289 parts," and 12·12·4 = 576 parts of four-part strata
 * (`sigmaLimit`).
 *
 * Families (Ch.7, p.1158-1162): the members of a family are the
 * permutations of its interval-groups -- one, two, three or six members.
 * The book counts "29 such families" of triads "5 of which contain only one
 * member" and 40 of tetrads (3 with one); the stated rule, interval-groups
 * "not exceeding eleven semitones as a sum," gives 30 and 41, whose members
 * add up to the book's own 55 and 165 structures (`structureFamilies`) --
 * the printed counts look one short each. The compound family of 5 + 3 +
 * 3 has 27 x 5 = 135 members.
 *
 * Directional units (Ch.8, p.1169-1186): each part is neutral or led into
 * by an auxiliary from below or above, a semitone or a whole tone away --
 * five intonations a part, so 25, 125 and 625 for two, three and four
 * parts, over 9, 27, 81 forms (`directionalUnitCounts`), and 165 x 3 x 625
 * = 309,375 forms of the c-chord over every S4p structure in E0, E1, E2.
 *
 * The harmony of fourths (Ch.5): E2 of a seven-unit scale, functions 1, 4,
 * 7, 10, positive cycles C4, C7, C10 -- Book V's downward steps, k - 1
 * degrees (`fourthsCycle`). Reciprocating strata (Ch.6): a four-part
 * stratum and its tonal inversion around one axis, moving through one
 * cycle with opposite signs, "coincide in structure on the dominant... which
 * is always an S(7)" (`reciprocatingStrata`). Canons from strata (Ch.13): a
 * three-part scheme for each of the 3! orders of imitation, clockwise or
 * counterclockwise -- 12. Density (Ch.15): density-groups md·nt, and
 * phasic rotation, whose phases add modulo the rotation limit θ
 * (`rotatePhase`) -- a resultant with alternating signs always returns to
 * φ0.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { generalPermutationsOf } from "./permutations.ts";

const choose = (n: number, k: number): number => (k === 0 ? 1 : (n * choose(n - 1, k - 1)) / k);
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** Structures of 2, 3 and 4 parts in the twelve-unit octave: C(11, parts - 1). */
export function structureCount(parts: 2 | 3 | 4): number {
  return choose(11, parts - 1);
}

export const STRUCTURE_COUNTS = { 2: structureCount(2), 3: structureCount(3), 4: structureCount(4) } as const;

/** The six diatonic expansions and their reciprocal pairs in octave inversion: E0↔E5, E1↔E4, E2↔E3. */
export function reciprocalExpansion(expansion: 0 | 1 | 2 | 3 | 4 | 5): number {
  return 5 - expansion;
}

/** Diad transformations (p.1068): a⇄b always; const. ab when the two structures differ diatonically. */
export function diadTransformations(identicalStructures: boolean): string[] {
  return identicalStructures ? ["a⇄b"] : ["a⇄b", "const. ab"];
}

/** The book's counts of structures (p.1076, 1084, 1145). */
export function sigmaCounts() {
  return {
    hybridThreePart: { general: 11 * 12, diatonic: 6 * 7 },
    twoStrataOfTwoParts: { general: 11 ** 3, diatonic: 6 ** 3 },
    twoStrataOfFourParts: { general: structureCount(4) ** 2 * 11, transformations: 24 ** 2, fundamentalPairs: choose(9, 2) },
  };
}

/** A sigma's limit: strata = units (or tonics) x sigmae, parts = strata x parts per stratum, and one more with an added root-tone. */
export function sigmaLimit(units: number, partsPerStratum: number, sigmae = 1): { strata: number; parts: number; withRoot: number } {
  const strata = units * sigmae;
  return { strata, parts: strata * partsPerStratum, withRoot: strata * partsPerStratum + 1 };
}

/** Families of structures by their interval-groups (sum at most 11): count, single-member families, and total members. */
export function structureFamilies(intervalGroups: 2 | 3): { families: number; singleMember: number; members: number } {
  const families: number[][] = [];
  const build = (prefix: number[], min: number) => {
    if (prefix.length === intervalGroups) {
      if (prefix.reduce((a, b) => a + b, 0) <= 11) families.push(prefix);
      return;
    }
    for (let v = min; v <= 11; v++) build([...prefix, v], v);
  };
  build([], 1);
  const membersOf = (f: number[]) => new Set(generalPermutationsOf(f).map((p) => p.join())).size;
  return {
    families: families.length,
    singleMember: families.filter((f) => new Set(f).size === 1).length,
    members: families.reduce((s, f) => s + membersOf(f), 0),
  };
}

/** Members of one family: the distinct orders of its interval-groups -- 1, 2, 3 or 6. */
export function familyMembers(intervalGroups: readonly number[]): number[][] {
  return [...new Set(generalPermutationsOf(intervalGroups).map((p) => p.join()))].map((s) => s.split(",").map(Number));
}

/** Directional units: 3^n forms (neutral, ascending, descending per part) and 5^n intonations (i or 2i each way). */
export function directionalUnitCounts(parts: number): { forms: number; intonations: number } {
  return { forms: 3 ** parts, intonations: 5 ** parts };
}

/**
 * The book's tables of directional units (p.1185-1186): the 3^n forms
 * grouped by how many parts move, each moving part a semitone or a whole
 * tone away (2^m variations) -- for S3p 1 + 12 + 48 + 64 = 125, for S4p the
 * book's 625.
 */
export function directionalUnitsByMotion(parts: number): { moving: number; forms: number; variations: number; total: number }[] {
  return Array.from({ length: parts + 1 }, (_, m) => {
    const forms = choose(parts, m) * 2 ** m;
    return { moving: m, forms, variations: 2 ** m, total: forms * 2 ** m };
  });
}

/** "The manifold of structures of S4p supplied with all the possible directional units": 165 x 3 x 625 = 309,375 (p.1186). */
export function directionalManifold(): number {
  return structureCount(4) * 3 * directionalUnitCounts(4).intonations;
}

/** The harmony of fourths: the scale-degree step of C4, C7, C10 (and C3, C5 ...) -- k - 1 degrees downward. */
export function fourthsCycle(cycle: number, startDegree = 0, length = 7): number[] {
  return Array.from({ length }, (_, k) => (((startDegree - k * (cycle - 1)) % 7) + 7) % 7);
}

/** A tetrad of the harmony of fourths on a degree: functions 1, 4, 7, 10 (E2). */
export function fourthsTetrad(scale: PitchScale, tonic: number, rootDegree: number): number[] {
  return [0, 3, 6, 9].map((d) => midiNoteForDegree(scale, tonic, rootDegree + d));
}

/**
 * Reciprocating strata (p.1139): the upper stratum S(7) on a degree,
 * upward; the lower its tonal inversion around the tonic -- the reflected
 * degree, read downward. Returns both as pitch-class sets.
 */
export function reciprocatingStrata(scale: PitchScale, upperRootDegree: number): { upper: number[]; lower: number[] } {
  const pc = (d: number) => ((midiNoteForDegree(scale, 0, d) % 12) + 12) % 12;
  const upper = [0, 2, 4, 6].map((o) => pc(upperRootDegree + o));
  const lower = [0, -2, -4, -6].map((o) => pc(-upperRootDegree + o));
  return { upper, lower };
}

/** Canon schemes from strata: the orders of imitation times clockwise or counterclockwise (p.1218): 12 for three parts. */
export function canonSchemes(parts: number): number {
  return factorial(parts) * 2;
}

/** Phasic rotation (p.1237-1241): phases add algebraically and wrap at the limit θ. */
export function rotatePhase(start: number, rotations: readonly number[], limit: number): number {
  const total = start + rotations.reduce((a, b) => a + b, 0);
  return ((total % limit) + limit) % limit;
}

/** A resultant with alternating signs: 3 - 1 + 2 - 2 + 1 - 3 = 0, so a rotation group returns to φ0 (Figure 140). */
export function alternatingSigns(group: readonly number[]): number[] {
  return group.map((x, i) => (i % 2 === 0 ? x : -x));
}

/** A density-group m·d over n·t, as the book writes it ("3d3t"), with its area in dt units. */
export function densityGroup(density: number, time: number): { label: string; area: number } {
  const part = (k: number, u: string) => (k === 1 ? u : `${k}${u}`);
  return { label: `${part(density, "d")}${part(time, "t")}`, area: density * time };
}
