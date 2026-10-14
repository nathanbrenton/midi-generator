/**
 * Book VII, Theory of Counterpoint, Chapters 1-5 (p.697-771).
 *
 * Ch.1, harmonic intervals (p.697-707). Consonances by name: unison,
 * octave, fifth, fourth, major and minor thirds and sixths; dissonances
 * by name: seconds, sevenths, ninths. "All the chromatic intervals are
 * classified into augmented and diminished," and each sounds like a
 * diatonic interval -- the augmented unison like a minor 2nd, the
 * augmented 2nd like a minor 3rd ... the diminished 3rd like a major 2nd;
 * the augmented 4th and diminished 5th like no diatonic interval -- so
 * "the following 'dissonant' intervals are actually consonances by
 * sonority: the augmented 2nd, 3rd, 5th; the diminished 7th, 6th, 4th"
 * (`CHROMATIC_INTERVALS`, `bySonority`).
 *
 * Resolution (p.702-703): "1. All diatonic intervals resolve through
 * outward, inward, or oblique motion. Each moving voice moves by a
 * semitone or whole tone. 2. A resolution obtained through oblique motion
 * may be replaced by one in which the formerly sustained voice leaps by a
 * melodic interval of a perfect 4th... 3. All intervals known as 2nds have
 * a tendency to expand... 7ths... to contract... 9ths... to contract. All
 * the 4ths and 5ths are 'neutral'... Thus, the entire range of
 * permutations of semitones and whole tones, with their respective
 * directions, constitutes the entire manifold of resolutions"
 * (`resolutions`). For a major 2nd that is 8 step motions plus 4 oblique
 * ones whose held voice leaps a fourth outward -- the "twelve possible
 * resolutions" of p.702, against the "four... which is the usual case":
 * 4! = 24 orders against 12! = 479,001,600.
 *
 * Ch.2, two-part counterpoint (p.708-725): CP against CF in "four types of
 * harmonic correlation" -- unitonal-unimodal, unitonal-polymodal,
 * polytonal-unimodal, polytonal-polymodal (`correlationType`). With n
 * attacks of CP to one of CF the bars take sequences of consonances (c)
 * and dissonances (d): the book's lists for 2, 3 and 4 attacks are
 * exactly the sequences with at most two dissonances -- 4, 7 and 11
 * (`harmonicPatterns`); five and more add "delayed resolutions" of two
 * dissonances.
 *
 * Ch.4, contrapuntal continuity (p.742-752): CF and CP exchange places
 * ("vertical convertibility in octave"), and each arrangement takes the
 * four geometrical positions -- "the total number of variants for one
 * two-part contrapuntal exposition is therefore eight" (`expositionVariants`),
 * and the book's six relations between positions follow from two
 * properties, upside down or not and backward or not (`positionRelation`).
 *
 * Ch.5, correlation of melodic forms (p.753-760): each part an axial
 * combination (Book IV); the axes are unbalancing (U: a, d), balancing
 * (B: b, c) or balanced (0). Binomial against monomial: "10 original
 * binomial axial combinations, each having 2 permutations... combined
 * vertically with 5 monomials... 20 x 5 = 100... multiplied by 2... 200";
 * 12 forms of balance with U and B only, 15 more with 0; trinomial against
 * monomial: 120 x 5 = 600 combinations and 54 + 18 = 72 forms of balance
 * (`axialCombinationCounts`, `balanceForms`); and each form of balance
 * expands into axes, U as a or d, B as b or c (`axesForBalance`).
 */

import { generalPermutationsOf } from "./permutations.ts";
import type { AxisType } from "./melodicAxes.ts";
import type { GeometricalPosition } from "./geometricalInversions.ts";

// ---- Ch.1 ---------------------------------------------------------------------------------

/** Diatonic intervals by semitones within the octave, with their class (p.701). */
export const DIATONIC_INTERVALS: readonly { name: string; semitones: number; consonant: boolean }[] = [
  { name: "unison", semitones: 0, consonant: true },
  { name: "minor 2nd", semitones: 1, consonant: false },
  { name: "major 2nd", semitones: 2, consonant: false },
  { name: "minor 3rd", semitones: 3, consonant: true },
  { name: "major 3rd", semitones: 4, consonant: true },
  { name: "perfect 4th", semitones: 5, consonant: true },
  { name: "perfect 5th", semitones: 7, consonant: true },
  { name: "minor 6th", semitones: 8, consonant: true },
  { name: "major 6th", semitones: 9, consonant: true },
  { name: "minor 7th", semitones: 10, consonant: false },
  { name: "major 7th", semitones: 11, consonant: false },
  { name: "octave", semitones: 12, consonant: true },
  { name: "minor 9th", semitones: 13, consonant: false },
  { name: "major 9th", semitones: 14, consonant: false },
];

/** The chromatic intervals with their size in semitones (p.701-702). */
export const CHROMATIC_INTERVALS: readonly { name: string; semitones: number }[] = [
  { name: "augmented unison", semitones: 1 },
  { name: "augmented 2nd", semitones: 3 },
  { name: "augmented 3rd", semitones: 5 },
  { name: "augmented 4th", semitones: 6 },
  { name: "augmented 5th", semitones: 8 },
  { name: "augmented 6th", semitones: 10 },
  { name: "diminished octave", semitones: 11 },
  { name: "diminished 7th", semitones: 9 },
  { name: "diminished 6th", semitones: 7 },
  { name: "diminished 5th", semitones: 6 },
  { name: "diminished 4th", semitones: 4 },
  { name: "diminished 3rd", semitones: 2 },
];

/** The diatonic interval a chromatic one sounds like, or null ("no diatonic interval," the tritone). */
export function bySonority(semitones: number): { name: string; consonant: boolean } | null {
  return DIATONIC_INTERVALS.find((d) => d.semitones === semitones) ?? null;
}

export type Tendency = "expand" | "contract" | "neutral";

/** 2nds expand; 7ths and 9ths contract; 4ths and 5ths are neutral (p.703). */
export function tendencyOf(semitones: number): Tendency {
  if (semitones <= 2) return "expand";
  if (semitones >= 10) return "contract";
  return "neutral";
}

/** One resolution: how far each voice moves, and the interval reached. */
export interface Resolution {
  lower: number;
  upper: number;
  result: number;
  leap: boolean;
}

/**
 * Every resolution of a harmonic interval: each voice holds or moves a
 * semitone or whole tone in the tendency's direction (both for the
 * neutral 4ths and 5ths), and every oblique case again with the held
 * voice leaping a perfect 4th the same way (p.702-703).
 */
export function resolutions(semitones: number, tendency: Tendency = tendencyOf(semitones)): Resolution[] {
  const out: Resolution[] = [];
  const directions = tendency === "neutral" ? (["expand", "contract"] as const) : [tendency];
  for (const dir of directions) {
    const lowerMoves = dir === "expand" ? [0, -1, -2] : [0, 1, 2];
    const upperMoves = dir === "expand" ? [0, 1, 2] : [0, -1, -2];
    for (const lower of lowerMoves) {
      for (const upper of upperMoves) {
        if (lower === 0 && upper === 0) continue;
        out.push({ lower, upper, result: semitones + upper - lower, leap: false });
        if (lower === 0) out.push({ lower: dir === "expand" ? -5 : 5, upper, result: semitones + upper - (dir === "expand" ? -5 : 5), leap: true });
        if (upper === 0) out.push({ lower, upper: dir === "expand" ? 5 : -5, result: semitones + (dir === "expand" ? 5 : -5) - lower, leap: true });
      }
    }
  }
  return out;
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** "Four elements... twenty-four variations and the second giving 479,001,600" (p.702). */
export function resolutionOrders(count: number): number {
  return factorial(count);
}

// ---- Ch.2 ---------------------------------------------------------------------------------

export type CorrelationType = "unitonal-unimodal" | "unitonal-polymodal" | "polytonal-unimodal" | "polytonal-polymodal";

/**
 * The four types of harmonic correlation (p.709): the same key signature
 * (the same pitch collection) makes the parts unitonal, the same scale
 * structure from each root unimodal.
 */
export function correlationType(rootA: number, degreesA: readonly number[], rootB: number, degreesB: readonly number[]): CorrelationType {
  const set = (root: number, d: readonly number[]) => [...new Set(d.map((x) => (root + x) % 12))].sort((a, b) => a - b).join();
  const unitonal = set(rootA, degreesA) === set(rootB, degreesB);
  const unimodal = degreesA.join() === degreesB.join();
  return `${unitonal ? "unitonal" : "polytonal"}-${unimodal ? "unimodal" : "polymodal"}` as CorrelationType;
}

/** "Any two scales -- the root tones of which produce a consonance -- may be used" (p.711). */
export function rootsConsonant(rootA: number, rootB: number): boolean {
  const i = (((rootB - rootA) % 12) + 12) % 12;
  return [0, 3, 4, 5, 7, 8, 9].includes(i);
}

/** Sequences of consonance (c) and dissonance (d) for n attacks of CP to one of CF, at most `maxDissonances` dissonant (p.711-716). */
export function harmonicPatterns(attacks: number, maxDissonances = 2): string[] {
  const out: string[] = [];
  for (let m = 0; m < 2 ** attacks; m++) {
    const pattern = Array.from({ length: attacks }, (_, k) => ((m >> (attacks - 1 - k)) & 1 ? "d" : "c")).join("");
    if ([...pattern].filter((x) => x === "d").length <= maxDissonances) out.push(pattern);
  }
  return out;
}

// ---- Ch.4 ---------------------------------------------------------------------------------

const POSITIONS: readonly GeometricalPosition[] = ["a", "b", "c", "d"];

/** CF above or below CP, each in the four positions: eight variants (p.744). */
export function expositionVariants(): { upper: "CF" | "CP"; position: GeometricalPosition }[] {
  return (["CF", "CP"] as const).flatMap((upper) => POSITIONS.map((position) => ({ upper, position })));
}

const UPSIDE_DOWN: Record<GeometricalPosition, boolean> = { a: false, b: false, c: true, d: true };
const BACKWARD: Record<GeometricalPosition, boolean> = { a: false, b: true, c: true, d: false };

/** How two positions compare in intonation and in temporal structure (p.749's six principles). */
export function positionRelation(x: GeometricalPosition, y: GeometricalPosition): { intonation: "identical" | "converse"; temporal: "identical" | "converse" } {
  return {
    intonation: UPSIDE_DOWN[x] === UPSIDE_DOWN[y] ? "identical" : "converse",
    temporal: BACKWARD[x] === BACKWARD[y] ? "identical" : "converse",
  };
}

// ---- Ch.5 ---------------------------------------------------------------------------------

export type Balance = "0" | "U" | "B";

/** a and d unbalance, b and c balance, 0 is balanced (p.754). */
export function balanceOf(axis: AxisType): Balance {
  return axis === "0" ? "0" : axis === "a" || axis === "d" ? "U" : "B";
}

const AXES: readonly AxisType[] = ["0", "a", "b", "c", "d"];

/** Axial combinations of n terms (n = 1, 2, 3) against a monomial, as the book counts them (p.754-756). */
export function axialCombinationCounts(): { binomial: number; trinomial: number } {
  // Binomials: two different axes in either order (10 x 2); trinomials: two alike (60) or all different (60).
  const binomials = AXES.flatMap((x) => AXES.filter((y) => y !== x).map((y) => [x, y]));
  const trinomials = AXES.flatMap((x) => AXES.flatMap((y) => AXES.map((z) => [x, y, z]))).filter((t) => new Set(t).size > 1);
  return { binomial: binomials.length * AXES.length * 2, trinomial: trinomials.length * AXES.length };
}

/**
 * Forms of balance of an n-term combination against a monomial (p.755-756):
 * every sequence of 0, U, B against 0, U or B, excluding a constant
 * sequence for trinomials. Binomials split into the 12 forms of U and B
 * and 15 more with 0.
 */
export function balanceForms(terms: 2 | 3): { forms: string[][]; withoutZero: number; withZero: number } {
  const values: Balance[] = ["0", "U", "B"];
  let sequences: Balance[][] = [[]];
  for (let k = 0; k < terms; k++) sequences = sequences.flatMap((s) => values.map((v) => [...s, v]));
  if (terms === 3) sequences = sequences.filter((s) => new Set(s).size > 1);
  const forms = sequences.flatMap((s) => values.map((m) => [...s, m]));
  const withoutZero = sequences.filter((s) => !s.includes("0")).length * values.length;
  return { forms, withoutZero, withZero: forms.length - withoutZero };
}

/** The axes a form of balance stands for: U as a or d, B as b or c, 0 as 0 (p.756-757). */
export function axesForBalance(balance: readonly Balance[]): AxisType[][] {
  const choices: Record<Balance, AxisType[]> = { "0": ["0"], U: ["a", "d"], B: ["b", "c"] };
  return balance.reduce<AxisType[][]>((acc, b) => acc.flatMap((prefix) => choices[b].map((axis) => [...prefix, axis])), [[]]);
}

/** Every order of a set of parts (SATB has 24). */
export function partPermutations<T>(parts: readonly T[]): T[][] {
  return generalPermutationsOf(parts);
}

// ---- Ch.9-12: two-part melodization, attack-groups, ostinato ----------------------------

/**
 * "Each original setting of two simultaneous melodies accompanied by a
 * chord progression offers seven forms of exposition" (p.824): M_I, M_II
 * or H alone, either melody with the harmony, the two melodies, all three
 * -- every non-empty combination of the three parts (p.843 names them
 * solo melody, solo harmony, accompanied melody, duet, accompanied duet).
 */
export function expositionCombinations(): string[][] {
  const parts = ["MI", "MII", "H"];
  return Array.from({ length: 7 }, (_, m) => parts.filter((_, k) => ((m + 1) >> k) & 1));
}

const choose = (n: number, k: number): number => (k === 0 ? 1 : (n * choose(n - 1, k - 1)) / k);

/** "Any d0 produces 35 possibilities of modal relations" among M_I, M_II and H (7C3); "the number of possible two-part melodizations to one chord-progression... is 21" (7C2) (p.825). */
export function modalRelations(): { threeParts: number; twoMelodies: number } {
  return { threeParts: choose(7, 3), twoMelodies: choose(7, 2) };
}

/**
 * Ch.10 B (p.841-842): three synchronized powers of one polynomial -- the
 * cube for M_I, the square for M_II, the first power for H -- each part's
 * terms grouping by the polynomial's length into the next: (2 + 1 + 1)
 * gives 27, 9 and 3 attacks, M_I = (8t + 4t + 4t) + ... over M_II = 16t + 8t
 * + 8t over H = 32t + 16t + 16t.
 */
export function threePowerSynchronization(polynomial: readonly number[]): { mI: number[]; mII: number[]; h: number[] } {
  const sum = polynomial.reduce((a, b) => a + b, 0);
  const power = (p: number) => {
    let terms = [...polynomial];
    for (let k = 1; k < p; k++) terms = terms.flatMap((t) => polynomial.map((u) => t * u));
    return terms;
  };
  return { mI: power(3), mII: power(2).map((t) => t * sum), h: polynomial.map((t) => t * sum * sum) };
}

/**
 * Ch.12: an ostinato repeats one group (bass, harmony or cantus firmus)
 * while the rest changes; a counterpart of a different length -- "a 3-bar
 * group" against the C.F. -- interferes with it, both meeting again after
 * lcm(bars) bars (p.878).
 */
export function ostinatoCycle(ostinatoBars: number, counterpartBars: number): { bars: number; ostinatoRepeats: number; counterpartRepeats: number } {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const bars = (ostinatoBars * counterpartBars) / gcd(ostinatoBars, counterpartBars);
  return { bars, ostinatoRepeats: bars / ostinatoBars, counterpartRepeats: bars / counterpartBars };
}
