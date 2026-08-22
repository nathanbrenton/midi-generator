/**
 * Book III, Chapter 1: Geometrical Inversions.
 *
 * A melody recorded as a graph (pitch vs. time) has four "geometrical
 * positions," obtained by optionally rotating it 180 degrees around each
 * of its two axes (p.185-186):
 *   (a) original -- forward in time, right-side up in pitch.
 *   (b) "the same thing backwards" -- time-reversed (retrograde), pitch
 *       unchanged.
 *   (c) "the original but backwards and upside down" -- time-reversed AND
 *       pitch-inverted (retrograde inversion).
 *   (d) "forwards and upside down" -- pitch-inverted only (inversion),
 *       time unchanged.
 *
 * Pitch inversion reflects each note around a chosen "axis of inversion"
 * pitch: invertedPitch = 2*axis - originalPitch. Confirmed against the
 * book's own worked example (p.199): "if the pitch-axis of inversion is g
 * and the theme enters on d [an octave up, i.e. seven semitones ABOVE g],
 * the same melody will start on c in position [d, inversion only] --
 * seven semitones in the opposite direction from the axis of inversion."
 * With g=67, d(one octave up)=74: 2*67-74=60=c. Exact.
 *
 * Time reversal (retrograde) keeps every note's own duration but mirrors
 * its position within the total span: newStart = totalLength -
 * (oldStart + oldDuration) -- the note that ended last now starts first.
 *
 * The book also notes (p.199, Figure 21) that some scales, inverted
 * around one of their own pitch-units, reproduce their own interval
 * structure -- "their compensating scales are identical in structure with
 * the original scale." The whole-tone scale is the clearest case: verified
 * this holds for `symmetricDivisionScale(6)` inverted around its own root.
 *
 * Sections on chord/harmony inversion (each voice treated as its own
 * melody, permuted starting-chord distributions reusing Ch.9's
 * `generalPermutations`), rhythm-adjustment at position boundaries, and
 * coefficients-of-recurrence sequencing across positions are compositional
 * workflow built on this same primitive, not additional formulas, so
 * aren't implemented as separate functions.
 */

export interface TimedNote {
  midiNote: number;
  startUnits: number;
  durationUnits: number;
}

export type GeometricalPosition = "a" | "b" | "c" | "d";

/** Reflects a pitch around `axis`: invertedPitch = 2*axis - pitch (p.199). */
export function invertPitch(pitch: number, axis: number): number {
  return 2 * axis - pitch;
}

/**
 * Retrograde: reverses the order of `notes` in time, preserving each
 * note's own duration. The note that used to end last now starts first.
 * Returned in ascending start-time order.
 */
export function reverseTime<T extends TimedNote>(notes: readonly T[]): T[] {
  if (notes.length === 0) return [];
  const totalLength = Math.max(...notes.map((n) => n.startUnits + n.durationUnits));
  return notes
    .map((n) => ({ ...n, startUnits: totalLength - (n.startUnits + n.durationUnits) }))
    .sort((a, b) => a.startUnits - b.startUnits);
}

/** Reflects every note's pitch around `axis`, leaving timing untouched. */
export function invertPitches<T extends { midiNote: number }>(notes: readonly T[], axis: number): T[] {
  return notes.map((n) => ({ ...n, midiNote: invertPitch(n.midiNote, axis) }));
}

/** One of the four geometrical positions (a/b/c/d) of `notes`, reflected around `axis` (p.185-186). */
export function geometricalPosition<T extends TimedNote & { midiNote: number }>(
  notes: readonly T[],
  axis: number,
  position: GeometricalPosition,
): T[] {
  let result: T[] = [...notes];
  if (position === "b" || position === "c") result = reverseTime(result);
  if (position === "c" || position === "d") result = invertPitches(result, axis);
  return result;
}

/** All four geometrical positions of `notes`, reflected around `axis`. */
export function allFourPositions<T extends TimedNote & { midiNote: number }>(
  notes: readonly T[],
  axis: number,
): Record<GeometricalPosition, T[]> {
  return {
    a: geometricalPosition(notes, axis, "a"),
    b: geometricalPosition(notes, axis, "b"),
    c: geometricalPosition(notes, axis, "c"),
    d: geometricalPosition(notes, axis, "d"),
  };
}
