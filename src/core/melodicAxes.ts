/**
 * Book IV, Chapter 3: The Axes of Melody.
 *
 * Section A (Primary Axis, p.246): "Primary axis is a pitch-time
 * maximum" -- the pitch with the greatest total summed duration in a
 * melody. This is exactly `findPrimaryAxis` from Book II Ch.4
 * (`melodicModulation.ts`); no new function needed here, just the same
 * concept under a different chapter.
 *
 * Section C (Secondary Axes, p.252-253): five directional axes relative
 * to the primary axis -- 0 (flat, at the axis), a (ascending AWAY from
 * the axis), b (descending TOWARD the axis), c (ascending TOWARD the
 * axis), d (descending AWAY from the axis). "The a, b, c and d axes are
 * mutual geometrical inversions... b represents the backward motion of a;
 * c the backward upside-down of a; d the forward upside-down of a" --
 * directly the same a/b/c/d vocabulary as Book III Ch.1's geometrical
 * positions, reused here to classify melodic *direction* rather than
 * transform a whole melody.
 *
 * `buildAxialMelody` turns a sequence of axis terms into an actual
 * melody, derived by close reading of the book's own graphs (Figures 16
 * and 19, p.262-263 -- rendered as page images and zoomed into, since the
 * OCR text layer didn't capture the figures at all):
 *   - 'a'/'d' always START at the primary axis and move AWAY by
 *     `pitchUnits` (default: equal to `timeUnits`, giving the constant
 *     45-degree slope seen throughout Figure 16's monomial examples,
 *     e.g. "a2T+aT" -- a 2-unit climb, then a discontinuous reset back to
 *     the axis, then a 1-unit climb; confirmed both climbs use slope 1).
 *   - 'b'/'c' always END at the primary axis, returning fully to it
 *     regardless of how far away the melody currently is -- confirmed by
 *     zooming into Figure 19's binomial examples: "a2T+bT", "a3T+bT",
 *     and "a5T+b2T" all show the 'b' segment's line returning ALL THE WAY
 *     to the baseline within its own stated time, even though the climb
 *     heights (2, 3, 5) differ while the descent times (1, 1, 2) don't
 *     match them -- i.e. 'b'/'c' have no independent pitch coefficient of
 *     their own in this shorthand notation; their distance is whatever
 *     the melody's current offset from the axis happens to be.
 *   - '0' stays at the axis (resets there if not already, then holds).
 *   - A "reset" (jumping back to the axis before a/d/0 whose current
 *     position isn't already the axis) is instantaneous -- it consumes no
 *     time of its own, matching how "a2T+aT" spans exactly 2+1=3 grid
 *     units total in the figure, not 3 plus extra cells for the jump.
 *
 * Section H (Correlation of Time and Pitch Ratios, p.275-277) shows a
 * more general notation with independently-chosen time AND pitch
 * coefficients per term (e.g. "a2T2P + bTP"), used there purely to
 * illustrate *parallel/contrary/oblique* relationships between the T and
 * P number sequences as a compositional/expressive choice -- not a
 * different mechanical rule. `buildAxialMelody` accepts an optional
 * explicit `pitchUnits` on 'a'/'d' terms for this generality; 'b'/'c'
 * terms keep returning fully to the axis regardless, consistent with
 * every directly-observed graph.
 *
 * Section D's huge worked enumeration of "axial combinations" (p.253-258
 * -- monomial through quintinomial, broken down by repeated-symbol
 * pattern) turns out to be nothing more than `generalPermutations`
 * (Book I Ch.9) applied to the 5-symbol alphabet {0,a,b,c,d} -- e.g. the
 * book's own "3 permutations each" for a 3-term pattern with one repeated
 * pair (like 0+0+a) is exactly `generalPermutations(['0','0','a']).length`.
 * No new combinatorial primitive is needed; this is verified directly
 * against several of the book's own stated counts in the test suite.
 *
 * Sections B, E, F, G (worked analyses of Beethoven, selective
 * continuity, and the time/pitch-ratio figures in isolation) are the
 * source material `buildAxialMelody` was reverse-engineered from, not
 * additional formulas of their own.
 */

export type AxisType = "0" | "a" | "b" | "c" | "d";

export interface AxialTerm {
  axis: AxisType;
  /** Duration of this segment, in time-units (T). */
  timeUnits: number;
  /** Pitch distance from the axis for 'a'/'d' only (default: timeUnits, giving slope 1). Ignored for 'b'/'c'/'0'. */
  pitchUnits?: number;
}

export interface TimedNote {
  midiNote: number;
  startUnits: number;
  durationUnits: number;
}

/**
 * Builds a melody from a sequence of secondary-axis terms relative to
 * `primaryAxisPitch`, chaining each term from wherever the previous one
 * ended. One note is emitted per time-unit, linearly interpolating pitch
 * (rounded to the nearest semitone) from the segment's start to its end.
 */
export function buildAxialMelody(
  terms: readonly AxialTerm[],
  primaryAxisPitch: number,
  timeUnit: number,
): TimedNote[] {
  const notes: TimedNote[] = [];
  let currentOffset = 0;
  let cursor = 0;

  for (const term of terms) {
    if (!Number.isInteger(term.timeUnits) || term.timeUnits < 1) {
      throw new Error("timeUnits must be a positive integer");
    }

    let startOffset: number;
    let targetOffset: number;

    switch (term.axis) {
      case "0":
        startOffset = 0;
        targetOffset = 0;
        break;
      case "a":
        startOffset = 0;
        targetOffset = term.pitchUnits ?? term.timeUnits;
        break;
      case "d":
        startOffset = 0;
        targetOffset = -(term.pitchUnits ?? term.timeUnits);
        break;
      case "b":
        startOffset = Math.max(currentOffset, 0);
        targetOffset = 0;
        break;
      case "c":
        startOffset = Math.min(currentOffset, 0);
        targetOffset = 0;
        break;
    }

    for (let i = 0; i < term.timeUnits; i++) {
      const fraction = (i + 1) / term.timeUnits;
      const offset = startOffset + (targetOffset - startOffset) * fraction;
      notes.push({
        midiNote: Math.round(primaryAxisPitch + offset),
        startUnits: cursor * timeUnit,
        durationUnits: timeUnit,
      });
      cursor++;
    }

    currentOffset = targetOffset;
  }

  return notes;
}
