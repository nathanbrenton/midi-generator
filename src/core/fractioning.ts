/**
 * Schillinger's Theory of Rhythm (Book I, Chapter 4): Fractioning.
 *
 * Expands a binary-synchronization resultant into finer values by nesting
 * the minor generator's own pulse inside the major generator's grid. On a
 * grid of a² units (a = major generator), generator a fires its normal
 * evenly-spaced pulse; generator b fires (a - b + 1) staggered copies of
 * its own pulse, each spanning a·b units and starting a units later than
 * the last. The union of all of those attack points, sorted, is the
 * fractioned resultant.
 *
 * Reverse-engineered from an earlier, unfinished prototype (whose canvas
 * drawing got the geometry right but never converted it to a final
 * duration array), then confirmed directly against the book itself
 * (Figures 25-26: the a-b+1 formula and the worked 3:2 example,
 * r = 2/9+1/9+1/9+1/9+1/9+1/9+2/9) — see tests/fractioning.test.mjs.
 */

import type { Resultant, ResultantSegment } from "./resultant.ts";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function generateFractionedResultant(a: number, b: number): Resultant {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) {
    throw new Error("fractioning requires positive integer generators");
  }
  if (a <= b) {
    throw new Error("fractioning requires the major generator a to be greater than b");
  }

  const cycleLength = a * a;
  const groupCount = a - b + 1;

  const sourcesByPoint = new Map<number, number[]>();
  function addPoint(point: number, source: number) {
    const sources = sourcesByPoint.get(point) ?? [];
    sources.push(source);
    sourcesByPoint.set(point, sources);
  }

  for (let k = 0; k <= a; k++) addPoint(k * a, 0); // generator a's own pulse

  for (let group = 0; group < groupCount; group++) {
    const start = a * group;
    for (let k = 0; k <= a; k++) addPoint(start + k * b, group + 1);
  }

  const attackPoints = [...sourcesByPoint.keys()]
    .filter((point) => point < cycleLength)
    .sort((x, y) => x - y);

  const segments: ResultantSegment[] = attackPoints.map((point, i) => {
    const next = attackPoints[i + 1] ?? cycleLength;
    return {
      duration: next - point,
      sources: (sourcesByPoint.get(point) ?? []).sort((x, y) => x - y),
    };
  });

  return { cycleLength, segments, attackPoints };
}

/**
 * Grouping (Ch. 3) applied to a fractioned resultant (Figures 27-31): bars
 * of a² or of a always close exactly, since a divides a² by construction.
 * Bars of b generally don't — a² isn't a multiple of b — so the book gives
 * a quotient/remainder rule instead: Q = a²/b bars per run, with the
 * remainder's reduced denominator telling you how many times the resultant
 * has to repeat before it and the bar lines close together simultaneously.
 */
export interface FractionedGrouping {
  label: string;
  bars: number;
  unitsPerBar: number;
  remainderUnits: number;
  /** How many times the resultant must repeat before it and the bar lines close together; 1 when remainderUnits is 0. */
  repeatsToClose: number;
}

export function computeFractionedGroupings(a: number, b: number): FractionedGrouping[] {
  const total = a * a;

  function group(label: string, unitsPerBar: number): FractionedGrouping {
    const bars = Math.floor(total / unitsPerBar);
    const remainderUnits = total % unitsPerBar;
    const repeatsToClose = remainderUnits === 0 ? 1 : unitsPerBar / gcd(total, unitsPerBar);
    return { label, bars, unitsPerBar, remainderUnits, repeatsToClose };
  }

  return [
    group("By a² (common product)", total),
    group("By major generator (a)", a),
    group("By minor generator (b)", b),
  ];
}
