/**
 * Book V, Chapter 15: The Passing Seventh Generalized (p.531-538).
 *
 * "As we have seen before, the preparation of the seventh in C0 requires
 * a descending step from the root-tone. In C3 the seventh, while
 * resolving, becomes a new root-tone. This fact permits us to develop a
 * continuity of the passing seventh when C3 is constant. All chords must
 * be S(5)" (p.531, Figure 254). Rendering the actual figure (PDF p.292)
 * showed this is NOT simply Ch.9's own chord-to-chord seventh
 * voice-leading reapplied (that hypothesis was tested directly and
 * produces wide, non-stepwise root jumps, not what the figure shows):
 * the treble stays on plain triads (S(5), confirming "all chords must be
 * S(5)") that change slowly, while an independent bass voice descends
 * continuously *stepwise* underneath, one note per beat, creating
 * passing sevenths (and other intervals) against the more slowly-moving
 * harmony above -- a walking-bass-under-static-harmony texture. Getting
 * the precise relationship between the bass's step count and the
 * triads' own C3 change-points right would need more figure-reading than
 * was safe to commit to a formula here, so it's deliberately not modeled
 * -- see the README for the honest state of this.
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
 * (Generalization of Passing Chromatic Tones, p.537-538) and Section C
 * (Altered Chords, p.542+) were not assessed.
 */

import { symmetricTriad, type StructureId } from "./symmetricHarmony.ts";
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
