import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pitchClassesFromMidiNotes,
  classifyScaleGroup,
  twoUnitScaleLabel,
} from "../src/core/pitchClassification.ts";

test("pitchClassesFromMidiNotes dedupes octaves down to pitch classes", () => {
  assert.deepEqual(pitchClassesFromMidiNotes([60, 72, 84, 61]), [0, 1]); // C in three octaves + C#
});

test("sousta's C / C# is Group One, one root-tone, range 1, minor second", () => {
  const pitchClasses = pitchClassesFromMidiNotes([60, 61]); // C4, C#4
  const group = classifyScaleGroup(pitchClasses);
  assert.equal(group.group, 1);
  assert.equal(group.rootToneCount, 1);
  assert.equal(group.range, 1);
  assert.equal(twoUnitScaleLabel(pitchClasses), "minor second (m2)");
});

test("all eleven two-unit scale intervals match the book's table exactly", () => {
  const expected = [
    "minor second (m2)",
    "major second (M2)",
    "minor third (m3)",
    "major third (M3)",
    "perfect fourth (P4)",
    "augmented fourth / diminished fifth / tritone (A4, d5)",
    "perfect fifth (P5)",
    "minor sixth (m6)",
    "major sixth (M6)",
    "minor seventh (m7)",
    "major seventh (M7)",
  ];
  for (let interval = 1; interval <= 11; interval++) {
    assert.equal(twoUnitScaleLabel([0, interval]), expected[interval - 1], `interval ${interval}`);
  }
});

test("a one-pitch (monotone) scale is Group One with range 0", () => {
  const group = classifyScaleGroup(pitchClassesFromMidiNotes([60, 72, 84]));
  assert.equal(group.group, 1);
  assert.equal(group.range, 0);
});

test("Group Two boundary: range over 12 (i.e. more than an octave apart)", () => {
  // Two pitch classes are always measured within one octave (0-11), so a
  // literal >12 range is impossible for exactly two distinct pitch
  // classes -- this documents that classifyScaleGroup only ever returns
  // Group One for two-pitch-class inputs, which matches the book's own
  // two-unit scale table (all eleven listed intervals are 1-11).
  for (let interval = 1; interval <= 11; interval++) {
    assert.equal(classifyScaleGroup([0, interval]).group, 1);
  }
});

test("classifyScaleGroup declines to guess for 3+ pitch classes", () => {
  assert.equal(classifyScaleGroup([0, 2, 4]), null);
  assert.equal(classifyScaleGroup([0, 2, 4, 6, 8, 10]), null); // whole tone
});

test("twoUnitScaleLabel returns null for anything but exactly two pitch classes", () => {
  assert.equal(twoUnitScaleLabel([0]), null);
  assert.equal(twoUnitScaleLabel([0, 2, 4]), null);
});
