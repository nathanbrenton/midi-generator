/**
 * Book V, Chapter 17: Hybrid Harmonic Continuities (p.552-553).
 *
 * "For practical purposes... it is sometimes necessary to produce
 * harmonic styles that are intentionally hybrid... the mixture of
 * diatonic, symmetric and chromatic forms." Mostly compositional
 * guidance (an essay on style, not a formula), but two genuinely
 * checkable pieces sit inside it:
 *
 * 1. A stated ratio: "the most desirable of the simple ratios... is:
 *    di + 2ch + sy," refined into concrete chord-counts: "Hy = di3H +
 *    ch6H + sy3H" -- 3 diatonic chords, 6 chromatic chords (two chained
 *    3-chord chromatic groups, `chromaticGroupRoots` x2 from Ch.13), 3
 *    symmetric chords (`symmetricTriad`/`symmetricTonics` from Ch.3).
 *    "The chromatic type neutralizes the effect of the preceding type...
 *    it is necessary to have more of it," matching the 1:2:1 chord-count
 *    ratio directly (`HYBRID_CONTINUITY_RATIO`).
 *
 * 2. A smoothness refinement: "maintaining an identical intervallic
 *    root-relation between the last two chords of the preceding
 *    chromatic group and between the last chord of the chromatic group
 *    and the first chord of the following symmetric group... identical
 *    steps occur... between E and F (the last two chords of ch) and
 *    between F and F# (the last chord of ch and the first chord of
 *    sy)." E->F is +1 semitone; F->F# is +1 semitone -- the step INTO
 *    the next group repeats the step that ended the previous one.
 *    `smoothJoinRoot` implements exactly this, confirmed against the
 *    book's own E-F-F# example.
 *
 * Honest scope note: which specific diatonic cycle, chromatic operation,
 * or symmetric structure to actually use for a given continuity is a
 * compositional choice this chapter leaves to "preferential selection"
 * (the same phrase used elsewhere in this book for judgment calls) --
 * not modeled as a forced default here. `buildHybridSegmentJoin` is a
 * small assembler that applies the smooth-join rule at one di/ch/sy
 * boundary at a time, reusable regardless of which progressions the
 * caller picks.
 */

export const HYBRID_CONTINUITY_RATIO = { diatonic: 3, chromatic: 6, symmetric: 3 } as const;

/**
 * The smooth-join refinement (p.553): the first step INTO the next
 * group repeats the same root-interval as the LAST step within the
 * group that just ended. Confirmed against the book's own worked
 * example: E(4) -> F(5) is +1 semitone, so the join continues F -> F#(6).
 */
export function smoothJoinRoot(secondLastRoot: number, lastRoot: number): number {
  return lastRoot + (lastRoot - secondLastRoot);
}

export interface HybridSegmentJoin {
  /** The joining root, computed by `smoothJoinRoot` from the preceding group's own last interval. */
  joinRoot: number;
  /** The semitone interval repeated across the boundary. */
  interval: number;
}

/** Applies the smooth-join rule at one boundary between two groups, given the ending group's own last two roots. */
export function buildHybridSegmentJoin(precedingGroupSecondLastRoot: number, precedingGroupLastRoot: number): HybridSegmentJoin {
  const interval = precedingGroupLastRoot - precedingGroupSecondLastRoot;
  return { joinRoot: smoothJoinRoot(precedingGroupSecondLastRoot, precedingGroupLastRoot), interval };
}
