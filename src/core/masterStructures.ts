/**
 * The master-structures Σ(13) (Book VI Ch.2 D, p.654-657, Figure 27).
 *
 * "The complete manifold of Σ(13) families corresponds to the 36
 * seven-unit pitch-scales which contain the seven names of non-identical
 * pitches; the Σ(13) is the first expansion (E1) of such scales. We shall
 * classify all forms by considering 1, 3, 5 and 7 to be the lower
 * structure [as S(7)], with 9, 11 and 13 constituting the upper structure
 * [as S(5)], eliminating all enharmonic coincidences and eliminating all
 * those adjacent thirds which do not satisfy i = 3 or i = 4."
 *
 * Six thirds of 3 or 4 semitones whose seven tones are all different
 * pitch classes: exactly 36 (`SIGMA_13`). That also accounts for "the 36
 * such scales" of Book V Ch.1 (p.359) and the "36 fundamental scale
 * structures... 36 x 7 = 252" of Ch.14 (p.521), which no reading of
 * "seven names, none repeated" alone produces: their E0 (`sigmaScale`).
 *
 * Figure 27's numbering, read off the page and matched against every
 * accidental of all 36: the lower S(7) in the order of Book V's S(7)
 * table (major, minor, large, small, diminished, augmented I, augmented
 * II); within it, the natural 9 before the altered; within that, the
 * upper triad on 9 as S1, S2, S3, S4 (major, minor, augmented,
 * diminished). So II is the natural major, c-e-g-b-d-f-a, and XIII
 * c-e-g-b♭-d-f♯-a, "a large S(7) and a major S(5)... the most obvious of
 * the master-structures" (p.657).
 */

import { S7_STRUCTURES } from "./symmetricHarmony.ts";

const LETTERS = ["c", "e", "g", "b", "d", "f", "a"] as const;
const NATURAL = [0, 4, 7, 11, 14, 17, 21];
const UPPER_ORDER = ["4,3", "3,4", "4,4", "3,3"]; // S1..S4

export interface MasterStructure {
  /** Figure 27's number, 1-36. */
  number: number;
  roman: string;
  /** The six thirds, from 1 to 13. */
  thirds: readonly number[];
  /** Semitones above the root of 1, 3, 5, 7, 9, 11, 13. */
  offsets: readonly number[];
  /** Spelled on c: "c e g b♭ d f♯ a". */
  spelled: string;
  lower: string;
  upper: string;
}

function roman(n: number): string {
  const table: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}

function build(): MasterStructure[] {
  const stacks: number[][] = [];
  for (let m = 0; m < 64; m++) {
    const thirds = Array.from({ length: 6 }, (_, k) => ((m >> k) & 1 ? 4 : 3));
    const offsets = thirds.reduce((acc, t) => [...acc, acc[acc.length - 1] + t], [0]);
    if (new Set(offsets.map((o) => o % 12)).size === 7) stacks.push(thirds);
  }
  const lowerOrder = Object.values(S7_STRUCTURES).map((s) => s.intervals.join(","));
  const key = (t: number[]) => {
    const offsets = t.reduce((acc, x) => [...acc, acc[acc.length - 1] + x], [0]);
    return [
      lowerOrder.indexOf(t.slice(0, 3).join(",")),
      offsets[4] === 14 ? 0 : 1, // natural 9 first
      UPPER_ORDER.indexOf(t.slice(4).join(",")),
    ];
  };
  stacks.sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  const lowerNames = Object.values(S7_STRUCTURES).map((s) => s.name);
  const upperNames = ["major", "minor", "augmented", "diminished"];
  return stacks.map((thirds, i) => {
    const offsets = thirds.reduce((acc, t) => [...acc, acc[acc.length - 1] + t], [0]);
    const spelled = offsets
      .map((o, k) => {
        const acc = o - NATURAL[k];
        return LETTERS[k] + (acc > 0 ? "♯".repeat(acc) : "♭".repeat(-acc));
      })
      .join(" ");
    return {
      number: i + 1,
      roman: roman(i + 1),
      thirds,
      offsets,
      spelled,
      lower: lowerNames[key(thirds)[0]],
      upper: upperNames[key(thirds)[2]],
    };
  });
}

/** Figure 27, in the book's order. */
export const SIGMA_13: readonly MasterStructure[] = build();

/** The seven-unit scale (E0) a master-structure is the first expansion of: 1, 9, 3, 11, 5, 13, 7 in an octave. */
export function sigmaScale(structure: MasterStructure): number[] {
  return [...structure.offsets].map((o) => o % 12).sort((a, b) => a - b);
}

/** Styles from one, two or three master-structures at a time: 36, 36² = 1,296, 36³ = 46,656 (p.655). */
export function sigmaStyles(blended: 1 | 2 | 3): number {
  return SIGMA_13.length ** blended;
}

/** A substructure of a master-structure on a root: S(5), S(7), S(9), S(11) take its 1-3-5, 1-3-5-7, 1-3-7-9, 1-7-9-11 (p.655, Figure 28). */
export function sigmaSubstructure(structure: MasterStructure, tension: 5 | 7 | 9 | 11, rootMidiNote: number): number[] {
  const fns = { 5: [0, 1, 2], 7: [0, 1, 2, 3], 9: [0, 1, 3, 4], 11: [0, 3, 4, 5] }[tension];
  return fns.map((i) => rootMidiNote + structure.offsets[i]);
}
