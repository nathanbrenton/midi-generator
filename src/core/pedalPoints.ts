/**
 * Book V, Chapter 19: A Discussion of Pedal Points (p.559-568).
 *
 * "Pedal Point or Organ Point (P.P.) is a primary axis about which chord
 * progressions are formed. The various patterns of motion which the
 * remaining voices produce in relation to the pedal point consequently
 * result in different effects corresponding to the axial combinations"
 * -- Book IV's axes a, b, c, d and 0. The introduction (p.559-560) names
 * which harmonic techniques give which axis, and every claim can be
 * checked against this project's own voice-leading (`axisOfMotion`,
 * `AXIS_TECHNIQUES`, tested): "an a-axis for three parts may be obtained
 * through C3 const.... For a gradual ascent, C3 ↻ and C5 ↺ may be used.
 * For ascent in leaps, C3 ↺... All the negative forms of continuous S(7)
 * ... produce the same axis"; "a vigorous alternating (ascending-
 * descending) motion... C7 ↻ in three parts"; "an extended descent, i.e.,
 * b-axis, may be obtained through the use of continuous S(7) in four-part
 * harmony, through the ↺ C7..., through ↻ C5." All of these hold only
 * with positive cycles running downward.
 *
 * Section A, classical pedal points (p.561-563): P.P.T., "an extension of
 * the ecclesiastic plagal cadence... I + IV(6/4) + I (T + S_T + T)," and
 * P.P.D., "an extension of the compound authentic cadence... T + S + T_D +
 * D + T... I + IV (II) + I(6/4) + V (III) + I. The actual P.P.D. starts on
 * T_D = I(6/4)" (`classicalPedalPoint`); Figure 311's seven traditional
 * placements in A + A1 + B + A1 (`PEDAL_POINT_LOCATIONS`).
 *
 * Section B, the diatonic pedal point (p.563-564): diatonic cycles above
 * the pedal, the three upper parts read against it in the forms of Figure
 * 313 (`DIATONIC_PEDAL_FORMS`); four upper parts "correspond to the
 * technique of S(7) const."
 *
 * Section C, the chromatic (modulating) pedal point (p.565-566). Figure
 * 315's natural key tendencies -- P.P.T. toward the flats by C5, P.P.D.
 * toward the sharps by C-5, each key with its "minor mediants: lower and
 * upper" (`keyTendencies`) -- and the rule that decides: "only those keys
 * may be selected... in which I S(5) taken together with P.P. produces a
 * crystallized structure acceptable in the established four-part
 * harmony." `pedalAcceptsKey` reads that as: the tonic triad over the
 * pedal is an S(5), S(6) or S(4/6) (the pedal in the triad), a seventh
 * chord of Ch.9's table with the pedal as root or seventh, or an S(11)
 * (1, 7, 9, 11) -- and it reproduces the book's own list exactly: over c,
 * F# minor, G major, G minor, G# minor and A major are excluded, F# major
 * is the one "allowance," "all other keys are fully acceptable"; D minor
 * over g is "1, 5, 7, 9... not the accepted form," F minor over g "an
 * accepted form of S(11): 1, 7, 9, 11."
 *
 * Section D, the symmetric pedal point (p.566-567): Types II and III over
 * the pedal, "the pedal point itself is the main (original) tonic," and
 * the extended form in which "each tonic [becomes] a pedal point in
 * succession" (`symmetricPedalPoint`).
 */

import { diatonicCycle, positionVoicing, S5_POSITIONS, transformVoicing, type SignedCycleType, type TransformDirection, type Voicing } from "./diatonicHarmony.ts";
import { seventhCycle, seventhVoiceLeadProgression, type SignedSeventhCycle } from "./seventhChords.ts";
import { intervalCellScale, midiNoteForDegree, type PitchScale } from "./scales.ts";

const NATURAL_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
import { S7_STRUCTURES, symmetricProgression, type StructuralGroup, type TonicCount } from "./symmetricHarmony.ts";
import { majorTonic, spell, triadOnLetter, type Letter } from "./chromaticModulation.ts";

// ---- Introduction: axes of the upper voices ------------------------------------

export type AxisOfMotion = "a" | "b" | "alternating";

/**
 * The axis the upper voices of a progression describe against a pedal:
 * a (ascending), b (descending) or alternating, judged by the mean pitch
 * of each chord's upper voices, with the largest single-voice move -- a
 * step (2 semitones or less) is gradual, more is a leap.
 */
export function axisOfMotion(upperVoices: readonly (readonly number[])[]): { axis: AxisOfMotion; largestMove: number } {
  const mean = (c: readonly number[]) => c.reduce((s, p) => s + p, 0) / c.length;
  const deltas = upperVoices.slice(1).map((c, i) => mean(c) - mean(upperVoices[i]));
  const sorted = (c: readonly number[]) => [...c].sort((x, y) => x - y);
  const largestMove = Math.max(
    ...upperVoices.slice(1).map((c, i) => Math.max(...sorted(c).map((p, k) => Math.abs(p - sorted(upperVoices[i])[k])))),
  );
  const axis: AxisOfMotion = deltas.every((d) => d > 0) ? "a" : deltas.every((d) => d < 0) ? "b" : "alternating";
  return { axis, largestMove };
}

/** Three upper parts moved by one transformation through a constant cycle (no octave variation), from close position. */
export function triadMotion(scale: PitchScale, rootMidiNote: number, cycle: SignedCycleType, transformation: TransformDirection, chords = 8): number[][] {
  let voicing = positionVoicing(scale, rootMidiNote, 0, S5_POSITIONS.close[1]);
  const result = [[voicing.root, voicing.third, voicing.fifth]];
  for (let k = 1; k < chords; k++) {
    voicing = transformVoicing(voicing, scale, rootMidiNote, diatonicCycle(cycle)[k % 7], transformation);
    result.push([voicing.root, voicing.third, voicing.fifth]);
  }
  return result;
}

/** Four upper parts moving as continuous S(7) through a constant cycle. */
export function seventhMotion(scale: PitchScale, rootMidiNote: number, cycle: SignedSeventhCycle, chords = 8): number[][] {
  const roots = Array.from({ length: chords }, (_, k) => seventhCycle(cycle)[k % 7]);
  return seventhVoiceLeadProgression(scale, rootMidiNote, roots, cycle).map((v) => [v.root, v.third, v.fifth, v.seventh]);
}

/** The book's techniques for each axis against a pedal point (p.559-560). */
export const AXIS_TECHNIQUES = [
  { axis: "a", parts: 3, technique: "C3 ↻", cycle: 3, transformation: "clockwise", motion: "gradual ascent" },
  { axis: "a", parts: 3, technique: "C5 ↺", cycle: 5, transformation: "counterclockwise", motion: "gradual ascent" },
  { axis: "a", parts: 3, technique: "C3 ↺", cycle: 3, transformation: "counterclockwise", motion: "ascent in leaps" },
  { axis: "a", parts: 4, technique: "negative forms of continuous S(7)", cycle: -5, transformation: null, motion: "ascent" },
  { axis: "alternating", parts: 3, technique: "C7 ↻", cycle: 7, transformation: "clockwise", motion: "vigorous alternating" },
  { axis: "b", parts: 4, technique: "continuous S(7), ↺ C7", cycle: 7, transformation: null, motion: "extended descent" },
  { axis: "b", parts: 3, technique: "↻ C5", cycle: 5, transformation: "clockwise", motion: "extended descent" },
] as const;

// ---- Section A: classical pedal points ------------------------------------------------

/** A chord over (or before) the pedal: the bass and the three upper voices, low to high. */
export interface PedalChord {
  label: string;
  bass: number;
  upper: number[];
  /** Whether the bass is the pedal itself. */
  onPedal: boolean;
}

/** The triad on a scale degree, voiced to move as little as possible from `previous` (no voice crossing). */
function leadTriad(scale: PitchScale, tonicMidiNote: number, degree: number, previous: readonly number[]): number[] {
  const pcs = [0, 2, 4].map((offset) => midiNoteForDegree(scale, tonicMidiNote, degree + offset) % 12);
  let best: number[] = [];
  let bestCost = Infinity;
  for (const order of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) {
    for (const base of [-24, -12, 0, 12, 24]) {
      const voices: number[] = [];
      let below = -Infinity;
      for (const k of order) {
        let p = pcs[k] + 60 + base;
        while (p <= below) p += 12;
        voices.push((below = p));
      }
      const cost = voices.reduce((s, p, i) => s + Math.abs(p - previous[i]), 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = voices;
      }
    }
  }
  return best;
}

/**
 * Section A (p.561-562, Figures 309-310): the classical pedal points in a
 * key, voiced in three upper parts over the bass.
 * P.P.T. -- the plagal cadence held over the tonic: I + IV(6/4) + I.
 * P.P.D. -- "prepared by a subdominant (S), starts with T_D (I 6/4) and
 * ends with an authentic cadence (D + T)": IV, then I(6/4) and V over the
 * dominant pedal, then I.
 */
export function classicalPedalPoint(kind: "PPT" | "PPD", scale: PitchScale, tonicMidiNote: number): PedalChord[] {
  const degreePitch = (d: number) => midiNoteForDegree(scale, tonicMidiNote - 12, d);
  const plan: { label: string; degree: number; bassDegree: number; onPedal: boolean }[] =
    kind === "PPT"
      ? [
          { label: "I", degree: 0, bassDegree: 0, onPedal: true },
          { label: "IV 6/4", degree: 3, bassDegree: 0, onPedal: true },
          { label: "I", degree: 0, bassDegree: 0, onPedal: true },
        ]
      : [
          { label: "IV", degree: 3, bassDegree: 3, onPedal: false },
          { label: "I 6/4 (T_D)", degree: 0, bassDegree: 4, onPedal: true },
          { label: "V", degree: 4, bassDegree: 4, onPedal: true },
          { label: "I", degree: 0, bassDegree: 0, onPedal: false },
        ];
  let previous = [tonicMidiNote, tonicMidiNote + 4, tonicMidiNote + 7];
  return plan.map((step) => {
    const upper = leadTriad(scale, tonicMidiNote, step.degree, previous);
    previous = upper;
    return { label: step.label, bass: degreePitch(step.bassDegree), upper, onPedal: step.onPedal };
  });
}

/** The cadences the classical pedal points extend (p.561-562). */
export const CLASSICAL_CADENCES = {
  PPT: { formula: "T + S_T + T", degrees: "I + IV(6/4) + I", extends: "the ecclesiastic plagal cadence" },
  PPD: { formula: "T + S + T_D + D + T", degrees: "I + IV (II) + I(6/4) + V (III) + I", extends: "the compound authentic cadence" },
} as const;

/** Figure 311: the traditional location of pedal points in A + A1 + B + A1. */
export const PEDAL_POINT_LOCATIONS: readonly (readonly [string, string, string, string])[] = [
  ["P.P.T.", "", "", ""],
  ["", "", "P.P.D.", ""],
  ["", "", "", "P.P.T."],
  ["P.P.T.", "", "P.P.D.", ""],
  ["P.P.T.", "", "", "P.P.T."],
  ["", "", "P.P.D.", "P.P.T."],
  ["P.P.T.", "", "P.P.D.", "P.P.T."],
];

// ---- Section B: the diatonic pedal point ----------------------------------------------

/** Figure 313: the forms of the three upper parts over the pedal (as 1), from the top. */
export const DIATONIC_PEDAL_FORMS: readonly { upper: readonly [number, number, number]; tension: string }[] = [
  { upper: [5, 3, 1], tension: "S(5)" },
  { upper: [3, 1, 1], tension: "S(5)" },
  { upper: [7, 3, 1], tension: "S(7)" },
  { upper: [7, 5, 1], tension: "S(7)" },
  { upper: [9, 7, 1], tension: "S(9)" },
];

// ---- Section C: the chromatic (modulating) pedal point -----------------------------

const LETTERS: readonly Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

/**
 * Figure 315: the natural key tendencies, the majors stepping by C5 for
 * P.P.T. (toward the flats) or C-5 for P.P.D. (toward the sharps), with
 * each key's minor mediants, upper (iii) and lower (vi).
 */
export function keyTendencies(kind: "PPT" | "PPD", keys = 8): { major: string; upperMediant: string; lowerMediant: string }[] {
  const step = kind === "PPT" ? -1 : 1;
  return Array.from({ length: keys }, (_, k) => {
    const signature = k * step;
    const tonic = majorTonic(signature);
    const at = (degree: number) => triadOnLetter(LETTERS[(LETTERS.indexOf(tonic.letter) + degree) % 7], signature)[0];
    return { major: spell(tonic), upperMediant: spell(at(2)).toLowerCase(), lowerMediant: spell(at(5)).toLowerCase() };
  });
}

/** Seventh-chord interval stacks of Ch.9's table, for recognizing a pedal + triad as an S(7). */
const SEVENTH_STACKS = Object.values(S7_STRUCTURES).map(({ intervals: [a, b, c] }) => [0, a, a + b, a + b + c].join());
/** The two families of S(11): the upper triad a minor or major seventh above the pedal, any S(5) structure (Ch.11 C). */
const ELEVENTH_TRIADS = [10, 11].flatMap((seventh) =>
  [
    [4, 3],
    [3, 4],
    [4, 4],
    [3, 3],
  ].map(([a, b]) => [seventh, (seventh + a) % 12, (seventh + a + b) % 12].join()),
);

/**
 * Whether a key's tonic triad over a pedal "produces a crystallized
 * structure acceptable in the established four-part harmony" (p.565),
 * and which. Pitch classes; `mode` is the key's.
 */
export function pedalAcceptsKey(pedalPitchClass: number, tonicPitchClass: number, mode: "major" | "minor"): { accepted: boolean; form: string } {
  const rel = (pc: number) => (((pc - pedalPitchClass) % 12) + 12) % 12;
  const root = rel(tonicPitchClass);
  const triad = [root, (root + (mode === "major" ? 4 : 3)) % 12, (root + 7) % 12];
  const where = triad.indexOf(0);
  if (where === 0) return { accepted: true, form: "S(5)" };
  if (where === 1) return { accepted: true, form: "S(6)" };
  if (where === 2) return { accepted: true, form: "S(4/6)" };
  // The pedal as the root of a seventh chord: the triad is its 3, 5, 7.
  if (SEVENTH_STACKS.includes([0, ...triad].join())) return { accepted: true, form: "S(7)" };
  // The pedal as the seventh: the triad is 1, 3, 5 and the pedal lies a seventh above its root.
  const stacked = [0, triad[1] - root, triad[2] - root, (12 - root) % 12].map((x) => ((x % 12) + 12) % 12);
  if (SEVENTH_STACKS.includes(stacked.join())) return { accepted: true, form: "S(2), the seventh in the bass" };
  if (ELEVENTH_TRIADS.includes(triad.join())) return { accepted: true, form: "S(11): 1, 7, 9, 11" };
  return { accepted: false, form: "no accepted four-part form" };
}

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** Every key, major and minor, judged over a pedal (the book's list for c, p.566). */
export function keysOverPedal(pedalPitchClass: number): { key: string; accepted: boolean; form: string }[] {
  return (["major", "minor"] as const).flatMap((mode) =>
    NAMES.map((name, pc) => ({ key: `${name} ${mode}`, ...pedalAcceptsKey(pedalPitchClass, pc, mode) })),
  );
}

/**
 * A modulating pedal point (Section C): the keys of the natural tendency
 * that the pedal accepts, each reached "by means of the chord on the VII
 * or V of the following key" -- here its V, then its I, all over the
 * pedal. Returns the keys and chords.
 */
export function modulatingPedalPoint(
  kind: "PPT" | "PPD",
  pedalMidiNote: number,
  keys = 6,
  approach: "V" | "VII" = "VII",
): { keys: string[]; chords: PedalChord[] } {
  const pedal = ((pedalMidiNote % 12) + 12) % 12;
  // The pedal is the tonic for P.P.T., the dominant for P.P.D.
  const home = kind === "PPT" ? pedal : (pedal + 5) % 12;
  const chosen = keyTendencies(kind, 8)
    .map((t, k) => ({ name: t.major, pc: (home + k * (kind === "PPT" ? 5 : 7)) % 12 }))
    .filter((key) => pedalAcceptsKey(pedal, key.pc, "major").accepted)
    .slice(0, keys);
  const chords: PedalChord[] = [];
  let previous = [60 + home, 64 + home, 67 + home].map((p) => (p > 72 ? p - 12 : p));
  for (const key of chosen) {
    for (const [label, degree] of [[approach, approach === "V" ? 4 : 6], ["I", 0]] as const) {
      const upper = leadTriad(NATURAL_MAJOR, 60 + key.pc, degree, previous);
      previous = upper;
      chords.push({ label: `${label} of ${key.name}`, bass: pedalMidiNote, upper, onPedal: true });
    }
  }
  return { keys: chosen.map((k) => k.name), chords };
}

// ---- Section D: the symmetric pedal point ----------------------------------------------

/**
 * Section D (p.566-567, Figures 317-318): a Type III progression over a
 * pedal on its first tonic -- "the pedal point itself is the main
 * (original) tonic" -- or, `extended`, "a group of pedal points, each
 * tonic becoming a pedal point in succession" while "the remaining parts
 * form progressions through the same system of symmetry."
 */
export function symmetricPedalPoint(
  pedalMidiNote: number,
  tonicCount: Exclude<TonicCount, 1>,
  structuralGroup: StructuralGroup,
  transformation: TransformDirection,
  extended = false,
): PedalChord[] {
  const groups = extended ? tonicCount : 1;
  const { tonics, voicings } = symmetricProgression(pedalMidiNote + 12, tonicCount, structuralGroup, transformation, {
    chords: tonicCount * groups + 1,
  });
  return voicings.map((v: Voicing, k) => {
    // Group g holds the g-th tonic as its pedal; the closing chord stays on the last group's.
    const group = Math.min(Math.floor(k / tonicCount), groups - 1);
    return {
      label: `chord ${k + 1}`,
      bass: tonics[group] - 12,
      upper: [v.root, v.third, v.fifth].sort((x, y) => x - y),
      onPedal: true,
    };
  });
}
