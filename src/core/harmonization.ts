/**
 * Book VI, Chapter 3: The Harmonization of Melody (p.666-689).
 *
 * Melodization reversed. "By the pure method of combinations": diatonic,
 * chromatic or symmetric harmonization of a diatonic, symmetric or
 * chromatic melody -- nine forms (`HARMONIZATION_FORMS`).
 *
 * Section A, diatonic harmonization of a diatonic melody, takes two
 * decisions: how many melodic attacks one chord harmonizes (M/H = 1, 2,
 * 3, 4, 6, 12 for twelve tones, or a resultant, Figure 48), and the range
 * of tension. A group of melodic tones under one chord makes each tone a
 * function of that chord's root (`groupAssignments`): Figure 45's groups
 * read "13-7-1-9" over C, "9-7-13-1" over D, "13-7-1-9" over G; one chord
 * can harmonize all twelve "because no pitch-unit in a diatonic scale may
 * exceed the function of 13th." Among the choices, "we will give
 * preference to those forming a positive cycle of roots for the chords"
 * (`harmonize`).
 *
 * Section C, symmetric harmonization: a preselected master-structure
 * Σ(13), each melodic form placed where its intervals fit the Σ
 * (`placements`). With Σ = c-e-g-b♭-d-f♯-a (XIII), "a melody... such as
 * c - e♭ - b♭ may be placed on the above Σ as 3-5-9 or 13-1-5. No other
 * location of this melodic form is possible." The search finds those two
 * and one more the book overlooks, 11-13-3 (f♯-a-e: a minor third and a
 * minor seventh, like c-e♭-b♭). "The note c may be
 * satisfied by the following chords: C, B♭, A♭, G♭, F, E♭, D"
 * (`chordsForNote`).
 *
 * Section D's first method assigns a sectional scale's three tones in
 * turn to the seven consecutive triples of the Σ (9-11-13 as 1-3-5, 3-5-7,
 * ...): with three groups, "7 cases with constant tension... 18 x 7 = 126
 * cases on a tension that is constant for 2 of the three groups. 35 x 6 =
 * 210 cases with variable tension for all 3 groups... 7 + 126 + 210 =
 * 343" -- 7³ (`assignmentCount`). The second method, a Σ chosen for its
 * sonority, may fit a minor triad only twice: on XIII, "5-7-9 and 13-1-3"
 * -- 2³ = 8 harmonizations (Figure 62).
 */

import { cycleBetween } from "./diatonicHarmony.ts";
import type { MasterStructure } from "./masterStructures.ts";

export const HARMONIZATION_FORMS = (["diatonic", "symmetric", "chromatic"] as const).flatMap((melody) =>
  (["diatonic", "chromatic", "symmetric"] as const).map((harmony) => ({ harmony, melody })),
);

const FUNCTION_OF_OFFSET = [1, 9, 3, 11, 5, 13, 7]; // scale-degree offset above the root -> function

/** The function a tone (scale degree) has over a root (scale degree): c over C is 1, a over C is 13, d over C is 9. */
export function functionOf(toneDegree: number, rootDegree: number): number {
  return FUNCTION_OF_OFFSET[(((toneDegree - rootDegree) % 7) + 7) % 7];
}

/** Every root under which all of a group's tones are functions inside the range of tension. */
export function groupAssignments(toneDegrees: readonly number[], range: readonly [number, number] = [1, 13]): { rootDegree: number; functions: number[] }[] {
  return Array.from({ length: 7 }, (_, rootDegree) => ({ rootDegree, functions: toneDegrees.map((t) => functionOf(t, rootDegree)) })).filter(
    ({ functions }) => functions.every((f) => f >= range[0] && f <= range[1]),
  );
}

/**
 * Harmonizes a melody (scale degrees), `groups` giving how many tones each
 * chord takes: for each group, a root whose functions lie in the range,
 * preferring the one a positive cycle (C5, then C3, then C7) away from
 * the last root, and otherwise the first. Returns null if some group has
 * no root in range.
 */
export function harmonize(
  toneDegrees: readonly number[],
  groups: readonly number[],
  range: readonly [number, number] = [1, 13],
): { rootDegree: number; functions: number[] }[] | null {
  const result: { rootDegree: number; functions: number[] }[] = [];
  let next = 0;
  for (const size of groups) {
    const group = toneDegrees.slice(next, next + size);
    next += size;
    if (group.length === 0) break;
    const options = groupAssignments(group, range);
    if (options.length === 0) return null;
    const previous = result[result.length - 1]?.rootDegree;
    const rank = (o: { rootDegree: number }) =>
      previous === undefined ? 0 : [5, 3, 7].indexOf(cycleBetween(previous, o.rootDegree) as number) === -1 ? 9 : [5, 3, 7].indexOf(cycleBetween(previous, o.rootDegree) as number);
    result.push([...options].sort((a, b) => rank(a) - rank(b))[0]);
  }
  return result;
}

const FUNCTIONS = [1, 3, 5, 7, 9, 11, 13];

/**
 * Where a melodic form fits a master-structure: every set of its
 * functions whose pitch classes have the form's intervals, in the form's
 * order, at some transposition. Returns the functions, one per tone.
 */
export function placements(sigma: MasterStructure, formPitchClasses: readonly number[]): number[][] {
  const pcs = sigma.offsets.map((o) => o % 12);
  const shape = formPitchClasses.map((p) => (((p - formPitchClasses[0]) % 12) + 12) % 12);
  const found: number[][] = [];
  for (let first = 0; first < 7; first++) {
    const indices = shape.map((d) => pcs.indexOf((pcs[first] + d) % 12));
    if (indices.every((i) => i >= 0)) found.push(indices.map((i) => FUNCTIONS[i]));
  }
  return found;
}

/** The chord roots (pitch classes) under which a note is one of the Σ's functions: c over XIII is satisfied by C, B♭, A♭, G♭, F, E♭, D. */
export function chordsForNote(sigma: MasterStructure, notePitchClass: number): { root: number; function: number }[] {
  return sigma.offsets.map((o, i) => ({ root: (((notePitchClass - o) % 12) + 12) % 12, function: FUNCTIONS[i] }));
}

/** The consecutive triples of a Σ (1-3-5, 3-5-7, ... 13-1-3) that have a triad's intervals. */
export function triadPlacements(sigma: MasterStructure, triad: readonly [number, number]): number[][] {
  const pcs = sigma.offsets.map((o) => o % 12);
  return FUNCTIONS.map((_, i) => [i, (i + 1) % 7, (i + 2) % 7])
    .filter(([a, b, c]) => (pcs[b] - pcs[a] + 12) % 12 === triad[0] && (pcs[c] - pcs[b] + 12) % 12 === triad[1])
    .map((idx) => idx.map((i) => FUNCTIONS[i]));
}

/** Assignments of `options` per group to `groups` groups, split as the book counts them: all equal, two equal, all different (p.680). */
export function assignmentCount(options: number, groups = 3): { constant: number; twoEqual: number; variable: number; total: number } {
  const constant = options;
  const twoEqual = groups === 3 ? options * (options - 1) * 3 : 0;
  const variable = groups === 3 ? options * (options - 1) * (options - 2) : 0;
  return { constant, twoEqual, variable, total: options ** groups };
}
