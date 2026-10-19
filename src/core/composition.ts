/**
 * Book XI: Theory of Composition (p.1277-1477).
 *
 * Part I (Ch.1-9): a thematic unit grows from one major component (rhythm,
 * scale, melody, harmony, melodization, counterpoint, density or
 * instrumental resources), with the others as minor components; it reuses
 * the earlier books' techniques. Two mechanisms are new:
 *   - Ch.5, harmony rhythmized by reciprocating binomials: a duration-group
 *     of an even number of terms that pairs into binomials and their
 *     reverses, perhaps with one balanced binomial -- the resultants of
 *     generators a unit apart, r3÷2, r4÷3, r5÷4 ... (and r6÷5, which the book
 *     reaches by doubling 2+1 and 1+2: 5+1, 4+2, 3+3). Each part takes the
 *     binomials in its own circular permutation; the balanced one stays put
 *     (Figure 19). A first term greater than the second is a suspension,
 *     smaller an anticipation (`reciprocatingBinomials`, `binomialParts`).
 *   - Ch.9, scales of dynamics (pp p mf f ff), tone-quality (open, single
 *     reed, stopped, double reed, muted) and attack (legatissimo, legato,
 *     portamento, staccato, staccatissimo): 5 one-unit, 10 two-unit, 10
 *     three-unit and 1 five-unit scales, the best being symmetric: vI + vV,
 *     vII + vIV; vI + vIII + vV, vII + vIII + vIV (`resourceScales`).
 *
 * Part II (Ch.10-16), composition of thematic continuity:
 *   - Ch.11, four groups of thematic sequence for 1-7 subjects -- direct
 *     recurrence, symmetric recurrence (A+B+C+B+A), modified recurrence
 *     (circular permutations) and progressive symmetry, where subjects enter
 *     in growing groups from the first and leave in shrinking groups to the
 *     last: 1+2+4+2+1, 1+3+5+3+1 ... (`thematicSequence`).
 *   - Ch.12, temporal coordination: a coefficient group is laid over the
 *     appearances in order, and "the use of interference necessitates the
 *     recurrence of the entire thematic sequence" until both close
 *     (`coordinate`). Every worked example checks: r4÷3 over one subject,
 *     (3+1)² = 9+3+3+1, (3+1)³ over A+B, (2+1+1)² over direct and circular
 *     A+B+C, 1+2+3 over the progressive form.
 *   - Ch.13: the subject is the thematic unit at its maximal duration, so
 *     with 3+1+2 over (A+B+C) circular the subjects are A1, B2 and C3
 *     (`subjectsOf`); a fragmentary exposition takes the first, middle or
 *     last fragment by its place in the whole (`fragmentFor`).
 *   - Ch.14, planning: clock-time in t (3 minutes at t = 1/4 s is 720t);
 *     exposition counts by ratio; periods per exposition (`distributePeriod`:
 *     4A in 90 s by 3+1+2+2 gives 33.75, 11.25, 22.5, 22.5); climaxes where
 *     the terms of a ratio meet (`climaxPositions`: 3+1 at the last quarter,
 *     5+3 at the sixth eighth, (3+1)² and (5+3)² for three); r(3÷4÷7) over
 *     four subjects, totals 40, 30, 6, 8 and 24, 18, 22, 20T; and t'
 *     (`subjectSaturation`: 256t, 64t', 128t', all 64 s, with 160, 40, 80
 *     attacks).
 *   - Ch.16, the polythematic miniature: progressive symmetry of A, B, C, A
 *     growing 4+8+16, B constant 14, C declining 16+8+4 T": 28 + 42 + 28 =
 *     98T", a ratio 2:3:2, 196 seconds at T" = 2 s -- "3 minutes, 16
 *     seconds" (`POLYTHEMATIC_EXAMPLE`). The book prints "96·2 = 196": its
 *     own total is 98T" (checked on the page), so 96 is a misprint.
 *   - Ch.15, Schillinger's own pieces check: Study in Rhythm I's roots fall
 *     4+3+3+4+3+4+4+4+3+4+4 from F through the twelve printed chords, and
 *     Study in Rhythm II is seven circular permutations of r5÷3 in two
 *     parts, 7·15·2 = 210t, fourteen bars of 15t.
 *
 * Part III (Ch.17-19), semantic composition:
 *   - the psychological dial (Figure 57): abnormal 0°/360°, subnatural 45°,
 *     infranormal 90°, subnormal 135°, normal 180°, supernormal 225°,
 *     ultranormal 270°, supernatural 315°; the left half negative, the right
 *     positive; reciprocal pairs across the vertical axis (`DIAL`,
 *     `reciprocalPosition`). An individual whose balance is at 150° needs a
 *     210° stimulus to feel normal (`stimulusFor`).
 *   - Ch.18, gravity: the negative zone's scales and structures put the
 *     smaller intervals below (1+2, 3+3+5, 3+3+4 from 4+3+4), the positive
 *     zone's above (4+3, 3+1, 6+2+1+1, 4+4+3) (`gravity`, `cellScale`);
 *     slowed and hastened records: 33.3/78 per dubbing, about 1/5 twice and
 *     1/13 three times (`dubbingSpeed`).
 *   - Ch.19: 8 + 28 + 56 + 70 + 56 + 28 + 8 = 254 combinations of the eight
 *     patterns, 255 with all eight; 4 × 4 = 16 relations of identity and
 *     intensity; a configurational modulation from a to b by r5÷4,
 *     4a + b + 3a + 2b + 2a + 3b + a + 4b (`configurationalModulation`).
 */

import { generateResultant } from "./resultant.ts";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const choose = (n: number, k: number): number => (k === 0 ? 1 : (n * choose(n - 1, k - 1)) / k);
export const SUBJECT_LETTERS = "ABCDEFG";

// ---------- Ch.5: reciprocating binomials ----------

/** Pairs a duration-group into binomials; it reciprocates when every unequal binomial's reverse is also present. */
export function reciprocatingBinomials(group: readonly number[]): { binomials: [number, number][]; reciprocating: boolean; balanced: [number, number][] } {
  const binomials: [number, number][] = [];
  for (let i = 0; i + 1 < group.length; i += 2) binomials.push([group[i], group[i + 1]]);
  const key = (b: readonly number[]) => b.join("+");
  const counts = new Map<string, number>();
  for (const b of binomials) counts.set(key(b), (counts.get(key(b)) ?? 0) + 1);
  const reciprocating =
    group.length % 2 === 0 && binomials.every((b) => b[0] === b[1] || counts.get(key([b[1], b[0]])) === counts.get(key(b)));
  return { binomials, reciprocating, balanced: binomials.filter((b) => b[0] === b[1]) };
}

/** Resultants with generators a unit apart (3÷2, 4÷3, ...): the practical source of reciprocating binomials. */
export function adjacentResultant(major: number): number[] {
  return generateResultant([major, major - 1]).segments.map((s) => s.duration);
}

/** Figure 19: each part takes the unequal binomials in its own circular permutation; the balanced binomial is a part of its own. */
export function binomialParts(group: readonly number[], parts: number): [number, number][][] {
  const { binomials } = reciprocatingBinomials(group);
  const moving = binomials.filter((b) => b[0] !== b[1]);
  const balanced = binomials.find((b) => b[0] === b[1]);
  const rotations = Array.from({ length: balanced ? parts - 1 : parts }, (_, r) => moving.map((_, k) => moving[(k + r) % moving.length]));
  return balanced ? [...rotations, moving.map(() => balanced)] : rotations;
}

/** "Binomials whose first term is greater than the second produce suspensions... smaller... anticipations." */
export function binomialEffect([a, b]: readonly [number, number]): "suspension" | "anticipation" | "balanced" {
  return a > b ? "suspension" : a < b ? "anticipation" : "balanced";
}

// ---------- Ch.9: scales of instrumental resources ----------

export const DYNAMIC_DEGREES = ["pp", "p", "mf", "f", "ff"] as const;
export const QUALITY_DEGREES = ["open", "single-reed", "stopped", "double-reed", "muted"] as const;
export const ATTACK_DEGREES = ["legatissimo", "legato", "portamento", "staccato", "staccatissimo"] as const;

/** Every scale of k units from five degrees (1-based degrees), and the symmetric ones the book prefers. */
export function resourceScales(units: 1 | 2 | 3 | 5): { all: number[][]; symmetric: number[][] } {
  const all: number[][] = [];
  const build = (prefix: number[], next: number) => {
    if (prefix.length === units) return void all.push(prefix);
    for (let d = next; d <= 5; d++) build([...prefix, d], d + 1);
  };
  build([], 1);
  const symmetric = units === 1 ? all : all.filter((s) => s.every((d, i) => d + s[s.length - 1 - i] === 6));
  return { all, symmetric };
}

// ---------- Ch.11: forms of thematic sequence ----------

/** Progressive symmetry: the sizes of the growing and shrinking groups, as the book lists them for 1-7 subjects. */
export const PROGRESSIVE_SIZES: Readonly<Record<number, readonly (readonly number[])[]>> = {
  1: [[1]],
  2: [[1, 2, 1]],
  3: [[1, 2, 3, 2, 1]],
  4: [[1, 2, 4, 2, 1], [1, 3, 4, 3, 1]],
  5: [[1, 2, 3, 5, 3, 2, 1], [1, 3, 5, 3, 1]],
  6: [[1, 3, 6, 3, 1], [1, 2, 4, 6, 4, 2, 1]],
  7: [[1, 3, 4, 7, 4, 3, 1], [1, 3, 5, 7, 5, 3, 1]],
};

export type SequenceGroup = 1 | 2 | 3 | 4;
export const SEQUENCE_GROUPS: Readonly<Record<SequenceGroup, string>> = {
  1: "direct recurrence",
  2: "symmetric recurrence",
  3: "modified recurrence",
  4: "progressive symmetry",
};

/** The thematic sequence as its bracketed groups of subjects (Ch.11). */
export function thematicSequence(group: SequenceGroup, subjects: number, variant = 0): string[][] {
  const letters = [...SUBJECT_LETTERS.slice(0, subjects)];
  if (group === 1) return [letters];
  if (group === 2) return [...letters, ...letters.slice(0, -1).reverse()].map((l) => [l]);
  if (group === 3) return letters.map((_, r) => [...letters.slice(r), ...letters.slice(0, r)]);
  const sizes = PROGRESSIVE_SIZES[subjects][Math.min(variant, PROGRESSIVE_SIZES[subjects].length - 1)];
  const middle = sizes.indexOf(subjects);
  return sizes.map((size, i) => (i <= middle ? letters.slice(0, size) : letters.slice(subjects - size)));
}

// ---------- Ch.12-13: temporal coordination and subjects ----------

export interface Appearance {
  subject: string;
  /** 1-based exposition number of this subject. */
  exposition: number;
  coefficient: number;
}

/**
 * Lays a coefficient group over the appearances in order. By default the
 * sequence recurs until it and the coefficient group close together (the
 * LCM of their lengths); `appearances` overrides the count.
 */
export function coordinate(sequence: readonly string[], coefficients: readonly number[], appearances?: number): Appearance[] {
  const total = appearances ?? lcm(sequence.length, coefficients.length);
  const seen = new Map<string, number>();
  return Array.from({ length: total }, (_, i) => {
    const subject = sequence[i % sequence.length];
    const exposition = (seen.get(subject) ?? 0) + 1;
    seen.set(subject, exposition);
    return { subject, exposition, coefficient: coefficients[i % coefficients.length] };
  });
}

/** "The subject itself... can be defined as the maximal thematic unit": the exposition with the greatest coefficient. */
export function subjectsOf(appearances: readonly Appearance[]): Record<string, number> {
  const out: Record<string, { exposition: number; coefficient: number }> = {};
  for (const a of appearances) if (!out[a.subject] || a.coefficient > out[a.subject].coefficient) out[a.subject] = a;
  return Object.fromEntries(Object.entries(out).map(([s, a]) => [s, a.exposition]));
}

/** Total temporal coefficient of each subject. */
export function subjectTotals(appearances: readonly Appearance[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of appearances) out[a.subject] = (out[a.subject] ?? 0) + a.coefficient;
  return out;
}

/** A fragmentary exposition takes the first fragment near the beginning, the middle near the center, the last near the end. */
export function fragmentFor(position: number, total: number): "first" | "middle" | "last" {
  const where = total <= 1 ? 0 : position / (total - 1);
  return where < 1 / 3 ? "first" : where > 2 / 3 ? "last" : "middle";
}

/** Symmetric recurrence of a first half: the half, then the same reversed about the axis (Ch.14, r(3÷4÷7)). */
export function symmetricRecurrence(firstHalf: readonly string[]): string[] {
  return [...firstHalf, ...[...firstHalf].reverse()];
}

/** Symmetric key-axes: I + II + III + II + I (Ch.14 I, Ch.16 C-E-G-E-C). */
export function symmetricKeys<T>(keys: readonly T[]): T[] {
  return [...keys, ...keys.slice(0, -1).reverse()];
}

// ---------- Ch.14: planning ----------

/** Clock-time in duration-units: 3 minutes at t = 1/4 sec is 720t. */
export function clockUnits(seconds: number, tSeconds: number): number {
  return Math.round(seconds / tSeconds);
}

/**
 * Seconds per exposition: the whole divided among the subjects by their
 * shares, then each subject's part among its expositions by its
 * coefficient group (p.1358-1359).
 */
export function distributePeriod(totalSeconds: number, shares: readonly number[], coefficientGroups: readonly (readonly number[])[]): number[][] {
  const shareSum = shares.reduce((a, b) => a + b, 0);
  return coefficientGroups.map((group, s) => {
    const part = (totalSeconds * shares[s]) / shareSum;
    const sum = group.reduce((a, b) => a + b, 0);
    return group.map((c) => (part * c) / sum);
  });
}

/** Where intermediate climaxes begin: the meeting points of a ratio's terms, as fractions of the whole. */
export function climaxPositions(ratio: readonly number[]): number[] {
  const total = ratio.reduce((a, b) => a + b, 0);
  let acc = 0;
  return ratio.slice(0, -1).map((r) => (acc += r) / total);
}

/**
 * t' and saturation (p.1363-1365): each subject's T" in its own
 * duration-units, its total, its clock-time, and the attacks of a thematic
 * pattern -- `unitsPerT` long in the subject's own t', with
 * `patternAttacks` attacks -- recurring through it (16, 4, 8 times).
 */
export function subjectSaturation(
  periodsT: number,
  tPrime: number,
  tSeconds: number,
  unitsPerT: number,
  patternAttacks: number,
): { unitsPerT: number; totalUnits: number; seconds: number; recurrences: number; attacks: number } {
  const units = unitsPerT / tPrime;
  const totalUnits = units * periodsT;
  const recurrences = totalUnits / unitsPerT;
  return { unitsPerT: units, totalUnits, seconds: totalUnits * tPrime * tSeconds, recurrences, attacks: patternAttacks * recurrences };
}

/** Ch.16's miniature: progressive symmetry of three subjects, A growing, B constant, C declining (T" = 2 s). */
export const POLYTHEMATIC_EXAMPLE = {
  sequence: [["A"], ["A", "B"], ["A", "B", "C"], ["B", "C"], ["C"]],
  periods: { A: [4, 8, 16], B: [14, 14, 14], C: [16, 8, 4] },
  tPrime: { A: 1, B: 4, C: 2 },
  keys: ["C", "E", "G", "E", "C"],
  dynamics: { A: ["p", "mf", "f"], B: ["f", "p", "mf"], C: ["f", "mf", "p"] },
  secondsPerT: 2,
} as const;

// ---------- Part III: semantics ----------

export const DIAL = [
  { angle: 0, name: "abnormal" },
  { angle: 45, name: "subnatural" },
  { angle: 90, name: "infranormal" },
  { angle: 135, name: "subnormal" },
  { angle: 180, name: "normal" },
  { angle: 225, name: "supernormal" },
  { angle: 270, name: "ultranormal" },
  { angle: 315, name: "supernatural" },
] as const;

/** The reciprocal position across the vertical axis: subnormal-supernormal, infranormal-ultranormal, subnatural-supernatural, normal-abnormal. */
export function reciprocalPosition(angle: number): number {
  return angle === 180 ? 0 : angle === 0 ? 180 : (360 - angle) % 360;
}

export function zoneOf(angle: number): "negative" | "positive" | "axis" {
  const a = ((angle % 360) + 360) % 360;
  return a === 0 || a === 180 ? "axis" : a < 180 ? "negative" : "positive";
}

/** The stimulus that brings an individual whose balance is at `individualNormal` to 180°: 150° needs 210°, 210° needs 150°. */
export function stimulusFor(individualNormal: number): number {
  return 360 - individualNormal;
}

/** Gravity of an interval cell: smaller intervals below (negative zone), above (positive), or balanced. */
export function gravity(cell: readonly number[]): "lower" | "upper" | "balanced" {
  const first = cell[0];
  const last = cell[cell.length - 1];
  return first < last ? "lower" : first > last ? "upper" : "balanced";
}

/** A scale from a repeating interval cell: (1 + 2) gives c db eb e f# g a bb c. */
export function cellScale(cell: readonly number[], tones: number, start = 0): number[] {
  const out = [start];
  for (let i = 0; out.length < tones; i++) out.push(out[out.length - 1] + cell[i % cell.length]);
  return out;
}

/** Playback speed after `dubbings` re-recordings from 78 to 33.3 R.P.M.: about 0.43, 1/5, 1/13. */
export function dubbingSpeed(dubbings: number): number {
  return (33.3 / 78) ** dubbings;
}

/** Combinations of the eight dial patterns, k at a time, and the total (254 without all eight, 255 with). */
export function patternCombinations(): { byCount: number[]; total: number } {
  const byCount = Array.from({ length: 8 }, (_, k) => choose(8, k + 1));
  return { byCount, total: byCount.reduce((a, b) => a + b, 0) };
}

/** The 4 relations of identity and intensity, each constant or variable in both: 16. */
export function relationClasses(): string[] {
  const base = [
    "identical patterns, identical intensities",
    "non-identical patterns, identical intensities",
    "identical patterns, different intensities",
    "non-identical patterns, different intensities",
  ];
  const forms = ["const. identity, const. intensity", "var. identity, const. intensity", "const. identity, var. intensity", "var. identity, var. intensity"];
  return base.flatMap((b) => forms.map((f) => `${b}: ${f}`));
}

/** Configurational modulation from a to b by a resultant's terms, alternately: r5÷4 gives 4a + b + 3a + 2b + 2a + 3b + a + 4b. */
export function configurationalModulation(resultant: readonly number[]): { pattern: "a" | "b"; count: number }[] {
  return resultant.map((count, i) => ({ pattern: i % 2 === 0 ? "a" : "b", count }));
}
