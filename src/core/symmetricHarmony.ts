/**
 * Book V, Chapter 3: The Symmetric System of Harmony.
 *
 * "In the symmetric system of harmony, scale is the result; scale is the
 * consequence of chords in motion" -- unlike the diatonic system (Ch.2),
 * chord structures here are pre-selected independent of any scale, built
 * directly from semitone intervals rather than scale degrees.
 *
 * Section A (Structures of S(5), p.388-391): restricting a triad's two
 * intervals to 3 or 4 semitones each gives exactly four possible
 * structures -- S1=4+3 (major), S2=3+4 (minor), S3=4+4 (augmented),
 * S4=3+3 (diminished). "The number of all possible three-part structures
 * amounts to 55, which is the general number of three-unit scales from
 * one axis" -- exactly `compositionCount(12, 3)` from Book II Ch.7
 * (dividing the octave into 3 ordered parts) = C(11,2) = 55, another
 * cross-book confirmation, not a new formula.
 *
 * The chapter's own combinatorics table (badly garbled OCR, but every
 * number independently verified by hand) counts every way of combining
 * these 4 structures into groups of 1-4, decomposed by repeat pattern --
 * exactly `generalPermutations` (Book I Ch.9) applied to the 4-symbol
 * alphabet {S1,S2,S3,S4}, confirmed exactly against all 8 of the book's
 * own tabulated (combinations, permutations-each) pairs:
 *   - trinomial, one repeated pair + one different: 12 combos x 3 perms = 36
 *   - trinomial, all different: 4 combos x 6 perms = 24 (total trinomials: 60)
 *   - quadrinomial, 3-same+1-different: 12 x 4 = 48
 *   - quadrinomial, two pairs: 6 x 6 = 36
 *   - quadrinomial, 1 pair + 2 different singles: 12 x 12 = 144
 *   - quadrinomial, all 4 different: 1 x 24 = 24 (total quadrinomials: 252)
 * No new combinatorial primitive needed -- see `symmetricStructureCount`
 * below, a thin wrapper that just counts `generalPermutationsOf` output,
 * plus the tests, which verify all 8 numbers directly.
 *
 * Section B (Symmetric Progressions, Symmetric Zero Cycle C0, p.391-392):
 * "a group of chords with a common root-tone but with variable positions
 * and variable structures produces a symmetric zero cycle (C0)." The
 * structural group's coefficients of recurrence decide the positions: "a
 * structure with a coefficient greater than one changes its positions
 * until the next structure appears. The change of structure requires the
 * preservation of the position" -- S const. with position var., S var.
 * with position const. `zeroCyclePositions` labels each connection, and
 * `symmetricZeroCycle` voices it, changing position by one of Ch.2's
 * transformations on the same root (`transformChord`).
 *
 * Book V, Chapter 5: The Symmetric System of Harmony (Type III), Section
 * A (Two Tonics, p.396-397).
 *
 * Chapter 4 (Diatonic-Symmetric System, Type II, p.393-395): "all
 * root-tones... must belong to one scale of the First Group" and "all
 * chord structures must be pre-selected; they are not affected by the
 * intonation of scale formed by the root-tones." `diatonicSymmetricProgression`
 * moves the roots through the scale by a group of tonal cycles with
 * coefficients ("2C7 + C3 + C5": C7, C7, C3, C5, repeated) and lays the
 * structural group over them. Figure 47, read off the page: in
 * c-d-e-f-g-a-bb, 2C7 + C3 + C5 gives c d e c f g a f bb c d bb e f g e
 * a bb c a d e f d g a bb g and back to c, each root carrying S1.
 *
 * Chapter 5's own tonic-count table -- "symmetric C0 represents one
 * tonic; root 2 represents two tonics; cube-root 2 represents three...
 * six... twelve" -- is exactly Book II Ch.7's own `TONIC_COUNTS`
 * ([2,3,4,6,12], reused directly via `symmetricTonics`/`fourthGroupTonics`),
 * plus the trivial one-tonic case.
 *
 * The chapter's genuinely new finding (rendered as a page image, since
 * OCR mangled the formula notation): "the upper voice of harmony produces
 * the following scale... c-db-e-f#-g-a#-(c)" from a 2-tonic system (C,
 * F#) using the S1 (major) structure at each tonic. Decoded by hand: this
 * is exactly the *sorted union of pitch classes* across every tonic's own
 * triad -- confirmed against BOTH of the book's own worked examples: S1
 * const. on tonics {C, F#} gives {C, Db, E, F#, G, Bb} (matching "c-db-e-
 * f#-g-a#" exactly, enharmonic Bb/A#); S2 (minor) const. gives {C, Db,
 * Eb, F#, G, A} (matching "c-db-eb-f#-g-a" exactly). This reuses Book II
 * Ch.7's tonic machinery and this chapter's own `symmetricTriad` directly
 * -- no new combinatorial primitive, just their union. The exact
 * root-motion cycle labels connecting consecutive tonics are now filled
 * in (`SYMMETRIC_CYCLE_FOR_TONIC_COUNT` below) -- Book V Ch.10 Section B
 * (S(9) in the Symmetric System, p.464) states them directly in clean
 * typeset text, no figure-reading needed: "symmetric roots correspond to
 * the respective cycles: C5, to root-2 [2 tonics]; C3, to cube-root-2 and
 * 4th-root-2 [3 and 4 tonics]; C7, to 6th-root-2 and 12th-root-2 [6 and
 * 12 tonics]" -- reusing Ch.2's diatonic C3/C5/C7 root-motion vocabulary
 * to name the step between consecutive symmetric tonics.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { alternatingCycles, nearestPitch, octaveVariation, positionVoicingFrom, transformChord, S5_POSITIONS, type S5Position, type SignedCycleType, type TransformDirection, type Voicing } from "./diatonicHarmony.ts";

export type StructureId = 1 | 2 | 3 | 4;

/** The four possible S(5) structures under the 3-or-4-semitone restriction: major, minor, augmented, diminished (p.388-389). */
export const S5_STRUCTURES: Record<StructureId, { name: string; intervals: [number, number] }> = {
  1: { name: "major", intervals: [4, 3] },
  2: { name: "minor", intervals: [3, 4] },
  3: { name: "augmented", intervals: [4, 4] },
  4: { name: "diminished", intervals: [3, 3] },
};

/** Builds the actual triad (root, third, fifth) for one of the four symmetric structures, directly from semitones -- no scale involved. */
export function symmetricTriad(structure: StructureId, rootMidiNote: number): number[] {
  const [first, second] = S5_STRUCTURES[structure].intervals;
  return [rootMidiNote, rootMidiNote + first, rootMidiNote + first + second];
}

/** Builds a progression of symmetric triads sharing the same root -- Section B's "common root-tone" starting point, before position-cycling (p.391). */
export function symmetricStructureProgression(structures: readonly StructureId[], rootMidiNote: number): number[][] {
  return structures.map((s) => symmetricTriad(s, rootMidiNote));
}

/**
 * Ch.5 Section A: the pitch-scale produced by a symmetric harmony system
 * -- the sorted union of pitch classes across every tonic's own triad
 * (built with the same `structure` at each tonic). Confirmed exactly
 * against the book's own two worked examples (p.397): S1 on a 2-tonic
 * system gives c-db-e-f#-g-a#(bb); S2 gives c-db-eb-f#-g-a. `tonics` is
 * typically Book II Ch.7's own `symmetricTonics`/`fourthGroupTonics`.
 */
export function symmetricHarmonyScale(tonics: readonly number[], structure: StructureId): number[] {
  const pitchClasses = new Set<number>();
  for (const tonic of tonics) {
    for (const note of symmetricTriad(structure, tonic)) {
      pitchClasses.add(((note % 12) + 12) % 12);
    }
  }
  return [...pitchClasses].sort((a, b) => a - b);
}

export type SymmetricCycleLabel = "C3" | "C5" | "C7";

/**
 * Book V, Ch.10 Section B (p.464): which diatonic root-motion cycle
 * connects consecutive tonics of a symmetric system, by tonic count.
 * "Symmetric roots correspond to the respective cycles: C5, to root-2;
 * C3, to cube-root-2 and 4th-root-2; C7, to 6th-root-2 and 12th-root-2."
 */
export const SYMMETRIC_CYCLE_FOR_TONIC_COUNT: Readonly<Record<number, SymmetricCycleLabel>> = {
  2: "C5",
  3: "C3",
  4: "C3",
  6: "C7",
  12: "C7",
};

/** A structural group with coefficients of recurrence: 3S1 + S3 + 2S2 is [[3, 1], [1, 3], [2, 2]] (p.390-391). */
export type StructuralGroup = readonly (readonly [coefficient: number, structure: StructureId])[];

/** Writes each structure out as often as its coefficient: 3S1 + S3 + 2S2 = S1 + S1 + S1 + S3 + S2 + S2 (p.391). */
export function expandStructuralGroup(group: StructuralGroup): StructureId[] {
  return group.flatMap(([coefficient, structure]) => Array.from({ length: coefficient }, () => structure));
}

/**
 * For each connection in a C0 progression, whether the position varies
 * (the same structure continues) or stays (the structure changes):
 * S1 + S1 + S1 + S3 + S2 + S2 -> var., var., const., const., var. (p.391).
 */
export function zeroCyclePositions(structures: readonly StructureId[]): ("var" | "const")[] {
  return structures.slice(1).map((structure, k) => (structure === structures[k] ? "var" : "const"));
}

/**
 * Voices a symmetric zero cycle: every chord on `rootMidiNote` (bass an
 * octave below), starting in `startPosition`. A repeated structure moves
 * to its next position by `direction`; a new structure keeps every voice
 * on its function, so only the tones that differ between the structures
 * move, by a semitone (p.391). The defaults follow Figure 46's first
 * example: c-g-e from the top, then counterclockwise to g-e-c. Long
 * repetitions keep their range by Ch.2's octave variation.
 */
export function symmetricZeroCycle(
  structures: readonly StructureId[],
  rootMidiNote: number,
  direction: TransformDirection = "counterclockwise",
  startPosition: S5Position = S5_POSITIONS.close[0],
): Voicing[] {
  const chord = (structure: StructureId) => {
    const [root, third, fifth] = symmetricTriad(structure, rootMidiNote);
    return { root, third, fifth };
  };
  let current = positionVoicingFrom(chord(structures[0]), rootMidiNote - 12, startPosition);
  const voicings = [current];
  const home = current;
  zeroCyclePositions(structures).forEach((change, k) => {
    const next = chord(structures[k + 1]);
    current =
      change === "var"
        ? transformChord(current, next, direction)
        : {
            bass: current.bass,
            root: nearestPitch(current.root, next.root),
            third: nearestPitch(current.third, next.third),
            fifth: nearestPitch(current.fifth, next.fifth),
          };
    current = octaveVariation(current, home);
    voicings.push(current);
  });
  return voicings;
}

/** A group of tonal cycles with coefficients: 2C7 + C3 + C5 is [[2, 7], [1, 3], [1, 5]] (p.393). */
export type CycleGroup = readonly (readonly [coefficient: number, cycle: SignedCycleType])[];

/** Writes each cycle out as often as its coefficient: 2C7 + C3 + C5 = C7 + C7 + C3 + C5. */
export function expandCycleGroup(group: CycleGroup): SignedCycleType[] {
  return group.flatMap(([coefficient, cycle]) => Array.from({ length: coefficient }, () => cycle));
}

/**
 * Ch.4, Type II: roots from one scale, moved by a cycle group until they
 * return to the first root in phase, each carrying the next structure of
 * the structural group (both repeat periodically). Returns the root
 * degrees, the structures, and the chords built from semitones on each
 * root (p.393-395, Figure 47).
 */
export function diatonicSymmetricProgression(
  scale: PitchScale,
  rootMidiNote: number,
  cycleGroup: CycleGroup,
  structuralGroup: StructuralGroup,
): { rootDegrees: number[]; structures: StructureId[]; chords: number[][] } {
  const rootDegrees = alternatingCycles(expandCycleGroup(cycleGroup), 0, scale.degrees.length);
  const pattern = expandStructuralGroup(structuralGroup);
  const structures = rootDegrees.map((_, k) => pattern[k % pattern.length]);
  const chords = rootDegrees.map((degree, k) => symmetricTriad(structures[k], midiNoteForDegree(scale, rootMidiNote, degree)));
  return { rootDegrees, structures, chords };
}

export type TonicCount = 1 | 2 | 3 | 4 | 6 | 12;

/** Semitones from each tonic to the next in the positive form (p.396): C3 runs down, C7 up a step, as everywhere in Book V. */
const POSITIVE_TONIC_STEP: Record<TonicCount, number> = { 1: 0, 2: 6, 3: -4, 4: -3, 6: 2, 12: 1 };

/**
 * Ch.5: the roots of a Type III system and the tonal cycle each step
 * corresponds to (p.396, rendered): one tonic C-C is C0; two tonics
 * C-F#-C is C5 then C-5; three C-Ab-E-C is C3 (negative: C-E-Ab-C, C-3);
 * four C-A-F#-Eb-C is C3; six C-D-E-F#-Ab-Bb-C is C7; twelve C-Db-D... is
 * C7 (negative: C-B-Bb..., C-7). Returns pitch-class offsets from the
 * first tonic.
 */
export function symmetricRoots(tonicCount: TonicCount, form: "positive" | "negative" = "positive"): { tonics: number[]; cycles: string[] } {
  const step = (form === "positive" ? 1 : -1) * POSITIVE_TONIC_STEP[tonicCount];
  const tonics = Array.from({ length: tonicCount }, (_, k) => (((k * step) % 12) + 12) % 12);
  const sign = form === "positive" ? "" : "-";
  const cycles = Array.from({ length: tonicCount }, (_, k) => {
    if (tonicCount === 1) return "C0";
    if (tonicCount === 2) return k % 2 === 0 ? `C${sign}5` : `C${sign === "" ? "-" : ""}5`;
    return `C${sign}${SYMMETRIC_CYCLE_FOR_TONIC_COUNT[tonicCount].slice(1)}`;
  });
  return { tonics, cycles };
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** How many chords a transformation takes to bring the voices back to their functions: 3 for clockwise or counterclockwise, 2 for const. 3. */
export const TRANSFORMATION_PERIOD: Readonly<Record<TransformDirection, number>> = { clockwise: 3, counterclockwise: 3, const3: 2 };

/**
 * Recurrence-cycles: how many times a Type III progression passes through
 * all its tonics before the original position falls on the first tonic
 * again -- 1 is a "closed system", more a "continuous" one. Two tonics:
 * a triple recurrence-cycle for clockwise and counterclockwise, closed
 * for const. 3 (p.397); three tonics: closed, and two cycles for const. 3;
 * four tonics: three cycles, and closed for const. 3 (p.399).
 */
export function recurrenceCycles(tonicCount: TonicCount, transformation: TransformDirection): number {
  return lcm(TRANSFORMATION_PERIOD[transformation], tonicCount) / tonicCount;
}

/**
 * A Type III progression: chords on the symmetric roots in turn, voiced by
 * one transformation, with "S changes with each tonic" (p.397) -- the
 * structural group runs alongside the tonics, so a group whose length
 * doesn't divide into the tonics interferes with them: 9 structures over
 * 2 tonics run 18 chords before both coincide again (p.398). `chords`
 * defaults to that interference length.
 */
export function symmetricProgression(
  rootMidiNote: number,
  tonicCount: TonicCount,
  structuralGroup: StructuralGroup,
  transformation: TransformDirection,
  options: { form?: "positive" | "negative"; startPosition?: S5Position; chords?: number } = {},
): { tonics: number[]; structures: StructureId[]; voicings: Voicing[] } {
  const { tonics: offsets } = symmetricRoots(tonicCount, options.form);
  const pattern = expandStructuralGroup(structuralGroup);
  const length = options.chords ?? lcm(pattern.length, tonicCount);
  const tonics = Array.from({ length }, (_, k) => rootMidiNote + offsets[k % tonicCount]);
  const structures = Array.from({ length }, (_, k) => pattern[k % pattern.length]);
  const chord = (k: number) => {
    const [root, third, fifth] = symmetricTriad(structures[k], tonics[k]);
    return { root, third, fifth };
  };
  let current = positionVoicingFrom(chord(0), rootMidiNote - 12, options.startPosition ?? S5_POSITIONS.close[1]);
  const home = current;
  const voicings = [current];
  for (let k = 1; k < length; k++) {
    current = octaveVariation(transformChord(current, chord(k), transformation), home);
    voicings.push(current);
  }
  return { tonics, structures, voicings };
}

/**
 * Ch.8 Section F: G6 in Type II and III progressions -- "the adjacent S(5)
 * and S(6)③ of one group must have identical structures," while the last
 * S(5) is free, so "the number of structural combinations for the
 * individual groups equals 4² = 16" (p.419): [first, passing, last].
 */
export const G6_STRUCTURE_FORMS: readonly (readonly [StructureId, StructureId, StructureId])[] = ([1, 2, 3, 4] as StructureId[]).flatMap(
  (last) => ([1, 2, 3, 4] as StructureId[]).map((first) => [first, first, last] as const),
);
