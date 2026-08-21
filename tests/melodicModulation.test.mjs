import { test } from "node:test";
import assert from "node:assert/strict";
import { findPrimaryAxis, modalRotationsAtTonic } from "../src/core/melodicModulation.ts";
import { intervalsToMidiNotes } from "../src/core/pitchScaleEvolution.ts";

test("findPrimaryAxis picks the pitch with the greatest total summed duration, not the most frequent attack", () => {
  // midiNote 60 sounds for 2+5=7 units total across two notes; 62 sounds for only 1.
  // Echoes the book's own stated number ("durations sum up to 7") without claiming to reproduce Figure 18 itself.
  const result = findPrimaryAxis([
    { midiNote: 60, durationUnits: 2 },
    { midiNote: 62, durationUnits: 1 },
    { midiNote: 60, durationUnits: 5 },
  ]);
  assert.deepEqual(result, { midiNote: 60, totalDuration: 7 });
});

test("findPrimaryAxis picks the most-frequently-attacked pitch only when that's also the longest-sounding one", () => {
  const result = findPrimaryAxis([
    { midiNote: 67, durationUnits: 1 },
    { midiNote: 67, durationUnits: 1 },
    { midiNote: 67, durationUnits: 1 },
    { midiNote: 60, durationUnits: 2 },
  ]);
  assert.equal(result.midiNote, 67); // 3 total > 2 total, even though attacked more often, not just longer
});

test("findPrimaryAxis returns null for an empty melody", () => {
  assert.equal(findPrimaryAxis([]), null);
});

test("modalRotationsAtTonic matches the book's own c-d-e-g-a chart transposed to tonic c exactly (p.127)", () => {
  const intervals = [2, 2, 3, 2, 3]; // c-d-e-g-a, wrapping to the octave
  const rotations = modalRotationsAtTonic(intervals, 60);
  assert.equal(rotations.length, 5);

  // Each rotation returns 6 notes (5 intervals -> 6 cumulative points, the last being the octave repeat);
  // the book's own chart shows only the first 5 -- confirmed against every one of its 5 listed rows.
  const asBookRows = rotations.map((notes) => notes.slice(0, -1));
  assert.deepEqual(asBookRows, [
    [60, 62, 64, 67, 69], // d0: c-d-e-g-a
    [60, 62, 65, 67, 70], // d1: c-d-f-g-bb
    [60, 63, 65, 68, 70], // d2: c-eb-f-ab-bb
    [60, 62, 65, 67, 69], // d3: c-d-f-g-a
    [60, 63, 65, 67, 70], // d4: c-eb-f-g-bb
  ]);
});

test("modalRotationsAtTonic's first rotation (d0) is the original scale itself, unchanged", () => {
  const intervals = [2, 2, 3, 2, 3];
  const rotations = modalRotationsAtTonic(intervals, 60);
  assert.deepEqual(rotations[0], intervalsToMidiNotes(60, intervals));
});

test("modalRotationsAtTonic always transposes every rotation to the SAME tonic (all rows start with the given root)", () => {
  const rotations = modalRotationsAtTonic([2, 1, 2, 2, 2, 3], 67);
  for (const row of rotations) {
    assert.equal(row[0], 67);
  }
});

test("regression check: transposing the book's original (un-rotated) interval sequence to root d matches 'Key of d = d-e-f#-a-b' exactly (p.129, Ch.4 Section D)", () => {
  const intervals = [2, 2, 3, 2]; // c-d-e-g-a as a 4-interval, non-wrapping fragment
  const keyOfD = intervalsToMidiNotes(62, intervals); // root = d
  assert.deepEqual(keyOfD, [62, 64, 66, 69, 71]); // d, e, f#, a, b
});
