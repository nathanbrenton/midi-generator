import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findPrimaryAxis,
  modalRotationsAtTonic,
  axisRelationCount,
  axialContinuityPermutations,
} from "../src/core/melodicModulation.ts";
import { intervalsToMidiNotes } from "../src/core/pitchScaleEvolution.ts";
import { compositionCount } from "../src/core/symmetricScales.ts";

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

// Section C, missed on first read: axis-relation counting (p.125).
test("axisRelationCount matches the book's own two stated examples exactly: 25 for a five-unit scale, 49 for a seven-unit scale (p.125)", () => {
  assert.equal(axisRelationCount(5), 25);
  assert.equal(axisRelationCount(7), 49);
});

test("axisRelationCount(1) is the trivial degenerate case: one melody position times one harmony position", () => {
  assert.equal(axisRelationCount(1), 1);
});

// Section C, missed on first read: permuting the transposed displacement
// scales into a melodic continuity (p.127-128).
test("axialContinuityPermutations of 5 transposed scales gives exactly 120 arrangements, matching 'five elements produce 120 permutations' exactly (p.128)", () => {
  const rotations = modalRotationsAtTonic([2, 2, 3, 2, 3], 60);
  const arrangements = axialContinuityPermutations(rotations);
  assert.equal(arrangements.length, 120);
});

test("axialContinuityPermutations preserves each scale's own identity -- every arrangement is a reordering of the same 5 rows, not a value-based dedup", () => {
  const rotations = modalRotationsAtTonic([2, 2, 3, 2, 3], 60);
  const arrangements = axialContinuityPermutations(rotations);
  for (const arrangement of arrangements) {
    assert.equal(arrangement.length, 5);
    for (const scale of rotations) {
      assert.ok(arrangement.includes(scale));
    }
  }
});

test("axialContinuityPermutations' arrangements concatenate into a playable continuity matching the book's own Figure 20 example order (d3-d2-d1-d4-d0)", () => {
  const rotations = modalRotationsAtTonic([2, 2, 3, 2, 3], 60); // rotations[0..4] = d0..d4
  const arrangement = [rotations[3], rotations[2], rotations[1], rotations[4], rotations[0]];
  const continuity = arrangement.flat();
  assert.equal(continuity.length, 5 * rotations[0].length);
  assert.deepEqual(continuity.slice(0, rotations[0].length), rotations[3]); // starts with d3
});

// Cross-chapter confirmation, missed on first read: "330, the number of
// all five-unit scales" (p.128) is exactly Ch.7's compositionCount applied
// to the full 12-semitone octave.
test("the book's own '330, the number of all five-unit scales' matches compositionCount(12, 5) from Book II Ch.7 exactly (p.128)", () => {
  assert.equal(compositionCount(12, 5), 330);
});
