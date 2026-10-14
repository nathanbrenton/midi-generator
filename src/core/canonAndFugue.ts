/**
 * Book VII, Chapters 7-8: Canons and Canonic Imitation; The Art of the
 * Fugue (p.777-813).
 *
 * "Continuous imitation consists of one melody coexisting in two or more
 * different parts in its different phases and at a velocity that remains
 * constant in any given part" (p.777): each voice is the leader shifted by
 * its delay and transposed into its own scale (`canon`). Its temporal
 * structure is two elements in reciprocal permutation, P1 = a + b + a + b
 * ... over P2 = (rest) + a + b ..., the follower's a under the leader's b
 * (`canonTemporalStructure`). "Cadences are produced by leading tones
 * moving into the primary axis."
 *
 * The fugue, "a complete composition based on discontinuous imitation":
 * exposition E1 = P1: CF + CP over P2: (rest) + CF, any later exposition CF
 * + CP over CP + CF; "quadrant rotation applied to theme and reply produces
 * altogether 16 geometrical forms of exposition" (Figure 94,
 * `expositionForms`), the four with one position for both lying on its
 * diagonal. Successive expositions keep the parts' vertical relation by
 * moving the theme's axis: in type II with CF on c and CP on e, "the axis
 * of CF2 must be a and CP2 must have P.A. on c" -- c, a, f, d down the
 * scale; in type III on ∜2 with CP three semitones above, c, a, f♯, e♭
 * (`expositionAxes`). The interludes' durations follow six schemes
 * (`INTERLUDE_SCHEMES`), and a modulating interlude translates four-part
 * chords into two parts: S(3) = 1, 3; S(5) = 1, 5; S(7) = 1, 7 (or 3, 7)
 * (`TWO_PART_STRUCTURES`).
 */

import type { GeometricalPosition } from "./geometricalInversions.ts";
import { midiNoteForDegree, type PitchScale } from "./scales.ts";

export interface CanonNote {
  midiNote: number;
  startUnits: number;
  durationUnits: number;
}

/**
 * A canon: the leader in voice 0, each follower entering `delayUnits` after
 * the previous, its melody moved by `degreeShifts[k]` scale degrees in its
 * scale (type I and III keep intonation; a different scale, type II or IV,
 * changes it). `melodyDegrees` and `durations` describe the leader.
 */
export function canon(
  melodyDegrees: readonly number[],
  durations: readonly number[],
  delayUnits: number,
  voices: readonly { scale: PitchScale; tonic: number; degreeShift: number }[],
): CanonNote[][] {
  const starts = durations.reduce<number[]>((acc, d, i) => [...acc, i === 0 ? 0 : acc[i - 1] + durations[i - 1]], []);
  return voices.map((v, k) =>
    melodyDegrees.map((deg, i) => ({
      midiNote: midiNoteForDegree(v.scale, v.tonic, deg + v.degreeShift),
      startUnits: starts[i] + k * delayUnits,
      durationUnits: durations[i],
    })),
  );
}

/** The two-element temporal structure of a two-part canon: which element each part plays in each section (p.778). */
export function canonTemporalStructure(sections: number): { leader: string[]; follower: string[] } {
  const leader = Array.from({ length: sections }, (_, k) => (k % 2 === 0 ? "a" : "b"));
  const follower = ["rest", ...leader.slice(0, sections - 1)];
  return { leader, follower };
}

const POSITIONS: readonly GeometricalPosition[] = ["a", "b", "c", "d"];

/** Figure 94: theme and reply each in one of four positions, 16 forms; the diagonal keeps one position. */
export function expositionForms(): { theme: GeometricalPosition; reply: GeometricalPosition; diagonal: boolean }[] {
  return POSITIONS.flatMap((theme) => POSITIONS.map((reply) => ({ theme, reply, diagonal: theme === reply })));
}

/**
 * The primary axes of successive expositions (p.806): the theme's axis
 * moves down by the interval separating CP from CF, so that the first
 * part, now the counterpoint, keeps its axis. Type II steps scale
 * degrees in one scale; type III steps semitones by the symmetric
 * interval.
 */
export function expositionAxes(
  type: "II" | "III",
  startPitchClass: number,
  interval: number,
  expositions: number,
  scale?: PitchScale,
): { cf: number; cp: number }[] {
  return Array.from({ length: expositions }, (_, k) => {
    if (type === "II") {
      if (!scale) throw new Error("type II needs the scale");
      const degree = scale.degrees.indexOf(startPitchClass) - k * interval;
      const pc = (d: number) => ((midiNoteForDegree(scale, 0, d) % 12) + 12) % 12;
      return { cf: pc(degree), cp: pc(degree + interval) };
    }
    const cf = (((startPitchClass - k * interval) % 12) + 12) % 12;
    return { cf, cp: (cf + interval) % 12 };
  });
}

/** The six schemes for the durations of interludes against expositions (p.808). */
export const INTERLUDE_SCHEMES = [
  "T(E) = T(I): every interlude as long as an exposition",
  "T(E) > T(I): expositions longer, by an exact ratio",
  "T(E) < T(I): interludes longer, by an exact ratio",
  "I1T + I2·2T + I3·3T ...: each interlude longer -- the interludes come to dominate the theme",
  "I1·nT + I2(n-1)T + ...: each interlude shorter -- the theme comes to dominate",
  "interludes in some rhythmic grouping",
] as const;

/** Durations of successive interludes under schemes 4 and 5 (growing or shrinking by one unit). */
export function interludeDurations(scheme: "growing" | "shrinking", count: number, unit = 1): number[] {
  return Array.from({ length: count }, (_, k) => (scheme === "growing" ? k + 1 : count - k) * unit);
}

/** Figure 111: the chord structures of two-part harmony. */
export const TWO_PART_STRUCTURES = {
  "S(3)": [1, 3],
  "S(5)": [1, 5],
  "S(7)": [1, 7],
  "S(7) incomplete": [3, 7],
} as const;
