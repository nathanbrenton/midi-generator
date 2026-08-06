/**
 * Rest-aware analysis of an imported MIDI sample: decomposes a monophonic
 * note sequence into a signed duration sequence -- positive units for a
 * sounding note, negative units for the silence that follows it before
 * the next attack -- so a resultant match can be found against the
 * sample's actual rhythmic identity, silence included, rather than
 * collapsing each note's duration and its trailing rest into a single
 * onset-to-onset gap (the convention `rhythmAnalysis.ts` uses for the
 * simpler "type a pattern" tool).
 *
 * Example: a quarter note followed by an eighth rest followed by an
 * eighth note is `[2, -1, 1]` in eighth-note units -- not `[3, 1]` (which
 * is what onset-to-onset gaps would give, since gap-based measurement
 * can't distinguish a sustained note from a shorter note plus silence).
 */

import type { ImportedNote } from "./midiImport.ts";
import { quantizeGaps } from "./quantize.ts";
import type { NoteEvent } from "./melody.ts";

export interface SignedSegmentsResult {
  /** Positive = a sounding note's own duration; negative = silence before the next attack. Both in quantized grid units. */
  segments: number[];
  divisionsPerQuarter: number | null;
  errorRatio: number | null;
}

/** Decomposes notes into a signed duration sequence, quantizing note durations and inter-note rests together on one shared grid. */
export function notesToSignedSegments(
  notes: readonly ImportedNote[],
  ticksPerQuarterNote: number,
): SignedSegmentsResult {
  if (notes.length === 0) return { segments: [], divisionsPerQuarter: null, errorRatio: null };

  const rawSigned: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    rawSigned.push(notes[i].durationTicks);
    if (i < notes.length - 1) {
      const gap = notes[i + 1].startTicks - (notes[i].startTicks + notes[i].durationTicks);
      if (gap > 0) rawSigned.push(-gap);
    }
  }

  const quantized = quantizeGaps(rawSigned.map((v) => Math.abs(v)), ticksPerQuarterNote);
  const segments = quantized.units.map((unit, i) => (rawSigned[i] < 0 ? -unit : unit));
  return { segments, divisionsPerQuarter: quantized.divisionsPerQuarter, errorRatio: quantized.errorRatio };
}

/** The smallest prefix length that, repeated, reproduces the whole sequence exactly -- the natural "archetype" length for a looping sample. Falls back to the full length when nothing shorter repeats. */
export function findSmallestPeriod(sequence: readonly number[]): number {
  const n = sequence.length;
  if (n === 0) return 0;
  for (let period = 1; period < n; period++) {
    if (n % period !== 0) continue;
    let matches = true;
    for (let i = period; i < n; i++) {
      if (sequence[i] !== sequence[i % period]) {
        matches = false;
        break;
      }
    }
    if (matches) return period;
  }
  return n;
}

/** Builds NoteEvents from a signed duration sequence -- negative (rest) entries advance the cursor but emit no note, i.e. true silence rather than a velocity-0 event. */
export function buildNoteEventsFromSignedSegments(
  segments: readonly number[],
  midiNote: number,
  voice = 0,
  velocity = 100,
): NoteEvent[] {
  const events: NoteEvent[] = [];
  let cursor = 0;
  for (const segment of segments) {
    const duration = Math.abs(segment);
    if (segment > 0) {
      events.push({ midiNote, startUnits: cursor, durationUnits: duration * 0.9, velocity, voice });
    }
    cursor += duration;
  }
  return events;
}

/** Every way of choosing exactly `restCount` of the given durations' positions to be rests, holding order and magnitude fixed -- "every combination of rests" at a given rest count. */
export function restCombinations(durations: readonly number[], restCount: number): number[][] {
  if (restCount < 0 || restCount > durations.length) {
    throw new Error(`restCount must be between 0 and ${durations.length}`);
  }
  const magnitudes = durations.map((d) => Math.abs(d));
  const results: number[][] = [];

  function backtrack(start: number, chosen: number[]): void {
    if (chosen.length === restCount) {
      results.push(magnitudes.map((value, i) => (chosen.includes(i) ? -value : value)));
      return;
    }
    for (let i = start; i <= magnitudes.length - (restCount - chosen.length); i++) {
      chosen.push(i);
      backtrack(i + 1, chosen);
      chosen.pop();
    }
  }
  backtrack(0, []);
  return results;
}
