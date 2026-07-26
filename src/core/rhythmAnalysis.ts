/**
 * Identifies a rhythmic figure (e.g. the Greek "sousta" — quarter, eighth,
 * eighth, i.e. durations 2,1,1) within Schillinger's resultants: which of
 * the 19 canonical cases contain it, and where.
 */

import { generateResultant, BINARY_SYNCHRONIZATION_CASES, type BinarySynchronizationCase } from "./resultant.ts";
import type { ImportedNote } from "./midiImport.ts";
import { buildResultantForTechnique, ALL_TECHNIQUES, type Technique } from "./technique.ts";
import { quantizeGaps } from "./quantize.ts";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Reduces a list of positive durations to the smallest integer ratio that represents the same proportions. */
export function reduceToUnits(values: number[]): number[] {
  if (values.length === 0) return [];
  const divisor = values.reduce(gcd);
  return values.map((value) => value / divisor);
}

export interface RhythmPatternResult {
  pattern: number[];
  /** How many equal parts of a quarter note the chosen quantization grid represents; null when there was no MIDI timing to quantize (manual text entry). */
  divisionsPerQuarter: number | null;
  /** Fraction of the original MIDI timing absorbed as quantization error; null when there was no MIDI timing to quantize. */
  errorRatio: number | null;
}

/**
 * Converts a monophonic note sequence into a duration pattern the same way
 * a resultant expresses one: each duration is the gap to the *next*
 * attack (not the note's own note-off point), since that's what
 * articulation-independent rhythmic identity means for a resultant. The
 * final note has no "next" attack to measure against, so its own
 * note-off duration is used instead.
 *
 * Real MIDI timing (performed or humanized) rarely lands on exact tick
 * values, so the raw gaps are first quantized onto the coarsest standard
 * grid that explains them (see quantize.ts) before being reduced to the
 * smallest integer ratio — taking the GCD of raw, un-quantized ticks
 * would blow tiny timing drift up into a meaningless huge pattern.
 */
export function notesToRhythmPattern(
  notes: readonly ImportedNote[],
  ticksPerQuarterNote: number,
): RhythmPatternResult {
  if (notes.length === 0) return { pattern: [], divisionsPerQuarter: null, errorRatio: null };
  const gapsInTicks = notes.map((note, index) =>
    index < notes.length - 1 ? notes[index + 1].startTicks - note.startTicks : note.durationTicks,
  );
  const quantized = quantizeGaps(gapsInTicks, ticksPerQuarterNote);
  return {
    pattern: reduceToUnits(quantized.units),
    divisionsPerQuarter: quantized.divisionsPerQuarter,
    errorRatio: quantized.errorRatio,
  };
}

/**
 * Finds every starting index where `pattern` occurs as a contiguous,
 * cyclic run within `sequence` (a resultant's durations, read as a
 * repeating cycle — so a match may wrap past the last element back to
 * the first). Patterns longer than the sequence can't occur.
 */
export function findPatternOccurrences(pattern: readonly number[], sequence: readonly number[]): number[] {
  if (pattern.length === 0 || pattern.length > sequence.length) return [];

  const occurrences: number[] = [];
  for (let start = 0; start < sequence.length; start++) {
    let matches = true;
    for (let offset = 0; offset < pattern.length; offset++) {
      if (sequence[(start + offset) % sequence.length] !== pattern[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) occurrences.push(start);
  }
  return occurrences;
}

export interface PatternMatch {
  case: BinarySynchronizationCase;
  occurrences: number[];
}

/** Searches all 19 canonical cases' plain resultants for the given pattern. */
export function findMatchingCases(pattern: readonly number[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  for (const binaryCase of BINARY_SYNCHRONIZATION_CASES) {
    const resultant = generateResultant([binaryCase.a, binaryCase.b]);
    const occurrences = findPatternOccurrences(pattern, resultant.segments.map((s) => s.duration));
    if (occurrences.length > 0) matches.push({ case: binaryCase, occurrences });
  }
  return matches;
}

export interface ResultantMatch {
  case: BinarySynchronizationCase;
  technique: Technique;
  occurrences: number[];
}

/**
 * Searches every one of the 19 canonical cases across every technique
 * (plain, fractioned, expansion, contraction, balance) for the given
 * pattern — the full "all resultants" search, not just Ch. 2A. Used for
 * cross-resultant matches within a selected loop range, where a pattern
 * found in one case/technique may recur in a completely different one
 * (a potential pivot or modulation point).
 */
export function findMatchingResultants(
  pattern: readonly number[],
  techniques: readonly Technique[] = ALL_TECHNIQUES,
): ResultantMatch[] {
  const matches: ResultantMatch[] = [];
  for (const binaryCase of BINARY_SYNCHRONIZATION_CASES) {
    for (const technique of techniques) {
      const resultant = buildResultantForTechnique(technique, binaryCase.a, binaryCase.b);
      const occurrences = findPatternOccurrences(pattern, resultant.segments.map((s) => s.duration));
      if (occurrences.length > 0) matches.push({ case: binaryCase, technique, occurrences });
    }
  }
  return matches;
}
