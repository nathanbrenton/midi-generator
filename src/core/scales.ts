/**
 * Schillinger's Theory of Pitch Scales (Book II): scales built from
 * symmetric divisions of the octave, and from a repeating interval cell
 * tiled across the octave — the pitch-axis counterpart to the rhythm
 * resultants in resultant.ts.
 */

import { distributeRemainder } from "./resultant.ts";

export interface PitchScale {
  /** Semitone step between each consecutive degree, e.g. [2,2,3] for a 3-degree division. */
  intervals: number[];
  /** Cumulative semitone offsets from the root, degrees[0] === 0. */
  degrees: number[];
}

function scaleFromIntervals(intervals: number[]): PitchScale {
  const degrees: number[] = [0];
  let sum = 0;
  for (const step of intervals) {
    sum += step;
    degrees.push(sum);
  }
  degrees.pop(); // drop the final entry, which lands back on the octave/root
  return { intervals, degrees };
}

/**
 * Divides the octave (12 semitones) into n parts, as equally as possible.
 * Exact division types (n=2,3,4,6,12) reproduce the classic symmetric
 * scales (whole-tone, augmented, diminished, chromatic); other values of n
 * spread the remainder evenly across the parts.
 */
export function symmetricDivisionScale(n: number, octaveSemitones = 12): PitchScale {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("n must be a positive integer");
  }
  const base = Math.floor(octaveSemitones / n);
  const remainder = octaveSemitones % n;
  const extras = remainder === 0 ? Array(n).fill(0) : distributeRemainder(n, remainder);
  const intervals = extras.map((extra) => base + extra);
  return scaleFromIntervals(intervals);
}

/**
 * Tiles a repeating interval cell (e.g. [1,2] or [2,1,2]) across the
 * octave. The final step is clipped so the tiling lands exactly on the
 * octave boundary, even if that cuts the last repetition short.
 */
export function intervalCellScale(cell: number[], octaveSemitones = 12): PitchScale {
  if (cell.length === 0 || cell.some((step) => !Number.isInteger(step) || step < 1)) {
    throw new Error("cell must be a non-empty list of positive integer steps");
  }

  const intervals: number[] = [];
  let sum = 0;
  let i = 0;
  while (sum < octaveSemitones) {
    const step = cell[i % cell.length];
    const clipped = Math.min(step, octaveSemitones - sum);
    intervals.push(clipped);
    sum += clipped;
    i++;
  }
  return scaleFromIntervals(intervals);
}

/** Named presets covering Schillinger's best-known symmetric scale families. */
export const SCALE_PRESETS: ReadonlyArray<{ name: string; build: () => PitchScale }> = [
  { name: "Augmented (÷3)", build: () => symmetricDivisionScale(3) },
  { name: "Diminished (÷4)", build: () => symmetricDivisionScale(4) },
  { name: "Equal Pentatonic (÷5)", build: () => symmetricDivisionScale(5) },
  { name: "Whole Tone (÷6)", build: () => symmetricDivisionScale(6) },
  { name: "Equal Heptatonic (÷7)", build: () => symmetricDivisionScale(7) },
  { name: "Chromatic (÷12)", build: () => symmetricDivisionScale(12) },
  { name: "Diatonic-ish Cell [2,1]", build: () => intervalCellScale([2, 1]) },
  { name: "Bebop Cell [1,2]", build: () => intervalCellScale([1, 2]) },
  { name: "Wide Cell [1,5]", build: () => intervalCellScale([1, 5]) },
];

/** Maps a scale degree index (any integer, including negative or >length) onto a MIDI note. */
export function midiNoteForDegree(scale: PitchScale, rootMidiNote: number, degreeIndex: number): number {
  const length = scale.degrees.length;
  const octaveOffset = Math.floor(degreeIndex / length) * 12;
  const withinOctave = ((degreeIndex % length) + length) % length;
  return rootMidiNote + octaveOffset + scale.degrees[withinOctave];
}
