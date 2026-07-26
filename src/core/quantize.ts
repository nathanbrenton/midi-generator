/**
 * Snaps imported MIDI note-to-note gaps (raw ticks) onto the coarsest
 * standard rhythmic grid that explains them within a small tolerance.
 * Hand-built test files land exactly on tick values, but real (performed
 * or humanized) MIDI drifts a few ticks off exact subdivisions — taking
 * the GCD of raw ticks directly (the previous approach) blows that drift
 * up into a huge, meaningless coprime pattern instead of the plain
 * rhythm it's actually close to.
 */

/** Standard subdivisions of a quarter note to try, coarsest first, including triplets. */
const CANDIDATE_DIVISIONS = [1, 2, 3, 4, 6, 8, 12, 16];

/** Fraction of total duration that may be absorbed as quantization error before trying a finer grid. */
const ERROR_TOLERANCE = 0.06;

export const DIVISION_LABELS: Readonly<Record<number, string>> = {
  1: "quarter-note",
  2: "eighth-note",
  3: "eighth-note triplet",
  4: "sixteenth-note",
  6: "sixteenth-note triplet",
  8: "thirty-second-note",
  12: "thirty-second-note triplet",
  16: "sixty-fourth-note",
};

export interface QuantizedGaps {
  /** How many equal parts of a quarter note the chosen grid represents (4 = sixteenth notes, 6 = sixteenth-note triplets, etc). */
  divisionsPerQuarter: number;
  /** One integer per gap, in grid units. */
  units: number[];
  /** Fraction of the original timing that didn't land exactly on the grid (0 = perfectly quantized). */
  errorRatio: number;
}

function relativeError(gaps: readonly number[], grid: number): number {
  let errorSum = 0;
  let totalSum = 0;
  for (const gap of gaps) {
    const units = Math.max(1, Math.round(gap / grid));
    errorSum += Math.abs(gap - units * grid);
    totalSum += gap;
  }
  return totalSum > 0 ? errorSum / totalSum : 0;
}

/**
 * Finds the coarsest of CANDIDATE_DIVISIONS whose grid explains `gaps`
 * within ERROR_TOLERANCE, falling back to whichever candidate fits best
 * if none clear the tolerance (e.g. genuinely free-time playing).
 */
export function quantizeGaps(gaps: readonly number[], ticksPerQuarterNote: number): QuantizedGaps {
  if (gaps.length === 0) return { divisionsPerQuarter: 1, units: [], errorRatio: 0 };

  let best = { divisionsPerQuarter: CANDIDATE_DIVISIONS[0], error: Infinity };
  for (const divisionsPerQuarter of CANDIDATE_DIVISIONS) {
    const grid = ticksPerQuarterNote / divisionsPerQuarter;
    const error = relativeError(gaps, grid);
    if (error < best.error) best = { divisionsPerQuarter, error };
    if (error <= ERROR_TOLERANCE) break; // coarsest grid that explains the timing well enough
  }

  const grid = ticksPerQuarterNote / best.divisionsPerQuarter;
  const units = gaps.map((gap) => Math.max(1, Math.round(gap / grid)));
  return { divisionsPerQuarter: best.divisionsPerQuarter, units, errorRatio: best.error };
}
