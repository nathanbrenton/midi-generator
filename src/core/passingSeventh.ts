/**
 * Book V, Chapter 15: The Passing Seventh Generalized (p.531-538).
 *
 * "As we have seen before, the preparation of the seventh in C0 requires
 * a descending step from the root-tone. In C3 the seventh, while
 * resolving, becomes a new root-tone. This fact permits us to develop a
 * continuity of the passing seventh when C3 is constant. All chords must
 * be S(5)" (p.531, Figure 254). With positive cycles running downward
 * (the Book V audit's correction) the figure is exactly that: eight
 * half-note triads, C Am F Dm B° G Em C -- constant C3 -- over fifteen
 * quarter notes descending stepwise through two octaves, c b a g f e d c
 * b a g f e d c. Each root steps down to become the seventh of its own
 * chord (the C0 preparation, "a descending step from the root-tone") and
 * that seventh steps down again to the next root, as C3 resolves it.
 * "By reading the above figure backwards, we obtain an ascending scale
 * in the bass. The cycle in such a case becomes negative (C-3) and the
 * transformation is [counterclockwise]" (Figure 255) --
 * `passingSeventhContinuity`.
 *
 * Section A (Generalized Passing Seventh in Progressions of Type III,
 * p.534-536) is genuinely new: symmetric triads (Ch.3's S1-S4,
 * `symmetricHarmony.ts`) stacked at every tonic of a 3- or 4-tonic
 * system (Book II Ch.7's `symmetricTonics`), with a passing seventh
 * added above each triad connecting it toward the next tonic. "In a
 * system of three tonics the interval between the roots equals 4
 * semitones... giving a choice of three forms of the seventh: the
 * major, the minor and the diminished" (p.534); "In four tonics the
 * interval between the roots equals 3 semitones. This gives us a choice
 * of a major and a minor seventh" (p.535). The book's own two worked
 * root-sequences are exactly `symmetricTonics` reused directly: "C-E-Ab-C
 * for the three tonics" and "C-Eb-F#-A for the four tonics" (p.535) --
 * confirmed by test, no new tonic-spacing logic needed.
 *
 * Honest scope note: the book goes on to say this technique "automatically"
 * produces some of the altered-chord forms of S(7), and names the
 * resulting compound scale the Arabian "String of Pearls" (Zerefkend) --
 * already this project's own established name for the same compound-
 * symmetric-scale idea from Book II Ch.7/8 (`buildCompoundSymmetricScale`).
 * Which *specific* seventh quality the book intends at each individual
 * step (beyond "a choice exists") reads as compositional guidance rather
 * than a single determinate formula, so `PassingSeventhQuality` is left
 * as an explicit caller choice here rather than guessed at. Section B
 * (Generalization of Passing Chromatic Tones, p.537-541) relates each
 * symmetric system to how much of the chromatic scale one chord
 * harmonizes, 12 divided by the tonics (Figure 276,
 * `chromaticUnitsPerChord`); Section C (Altered Chords, p.542-543) is
 * notation and voice-leading advice, plus the remark that some altered
 * chords "contain an interval 2 -- and all structures previously
 * classified contain 3 and 4 only," which the S(5) and S(7) tables bear
 * out (tested).
 */

import { symmetricTriad, type StructureId } from "./symmetricHarmony.ts";
import { diatonicCycle, voiceLeadProgression, type Voicing } from "./diatonicHarmony.ts";
import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { symmetricTonics } from "./symmetricScales.ts";

export type PassingSeventhQuality = "major" | "minor" | "diminished";

/** Semitones from a triad's own root up to the passing seventh above it. */
const SEVENTH_INTERVAL: Record<PassingSeventhQuality, number> = { major: 11, minor: 10, diminished: 9 };

/** Which seventh qualities are available for a given tonic count (p.534-535): 3 tonics offers all three; 4 tonics offers major/minor only. */
export function availableSeventhQualities(tonicCount: 3 | 4): PassingSeventhQuality[] {
  return tonicCount === 3 ? ["major", "minor", "diminished"] : ["major", "minor"];
}

export interface PassingSeventhChord {
  root: number;
  triad: number[];
  seventh: number;
}

/**
 * Builds one symmetric passing-seventh chord per tonic (p.534-536): a
 * plain symmetric triad (Ch.3) at the tonic, plus a passing seventh of
 * the chosen quality above it.
 */
export function symmetricPassingSeventhProgression(
  tonicCount: 3 | 4,
  structure: StructureId,
  quality: PassingSeventhQuality,
  rootMidiNote = 60,
): PassingSeventhChord[] {
  const tonics = symmetricTonics(tonicCount, rootMidiNote);
  return tonics.map((root) => ({
    root,
    triad: symmetricTriad(structure, root),
    seventh: root + SEVENTH_INTERVAL[quality],
  }));
}

/**
 * Figures 254-255 (p.531): the continuity of the passing seventh. The
 * chords run through C3 (descending) or C-3 (ascending, "read
 * backwards"), voiced clockwise or counterclockwise, one per two beats;
 * the bass walks a scale, one note per beat -- descending, each root and
 * then its passing seventh; ascending, each passing seventh and then its
 * root. `cycles` full rounds of seven chords, plus the closing chord.
 */
export function passingSeventhContinuity(
  scale: PitchScale,
  rootMidiNote: number,
  direction: "descending" | "ascending" = "descending",
  cycles = 1,
): { chords: Voicing[]; rootDegrees: number[]; bass: number[] } {
  const cycle = direction === "descending" ? 3 : -3;
  const rootDegrees = Array.from({ length: 7 * cycles + 1 }, (_, k) => diatonicCycle(cycle)[k % 7]);
  const chords = voiceLeadProgression(scale, rootMidiNote, rootDegrees, direction === "descending" ? "clockwise" : "counterclockwise");
  const step = direction === "descending" ? -1 : 1;
  // The figures' register: down from an octave below the chords, or up to it.
  const start = rootMidiNote - (direction === "descending" ? 12 : 12 + 12 * 2 * cycles);
  const bass = Array.from({ length: 2 * rootDegrees.length - 1 }, (_, k) => midiNoteForDegree(scale, start, k * step));
  return { chords, rootDegrees, bass };
}

/**
 * Figure 276 (p.539): "symmetric harmonization of the chromatic scale" --
 * one tonic harmonizes all 12 units with one chord, √2 six, ∛2 four, ∜2
 * three, ⁶√2 two, ¹²√2 one.
 */
export function chromaticUnitsPerChord(tonicCount: 1 | 2 | 3 | 4 | 6 | 12): number {
  return 12 / tonicCount;
}
