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
 * Section B (Symmetric Progressions, Symmetric Zero Cycle C0, p.391-392)
 * requires the chord "positions" enumeration from Ch.2 Section C (open
 * and closed voicings), which wasn't built when Ch.2's voice-leading was
 * implemented (only chord-to-chord transformation was) -- a natural next
 * step, not yet built.
 */

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
