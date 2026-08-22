import { test } from "node:test";
import assert from "node:assert/strict";
import {
  axisInversionCombinationCount,
  buildContinuitySegment,
  buildMelodicContinuity,
  continuityOrderings,
} from "../src/core/melodicContinuity.ts";

// Book IV Ch.6 (p.313, page-image verified since OCR mangled the text):
// "each of the individual axes has four geometrical inversions. Thus, the
// number of combinations of the three axes... equals 4^3 = 64."
test("axisInversionCombinationCount matches the book's own worked example exactly: 3 segments -> 4^3=64 (p.313)", () => {
  assert.equal(axisInversionCombinationCount(3), 64);
});

test("axisInversionCombinationCount generalizes correctly for other segment counts", () => {
  assert.equal(axisInversionCombinationCount(1), 4);
  assert.equal(axisInversionCombinationCount(2), 16);
  assert.equal(axisInversionCombinationCount(4), 256);
});

test("buildContinuitySegment with position 'a' and no expansion matches buildAxialMelody directly (identity composition)", () => {
  const segment = buildContinuitySegment({ term: { axis: "a", timeUnits: 2 }, position: "a" }, 60, 1);
  assert.deepEqual(
    segment.map((n) => n.midiNote),
    [61, 62],
  );
});

test("buildContinuitySegment with position 'd' inverts the segment's pitches around the primary axis (Book III Ch.1)", () => {
  const segment = buildContinuitySegment({ term: { axis: "a", timeUnits: 2 }, position: "d" }, 60, 1);
  assert.deepEqual(
    segment.map((n) => n.midiNote),
    [59, 58],
  );
});

test("buildContinuitySegment applies its own expansion coefficient before the geometrical position (Book III Ch.2)", () => {
  const segment = buildContinuitySegment(
    { term: { axis: "a", timeUnits: 2 }, position: "a", expansionCoefficient: 2 },
    60,
    1,
  );
  assert.deepEqual(
    segment.map((n) => n.midiNote),
    [62, 64],
  );
});

test("buildContinuitySegment combines expansion AND inversion together", () => {
  const segment = buildContinuitySegment(
    { term: { axis: "a", timeUnits: 2 }, position: "d", expansionCoefficient: 2 },
    60,
    1,
  );
  assert.deepEqual(
    segment.map((n) => n.midiNote),
    [58, 56],
  );
});

test("buildMelodicContinuity concatenates independently-built segments back-to-back in time, each keeping its own inversion/expansion", () => {
  const continuity = buildMelodicContinuity(
    [
      { term: { axis: "a", timeUnits: 2 }, position: "a" }, // 61@0, 62@1
      { term: { axis: "a", timeUnits: 2 }, position: "d" }, // 59@0, 58@1 -> shifted to start at 2
    ],
    60,
    1,
  );
  assert.deepEqual(
    continuity.map((n) => ({ midiNote: n.midiNote, startUnits: n.startUnits })),
    [
      { midiNote: 61, startUnits: 0 },
      { midiNote: 62, startUnits: 1 },
      { midiNote: 59, startUnits: 2 },
      { midiNote: 58, startUnits: 3 },
    ],
  );
});

test("buildMelodicContinuity respects a differently-sized timeUnit for shifting later segments", () => {
  const continuity = buildMelodicContinuity(
    [
      { term: { axis: "a", timeUnits: 3 }, position: "a" },
      { term: { axis: "0", timeUnits: 1 }, position: "a" },
    ],
    60,
    480,
  );
  // first segment spans 3*480=1440 ticks; second segment should start exactly there.
  assert.equal(continuity[3].startUnits, 1440);
});

test("continuityOrderings gives every permutation of the segment list, matching axisInversionCombinationCount's own N! sibling from generalPermutationsOf", () => {
  const segments = [
    { term: { axis: "a", timeUnits: 1 }, position: "a" },
    { term: { axis: "b", timeUnits: 1 }, position: "b" },
    { term: { axis: "c", timeUnits: 1 }, position: "c" },
  ];
  const orderings = continuityOrderings(segments);
  assert.equal(orderings.length, 6); // 3!
  for (const ordering of orderings) {
    assert.equal(ordering.length, 3);
  }
});
