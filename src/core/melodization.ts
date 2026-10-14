/**
 * Book VI, Chapter 1: The Melodization of Harmony (p.619-641).
 *
 * "If melody can be expressed in terms of harmony, i.e., as a sequence of
 * chordal functions and their respective tensions, then a scientific and
 * universal method for the harmonization of melody can well be formulated
 * by reversing the whole system of operations" (p.619). Any melodic tone
 * over Special Harmony's chords is one of seven functions, 1, 3, 5, 7, 9,
 * 11, 13 -- "the scale of tension" (`SCALE_OF_TENSION`), read in a circle.
 * "Clockwise functioning of the consecutive pitch-units of a melody
 * obtains the positive form of tonal cycles": a held c as 1, 3, 5 ... 13,
 * 1 lies over C A F D B G E C -- C3, positive cycles running downward as
 * in Book V; as 1, 5, 9, 13, 3, 7, 11 it gives C5 (C F B E A D G), and as
 * 1, 7, 13, 5, 11, 3, 9 C7 (C D E F G A B); read backwards, the negative
 * forms (`rootsUnderHeldTone`, `cycleOfFunctions`).
 *
 * "Every chord has seven forms of melodization" (Figure 4), but not all
 * are satisfactory: "high functions, without support from the
 * immediately preceding function in harmony are not ordinarily
 * acceptable." Table I (Figure 5, M/H = 1) lists, for each tension, the
 * functions the melody may add to those the chord already has
 * (`MELODIZATION_TABLE`, `melodizingFunctions`): S(5) takes 7 and 13 --
 * "the 13 is fully satisfactory... because by sonority it converts an S(5)
 * into S(7)" -- but not the 9 and 11 of Figure 4. Table II (Figure 7) adds,
 * with two or more attacks per chord, 9 over S(5) when preceded by 7 and
 * 11 over S(7) when preceded by 9, the root in the bass. "About five
 * practical pitch-units" per chord make 5^8 = 390,625 melodizations of
 * eight chords (`melodizationCount`).
 *
 * "The two fundamental factors which determine the quality and the
 * character of melodization are: (a) the range of tension; (b) the
 * melodic pattern, i.e., the axial combinations" -- `melodize` chooses,
 * chord by chord, a usable function within a range R and moves along a
 * Book IV axis (a ascending, b descending, 0 holding, or the compound
 * a + b and b + a of Figure 6).
 */

import { cycleBetween } from "./diatonicHarmony.ts";
import { midiNoteForDegree, type PitchScale } from "./scales.ts";

export const SCALE_OF_TENSION = [1, 3, 5, 7, 9, 11, 13] as const;
export type TensionFunction = (typeof SCALE_OF_TENSION)[number];

/** The roots of the chords under one held melody tone (a scale degree) read as the given functions in turn: root = tone - (f - 1) degrees. */
export function rootsUnderHeldTone(toneDegree: number, functions: readonly number[]): number[] {
  return functions.map((fn) => ((((toneDegree - (fn - 1)) % 7) + 7) % 7));
}

/** The cycle that moves a held tone from function f of one chord to function g of the next: 1 -> 3 is C3, 1 -> 5 C5, 1 -> 7 C7. */
export function cycleOfFunctions(from: number, to: number): number {
  return cycleBetween(0, from - to);
}

export type Tension = "S(5)" | "S(7)" | "S(9)" | "S(11)" | "S(13)";

/** Table I (Figure 5, M/H = 1): each tension's chord functions (H) and the functions the melody may add (M); S(13) has two forms. */
export const MELODIZATION_TABLE: readonly { tension: Tension; harmony: readonly number[]; melody: readonly number[] }[] = [
  { tension: "S(5)", harmony: [1, 3, 5], melody: [7, 13] },
  { tension: "S(7)", harmony: [1, 3, 5, 7], melody: [9, 13] },
  { tension: "S(9)", harmony: [1, 3, 7, 9], melody: [5, 11, 13] },
  { tension: "S(11)", harmony: [1, 7, 9, 11], melody: [5, 13] },
  { tension: "S(13)", harmony: [1, 7, 9, 13], melody: [5, 11] },
  { tension: "S(13)", harmony: [1, 7, 11, 13], melody: [5, 9] },
];

/**
 * The functions that may melodize a chord: "all chordal tones actually
 * participating in the chord as well as the functions designated as M"
 * (p.623). With two or more attacks per chord, Table II adds 9 over S(5)
 * and 11 over S(7), each "immediately preceded" by the function below it
 * -- pass the previous melodic function to allow them.
 */
export function melodizingFunctions(tension: Tension, attacksPerChord = 1, previousFunction?: number): number[] {
  const rows = MELODIZATION_TABLE.filter((r) => r.tension === tension);
  const usable = new Set(rows.flatMap((r) => [...r.harmony, ...r.melody]));
  if (attacksPerChord >= 2) {
    if (tension === "S(5)" && previousFunction === 7) usable.add(9);
    if (tension === "S(7)" && previousFunction === 9) usable.add(11);
  }
  return [...usable].sort((a, b) => a - b);
}

/** "5 to that power the exponent of which represents the number of chords": 5^8 = 390,625 (p.623). */
export function melodizationCount(chords: number, functionsPerChord = 5): number {
  return functionsPerChord ** chords;
}

/**
 * Melodizes a progression one attack per chord (M/H = 1): for each chord
 * (root degree and tension), a usable function inside the range of
 * tension R = [low, high], chosen to move along `axis` -- a, the nearest
 * pitch above the last; b, the nearest below; 0, the nearest of all --
 * reversing direction when the axis runs out of range. Returns the
 * melody's pitches and the functions used.
 */
export function melodize(
  scale: PitchScale,
  tonicMidiNote: number,
  chords: readonly { rootDegree: number; tension: Tension }[],
  range: readonly [number, number] = [1, 13],
  axis: "a" | "b" | "0" | "a+b" | "b+a" = "0",
  startPitch = tonicMidiNote + 12,
  ambitus: readonly [number, number] = [tonicMidiNote + 2, tonicMidiNote + 26],
): { pitches: number[]; functions: number[] } {
  const pitches: number[] = [];
  const functions: number[] = [];
  let previous = startPitch;
  // Compound axes (Figure 6: A = a + b, b + a): the first half one way, the second the other.
  const phase = (k: number): "a" | "b" | "0" =>
    axis === "a+b" ? (k < chords.length / 2 ? "a" : "b") : axis === "b+a" ? (k < chords.length / 2 ? "b" : "a") : axis;
  let direction: "a" | "b" | "0" = phase(0);
  for (const [k, chord] of chords.entries()) {
    if (axis === "a+b" || axis === "b+a") direction = phase(k);
    const allowed = melodizingFunctions(chord.tension).filter((fn) => fn >= range[0] && fn <= range[1]);
    const candidates = allowed.flatMap((fn) =>
      [-1, 0, 1, 2].map((octave) => ({ fn, pitch: midiNoteForDegree(scale, tonicMidiNote, chord.rootDegree + fn - 1 + 7 * octave) })),
    ).filter((c) => c.pitch >= ambitus[0] && c.pitch <= ambitus[1]);
    const pick = (dir: "a" | "b" | "0") => {
      const pool = candidates.filter((c) => (dir === "a" ? c.pitch > previous : dir === "b" ? c.pitch < previous : true));
      return pool.sort((x, y) => Math.abs(x.pitch - previous) - Math.abs(y.pitch - previous))[0];
    };
    let choice = pick(direction);
    if (!choice && direction !== "0") {
      direction = direction === "a" ? "b" : "a";
      choice = pick(direction);
    }
    choice ??= pick("0");
    if (!choice) throw new Error("no usable function inside the range and ambitus");
    pitches.push(choice.pitch);
    functions.push(choice.fn);
    previous = choice.pitch;
  }
  return { pitches, functions };
}

/**
 * Book VI Ch.2 G, statistical melodization (p.663-664): "add up all the
 * c-pitches in a given harmonic progression (doubled tones to be counted
 * as one and enharmonics to be included)," and so on through the
 * chromatic scale -- a quantitative analysis. "By eliminating some of
 * those units which have lower marks, we obtain a quantitative (diatonic)
 * scale. The unit having the highest total becomes the root-tone of the
 * scale and, possibly, the axis of the future melody."
 */
export function quantitativeAnalysis(chords: readonly (readonly number[])[]): number[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const chord of chords) for (const pc of new Set(chord.map((p) => ((p % 12) + 12) % 12))) counts[pc]++;
  return counts;
}

/** The scale of the pitch classes whose marks reach `threshold`, from the one with the highest mark (p.663). */
export function quantitativeScale(chords: readonly (readonly number[])[], threshold: number): { root: number; scale: number[] } {
  const counts = quantitativeAnalysis(chords);
  const root = counts.indexOf(Math.max(...counts));
  const kept = counts.map((c, pc) => (c >= threshold ? pc : -1)).filter((pc) => pc >= 0);
  return { root, scale: kept.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b).map((d) => (d + root) % 12) };
}
