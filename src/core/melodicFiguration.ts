/**
 * Book V, Chapters 20-22: Melodic Figuration; Suspensions, Passing Tones
 * and Anticipations; Auxiliary Tones (p.569-596).
 *
 * "The technique of melodic figuration consists mainly of the process of
 * evolving leading tones for chordal tones in a given harmonic
 * continuity... transforming neutral units (chordal tones) into
 * directional units" (p.569). Four types: suspended, passing, auxiliary
 * and anticipated tones -- Figure 322 classifies them by number,
 * direction, chordal functions and adherence to scale
 * (`FIGURATION_ELEMENTS`).
 *
 * Ch.20's one rule: figuration must produce crystallized structures. "A
 * single suspension requires an S(7) in which the suspended tone is a
 * prepared 7th. A double suspension requires an S(9)... the prepared 7th
 * and 9th. A triple suspension requires preparation of the 7th, 9th and
 * 11th in an S(11)" -- and likewise single, double and triple passing
 * tones are passing 7ths, 7ths and 9ths, 7ths 9ths and 11ths. The common
 * old suspension, "S(11) = 1, 5, 11," fails it (`isCrystallized`).
 *
 * Ch.21 A, suspensions (p.573): "the 1, the 3 or the 5 become a prepared
 * 7... the 7th, as a suspension; and the nearest function one step lower,
 * as a resolution"; doubles from 1-3, 3-5 or 5-7, triples from 1-3-5 or
 * 3-5-7. That is Ch.9-11's own machinery chained: the held tones are the
 * "suspending" preparations of S(7), S(9) and S(11) (the cycle follows
 * from which function is held), and the suspended functions resolve by
 * those chapters' resolution maps (`suspension`).
 *
 * Ch.21 B, passing tones (p.575-576): "single passing tones may be
 * produced by moving the 1 downward to 7, stepwise" -- in C3 const., the
 * passing seventh of Ch.15 -- and triple ones are "7, 9 and 11 obtained by
 * means of downward motion from the 1, 3 and 5... a preparation of S(11)
 * in C0" (`triplePassingTones`). Double ones are left open (see there).
 *
 * Ch.21 C, anticipations (p.579): "anticipated tones may be evolved from
 * any chordal function of the following chord, provided that such a
 * function is not the same in pitch as the voice in which the
 * anticipation occurs" (`anticipations`).
 *
 * Ch.22, auxiliary tones (p.584-589): "any chordal function may be
 * preceded by an upper or lower auxiliary tone. The interval between the
 * auxiliary and the chordal tone depends on the type of harmony" -- a
 * diatonic auxiliary is the neighboring tone of the scale (or of the
 * master-structure Σ in Types II and III), a chromatic one a semitone
 * away (`auxiliaryTone`). Figure 349 classifies single, double and triple
 * auxiliaries over 1, 3, 5, 7 (`auxiliaryClassification`: 8, 24, 32),
 * and sequences of directional units can follow coefficients of
 * recurrence (`directionalSequence`) or the order of the parts (SATB and
 * its 24 permutations).
 *
 * Not built: the figures' specific voicings, and the "ascending" forms,
 * which the book obtains by writing the descending ones and inverting
 * them (position ⓓ, Book III) -- `geometricalPosition` already does that.
 */

import { cycleBetween, nearestPitch } from "./diatonicHarmony.ts";
import { seventhResolutionMap } from "./seventhChords.ts";
import { NINTH_RESOLUTIONS } from "./ninthChords.ts";
import { ELEVENTH_RESOLUTIONS } from "./eleventhChords.ts";
import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { combinationsBy } from "./higherOrderPermutations.ts";

// ---- Figure 322 and Ch.20's rule ------------------------------------------------------

/** Figure 322, "Elements of melodic figuration": number, direction, chordal functions, adherence to scale. */
export const FIGURATION_ELEMENTS = [
  { element: "suspended", number: 1, direction: "↘", functions: "↑7", scale: "diatonic" },
  { element: "suspended", number: 2, direction: "↘↘", functions: "↑9 ↑7", scale: "diatonic" },
  { element: "suspended", number: 3, direction: "↘↘↘", functions: "↑11 ↑9 ↑7", scale: "diatonic" },
  { element: "passing", number: 1, direction: "↘", functions: "↘7", scale: "diatonic" },
  { element: "passing", number: "1-3", direction: "parallel and contrary, ↗ and ↘", functions: "whole tone interval", scale: "chromatic" },
  { element: "passing", number: 2, direction: "↘↘", functions: "↘9 ↘7; G6/4; G4/3", scale: "diatonic" },
  { element: "passing", number: 3, direction: "↘↘↘", functions: "↘11 ↘9 ↘7", scale: "diatonic" },
  { element: "auxiliary", number: 1, direction: "↗ or ↘", functions: "any function", scale: "diatonic or chromatic" },
  { element: "auxiliary", number: 2, direction: "4 combinations", functions: "any functions", scale: "diatonic or chromatic" },
  { element: "auxiliary", number: 3, direction: "8 combinations", functions: "any functions", scale: "diatonic or chromatic" },
  { element: "anticipated", number: 1, direction: "", functions: "any function", scale: "" },
  { element: "anticipated", number: 2, direction: "", functions: "any functions", scale: "" },
  { element: "anticipated", number: 3, direction: "", functions: "any functions", scale: "" },
] as const;

/** The crystallized structures figuration must produce: 1 tone -> S(7) with 7, 2 -> S(9) with 7 and 9, 3 -> S(11) with 7, 9 and 11 (p.570-571). */
export const CRYSTALLIZED = {
  1: { tension: "S(7)", functions: [7] },
  2: { tension: "S(9)", functions: [7, 9] },
  3: { tension: "S(11)", functions: [7, 9, 11] },
} as const;

/**
 * Whether the functions sounding at the moment of suspension form a
 * crystallized structure: S(7) (1, 3, 5, 7), S(9) (1, 3, 7, 9) or S(11)
 * (1, 7, 9, 11) with their usual omissions, or a plain triad. "S(11) =
 * 1, 5, 11" -- the old 4-3 suspension -- is not one (p.570).
 */
export function isCrystallized(functions: readonly number[]): boolean {
  const set = [...new Set(functions)].sort((a, b) => a - b).join();
  return ["1,3,5", "1,3,5,7", "1,3,7", "1,5,7", "1,3,7,9", "1,7,9", "1,7,9,11", "1,3,5,7,9", "1,3,5,7,9,11"].includes(set);
}

// ---- Ch.21 A: suspensions -----------------------------------------------------------

export type SuspendedSet = readonly [1] | readonly [3] | readonly [5] | readonly [1, 3] | readonly [3, 5] | readonly [5, 7] | readonly [1, 3, 5] | readonly [3, 5, 7];

/** One chord of a figuration: the bass and the upper voices (in voice order, not sorted) with the function each sings. */
export interface FiguredChord {
  label: string;
  bass: number;
  upper: number[];
  functions: number[];
}

const pitchOf = (scale: PitchScale, tonic: number, root: number, fn: number) => midiNoteForDegree(scale, tonic, root + fn - 1);

/**
 * A suspension (p.573): the preparing chord on `startDegree` (S(5), or
 * S(7) when the 7 is among the held tones), the suspension chord whose
 * 7 (9, 11) the held tones become -- its root six degrees below the
 * lowest held tone, by the cycle of the "suspending" preparation -- and
 * the resolution, the suspended functions stepping down by the cycle
 * given (C3, C5 or C7 for one tone; C0, C3, C5 or C7 for two; C3 or C5
 * for three, as the resolution tables of Ch.9-11 allow).
 */
export function suspension(
  scale: PitchScale,
  tonicMidiNote: number,
  startDegree: number,
  held: SuspendedSet,
  resolutionCycle: 0 | 3 | 5 | 7,
): { preparationCycle: number; chords: [FiguredChord, FiguredChord, FiguredChord] } {
  const tension = held.length as 1 | 2 | 3;
  const prepFunctions = held.includes(7 as never) ? [3, 5, 7] : [1, 3, 5];
  const prepUpper = prepFunctions.map((fn) => pitchOf(scale, tonicMidiNote, startDegree, fn) + 12);
  const prepBass = pitchOf(scale, tonicMidiNote, startDegree, 1);
  const preparation: FiguredChord = { label: "preparation", bass: prepBass, upper: prepUpper, functions: prepFunctions };

  // The held tones become 7 (9, 11) of the suspension chord.
  const susRoot = startDegree + held[0] - 1 - 6;
  const suspendedFns = CRYSTALLIZED[tension].functions;
  const susUpperFns: number[] = tension === 1 ? [3, 5, 7] : tension === 2 ? [3, 7, 9] : [7, 9, 11];
  const heldIndex = (fn: number) => prepFunctions.indexOf(fn);
  const susFunctions = prepFunctions.map(() => 0);
  held.forEach((fn, k) => (susFunctions[heldIndex(fn)] = suspendedFns[k]));
  const free = susUpperFns.filter((fn) => !susFunctions.includes(fn));
  prepFunctions.forEach((_, i) => {
    if (susFunctions[i] === 0) susFunctions[i] = free.shift() ?? 1;
  });
  const susUpper = prepUpper.map((pitch, i) =>
    held.includes(prepFunctions[i] as never) ? pitch : nearestPitch(pitch, pitchOf(scale, tonicMidiNote, susRoot, susFunctions[i])),
  );
  const susBass = nearestPitch(prepBass, pitchOf(scale, tonicMidiNote, susRoot, 1));
  const suspended: FiguredChord = { label: `S(${[7, 9, 11][tension - 1]})`, bass: susBass, upper: susUpper, functions: susFunctions };

  // Resolution by the tables of Ch.9-11.
  const step = { 0: 0, 3: -2, 5: -4, 7: 1 }[resolutionCycle];
  const resRoot = susRoot + step;
  let move: (fn: number) => number;
  let bassFn = 1;
  if (tension === 1) {
    if (resolutionCycle === 0) throw new Error("a single suspension does not resolve in C0");
    const map = seventhResolutionMap(resolutionCycle);
    const name = { 3: "third", 5: "fifth", 7: "seventh" } as const;
    const back = { root: 1, third: 3, fifth: 5 } as const;
    move = (fn) => back[map[name[fn as 3 | 5 | 7]]];
  } else if (tension === 2) {
    const r = NINTH_RESOLUTIONS.find((x) => x.cycle === `C${resolutionCycle}`);
    if (!r) throw new Error("no such resolution");
    const name = { 3: "third", 7: "seventh", 9: "ninth" } as const;
    move = (fn) => r.moves[name[fn as 3 | 7 | 9]];
    bassFn = r.bass;
  } else {
    const r = ELEVENTH_RESOLUTIONS.find((x) => x.cycle === `C${resolutionCycle}` && x.resolves.length === 3);
    if (!r) throw new Error("a triple suspension resolves by C3 or C5");
    // All three step down a degree, read as functions of the new root (1-7).
    move = (fn) => ((((fn - 2 - step) % 7) + 7) % 7) + 1;
    bassFn = resolutionCycle === 3 ? 3 : 1;
  }
  const resUpper = susUpper.map((pitch, i) => nearestPitch(pitch, pitchOf(scale, tonicMidiNote, resRoot, move(susFunctions[i]))));
  const resBass = nearestPitch(susBass, pitchOf(scale, tonicMidiNote, resRoot, bassFn));
  const resolution: FiguredChord = { label: "resolution", bass: resBass, upper: resUpper, functions: susFunctions.map(move) };

  return { preparationCycle: cycleBetween(startDegree, susRoot), chords: [preparation, suspended, resolution] };
}

// ---- Ch.21 B: passing tones ------------------------------------------------------------

/**
 * Triple passing tones (p.576): "7, 9 and 11 obtained by means of
 * downward motion from the 1, 3 and 5; this corresponds to a preparation
 * of S(11) in C0" -- the bass stays, the three upper voices step down a
 * degree, and the S(11) then resolves by Ch.11's table (C3 to S(6) over
 * the held bass, C5 to S(7)). Single passing tones are Ch.15's passing
 * seventh (`passingSeventhContinuity`); double ones -- "from the 1 and 3,
 * or the 3 and 5, or the 5 and 7" -- are not built, since over a held bass
 * none of those gives the crystallized S(9), 1-3-7-9, and the figure does
 * not settle where the bass goes.
 */
export function triplePassingTones(scale: PitchScale, tonicMidiNote: number, rootDegree: number, resolutionCycle: 3 | 5): FiguredChord[] {
  const bass = pitchOf(scale, tonicMidiNote, rootDegree, 1);
  const upper = [1, 3, 5].map((fn) => pitchOf(scale, tonicMidiNote, rootDegree, fn) + 12);
  const passing = upper.map((p, i) => nearestPitch(p, pitchOf(scale, tonicMidiNote, rootDegree, [7, 9, 11][i])));
  const step = resolutionCycle === 3 ? -2 : -4;
  const next = rootDegree + step;
  const move = (fn: number) => ((((fn - 2 - step) % 7) + 7) % 7) + 1;
  const resolved = passing.map((p, i) => nearestPitch(p, pitchOf(scale, tonicMidiNote, next, move([7, 9, 11][i]))));
  const resolvedBass = resolutionCycle === 3 ? bass : nearestPitch(bass, pitchOf(scale, tonicMidiNote, next, 1));
  return [
    { label: "S(5)", bass, upper, functions: [1, 3, 5] },
    { label: "S(11), C0", bass, upper: passing, functions: [7, 9, 11] },
    { label: resolutionCycle === 3 ? "S(6)" : "S(7)", bass: resolvedBass, upper: resolved, functions: [7, 9, 11].map(move) },
  ];
}

// ---- Ch.21 C: anticipations -------------------------------------------------------------

/**
 * Anticipations of a constant chordal function (p.579): before each
 * chord, the voice `voice` (0 = bass, 1.. = upper) takes the pitch of
 * `fn` of the next chord early -- unless it already sings that pitch, a
 * common tone "due to cycles and structures." Returns, per connection,
 * the anticipated pitch or null.
 */
export function anticipations(chords: readonly { bass: number; upper: number[] }[], nextPitchOf: (k: number) => number, voice: number): (number | null)[] {
  return chords.slice(0, -1).map((c, k) => {
    const current = voice === 0 ? c.bass : c.upper[voice - 1];
    const target = nearestPitch(current, nextPitchOf(k + 1));
    return target === current ? null : target;
  });
}

// ---- Ch.22: auxiliary tones ----------------------------------------------------------------

/**
 * An auxiliary tone (p.584-585): the upper (↘, descending into the chord
 * tone) or lower (↗) neighbor of function `fn` of the chord on
 * `rootDegree`, taken from `scale` -- the scale itself, or the
 * master-structure Σ in Types II and III -- or a semitone away when
 * chromatic. Returns both pitches and the interval i.
 */
export function auxiliaryTone(
  scale: PitchScale,
  tonicMidiNote: number,
  rootDegree: number,
  fn: number,
  direction: "↗" | "↘",
  chromatic = false,
): { auxiliary: number; chordTone: number; interval: number } {
  const degree = rootDegree + fn - 1;
  const chordTone = midiNoteForDegree(scale, tonicMidiNote, degree);
  const auxiliary = chromatic
    ? chordTone + (direction === "↗" ? -1 : 1)
    : midiNoteForDegree(scale, tonicMidiNote, degree + (direction === "↗" ? -1 : 1));
  return { auxiliary, chordTone, interval: Math.abs(chordTone - auxiliary) };
}

/** Figure 349: every set of `count` functions out of 1, 3, 5, 7, each with every combination of directions -- 8, 24, 32. */
export function auxiliaryClassification(count: 1 | 2 | 3 | 4): { functions: number[]; directions: ("↗" | "↘")[] }[] {
  const fns = [1, 3, 5, 7];
  return combinationsBy(4, count).flatMap((indices) => {
    const functions = indices.map((i) => fns[i]);
    return Array.from({ length: 2 ** count }, (_, mask) => ({
      functions,
      directions: functions.map((_, k) => ((mask >> k) & 1 ? "↘" : "↗") as "↗" | "↘"),
    }));
  });
}

/**
 * A sequence of directional units under coefficients of recurrence
 * (p.589), one unit per chord: the coefficients laid over the functions in
 * turn, and the directions following their own pattern of repeats,
 * alternating ↗ and ↘. "r3÷2: ↗1 + ↗1 + ↘1 + ↗1 + ↘1 + ↘1" is r3÷2 over
 * the directions; "r4÷3: ↗1 + ↘1 + ↗1 + ↗3 + ↘5 + ↘5 + ↗7 + ↗7 + ↘3 + ↘1 +
 * ↗1 + ↘1" is r4÷3 over the functions 1, 3, 5, 7, 3, 1 with the directions
 * following 1+1+2+2+2+2+1+1.
 */
export function directionalSequence(functionGroup: readonly (readonly [number, number])[], directionCounts: readonly number[]): string[] {
  const functions = functionGroup.flatMap(([k, fn]) => Array.from({ length: k }, () => fn));
  const directions = directionCounts.flatMap((k, i) => Array.from({ length: k }, () => (i % 2 === 0 ? "↗" : "↘")));
  return functions.map((fn, i) => `${directions[i % directions.length]}${fn}`);
}

// ---- Ch.23: neutral and thematic melodic figuration -------------------------------------

/**
 * "In every seven-unit scale, either the first or the second pitch-unit is
 * a chordal tone. This gives us two possible definitions to any scale"
 * (p.598): c-e-g-b, or d-f-a-c. Returns the two readings as indices of the
 * scale's units, the second wrapping to the octave.
 */
export function chordalReadings(units = 7): [number[], number[]] {
  const first = Array.from({ length: Math.ceil(units / 2) }, (_, k) => 2 * k);
  const second = Array.from({ length: Math.ceil(units / 2) }, (_, k) => (2 * k + 1) % units);
  return [first, second];
}

/** Figure 358: "the seven possible systems" for reading three chordal tones by thirds as functions. */
export const FUNCTION_SYSTEMS: readonly (readonly [number, number, number])[] = [
  [1, 3, 5],
  [3, 5, 7],
  [5, 7, 9],
  [7, 9, 11],
  [9, 11, 13],
  [11, 13, 1],
  [13, 1, 3],
];

/**
 * Assigning a system to a motif's chordal tones (p.599): the starting
 * function -- the one its lowest chordal tone takes, which "must also be
 * present in the chord itself" -- and the least tension the chords must
 * have. "If e becomes assigned to function as the ninth, we must start on
 * the fifth"; "assigning the axis... to a seventh, the starting point in
 * the chord will be a third."
 */
export function assignSystem(axisPosition: 0 | 1 | 2, axisFunction: number): { system: readonly [number, number, number]; startingFunction: number; minimumTension: string } {
  const system = FUNCTION_SYSTEMS.find((s) => s[axisPosition] === axisFunction);
  if (!system) throw new Error("no system puts that function there");
  return { system, startingFunction: system[0], minimumTension: `S(${Math.max(5, ...system)})` };
}

export type MotifTone = "chordal" | "lower auxiliary" | "upper auxiliary" | "passing";

/**
 * Reads a motif against its chordal tones (pitch classes): a non-chordal
 * tone a step from a chordal tone it moves to or comes from is an
 * auxiliary -- lower if it lies below, upper if above -- unless it lies
 * between two chordal tones in one direction, a passing tone. Figure 357:
 * g#-a-c-e-f-e over a, c, e -- "g# is the lower auxiliary tone to a, and f
 * is the upper auxiliary tone to e."
 */
export function analyzeMotif(pitches: readonly number[], chordalPitchClasses: readonly number[]): MotifTone[] {
  const isChordal = (p: number) => chordalPitchClasses.includes(((p % 12) + 12) % 12);
  return pitches.map((p, i) => {
    if (isChordal(p)) return "chordal";
    const before = pitches[i - 1];
    const after = pitches[i + 1];
    const step = (q: number | undefined) => q !== undefined && isChordal(q) && Math.abs(q - p) <= 2;
    if (step(before) && step(after) && Math.sign(p - before!) === Math.sign(after! - p)) return "passing";
    const anchor = step(after) ? after! : step(before) ? before! : p;
    return p < anchor ? "lower auxiliary" : "upper auxiliary";
  });
}
