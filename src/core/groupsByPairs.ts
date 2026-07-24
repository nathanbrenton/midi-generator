/**
 * Schillinger's Theory of Rhythm (Book I, Chapter 5): Composition of
 * Groups by Pairs — Balance, Expansion, and Contraction. All three pair
 * the plain resultant (Ch. 2A) with its fractioned expansion (Ch. 4); the
 * chapter's own definition ("moving from a long to a short group is
 * contraction; the opposite is expansion") is literal: Expansion states
 * the shorter plain resultant then the longer fractioned one, Contraction
 * states them in the reverse order.
 *
 * Confirmed against the book's own worked examples (Figures 38-46: 3:2 and
 * 4:3 for all three, plus the extended 5:2 case for Balance) — see
 * tests/groupsByPairs.test.mjs. Balance's "+a(a-b)" term reads as an
 * algebraic remainder in the formula, but the worked examples show it's a
 * literal appended sustained note, not a merge into the resultant that
 * precedes it.
 */

import { generateResultant, type Resultant, type ResultantSegment } from "./resultant.ts";
import { generateFractionedResultant } from "./fractioning.ts";
import type { Grouping } from "./grouping.ts";

function concat(...resultants: Resultant[]): Resultant {
  let cursor = 0;
  const segments: ResultantSegment[] = [];
  const attackPoints: number[] = [];
  for (const resultant of resultants) {
    for (const segment of resultant.segments) {
      attackPoints.push(cursor);
      segments.push(segment);
      cursor += segment.duration;
    }
  }
  return { cycleLength: cursor, segments, attackPoints };
}

/** Expansion (Figures 42-43): the plain resultant, then its fractioned expansion — short to long. */
export function buildExpansion(a: number, b: number): Resultant {
  return concat(generateResultant([a, b]), generateFractionedResultant(a, b));
}

/** Contraction (Figures 45-46): the fractioned expansion, then the plain resultant — long to short. */
export function buildContraction(a: number, b: number): Resultant {
  return concat(generateFractionedResultant(a, b), generateResultant([a, b]));
}

/**
 * Balance (Figures 37-41): the fractioned resultant, then the plain
 * resultant repeated m = floor(a/b) times, then one sustained note of
 * duration a² - m·a·b. Always totals exactly 2a², matching the chapter's
 * framing of "stating the theme twice... the second time brought to a
 * completion."
 */
export function buildBalance(a: number, b: number): Resultant {
  const m = Math.floor(a / b);
  const plain = generateResultant([a, b]);
  const tailDuration = a * a - m * a * b;

  const body = concat(generateFractionedResultant(a, b), ...Array(m).fill(plain));

  return {
    cycleLength: body.cycleLength + tailDuration,
    segments: [...body.segments, { duration: tailDuration, sources: [] }],
    attackPoints: [...body.attackPoints, body.cycleLength],
  };
}

/**
 * All three pair techniques use one grouping only ("Grouping for such pairs
 * is through a only" — the book states this once, under Balance, and it
 * applies uniformly). It's always exact: a divides ab+a², a²+ab, and 2a²
 * without remainder.
 */
export function computePairGrouping(a: number, totalLength: number): Grouping {
  return {
    label: "By major generator (a) — the only grouping used for pairs",
    bars: totalLength / a,
    unitsPerBar: a,
  };
}
