import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pitchClassesFromMidiNotes,
  matchesSymmetricDivision,
  classifyScaleGroup,
  twoUnitScaleLabel,
} from "../src/core/pitchClassification.ts";

test("pitchClassesFromMidiNotes dedupes octaves down to pitch classes", () => {
  assert.deepEqual(pitchClassesFromMidiNotes([60, 72, 84, 61]), [0, 1]); // C in three octaves + C#
});

test("sousta's C / C# is Group One, one root-tone, range 1, minor second", () => {
  const group = classifyScaleGroup([60, 61]); // C4, C#4
  assert.equal(group.group, 1);
  assert.equal(group.rootToneCount, "one");
  assert.equal(group.range, 1);
  assert.equal(twoUnitScaleLabel(pitchClassesFromMidiNotes([60, 61])), "minor second (m2)");
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

test("a single pitch class repeated three octaves apart has a real range of 24, so it's Group Two, not Group One", () => {
  const group = classifyScaleGroup([60, 72, 84]);
  assert.equal(group.range, 24);
  assert.equal(group.group, 2);
});

test("a single repeated pitch (no octave jumps) is Group One with range 0", () => {
  const group = classifyScaleGroup([60, 60, 60]);
  assert.equal(group.group, 1);
  assert.equal(group.range, 0);
});

test("Group Two: one root-tone, actual range over an octave (the bug this fixes -- folded pitch classes could never reach this)", () => {
  const group = classifyScaleGroup([60, 74]); // C4, D5 -- 14 semitones apart, same major-second pitch classes as C4/D4
  assert.equal(group.group, 2);
  assert.equal(group.rootToneCount, "one");
  assert.equal(group.range, 14);
});

test("the same major second within one octave is Group One (contrast with the previous test)", () => {
  const group = classifyScaleGroup([60, 62]); // C4, D4 -- 2 semitones apart
  assert.equal(group.group, 1);
  assert.equal(group.range, 2);
});

test("matchesSymmetricDivision recognizes the augmented triad (÷3), diminished 7th (÷4), and whole tone (÷6)", () => {
  assert.equal(matchesSymmetricDivision([0, 4, 8]), 3);
  assert.equal(matchesSymmetricDivision([0, 3, 6, 9]), 4);
  assert.equal(matchesSymmetricDivision([0, 2, 4, 6, 8, 10]), 6);
});

test("matchesSymmetricDivision matches at any rotation, not just rooted on 0", () => {
  assert.equal(matchesSymmetricDivision([1, 5, 9]), 3); // augmented triad rooted on C#
  assert.equal(matchesSymmetricDivision([2, 5, 8, 11]), 4); // diminished 7th rooted on D
});

test("matchesSymmetricDivision returns null for a non-symmetric set", () => {
  assert.equal(matchesSymmetricDivision([0, 2, 5]), null); // no equal-division match
});

test("an augmented triad within one octave is Group Three", () => {
  const group = classifyScaleGroup([60, 64, 68]); // C4, E4, G#4 -- range 8
  assert.equal(group.group, 3);
  assert.equal(group.rootToneCount, "more than one");
  assert.equal(group.symmetricDivision, 3);
});

test("a whole-tone hexad within one octave is Group Three", () => {
  const group = classifyScaleGroup([60, 62, 64, 66, 68, 70]); // range 10, but symmetric -> Group Three by the ≤12 rule
  assert.equal(group.group, 3);
  assert.equal(group.symmetricDivision, 6);
});

test("the same whole-tone pitch classes spanning more than an octave are Group Four", () => {
  const group = classifyScaleGroup([60, 62, 64, 66, 68, 70, 72 + 10]); // adds a D two octaves up -> range > 12
  assert.equal(group.group, 4);
  assert.equal(group.symmetricDivision, 6);
});

test("a non-symmetric 3+ pitch-class collection defaults to Group One or Two, not null", () => {
  const group = classifyScaleGroup([60, 62, 65]); // C, D, F -- no equal-division match
  assert.equal(group.symmetricDivision, null);
  assert.equal(group.group, 1);
  assert.equal(group.range, 5);
});

test("twoUnitScaleLabel returns null for anything but exactly two pitch classes", () => {
  assert.equal(twoUnitScaleLabel([0]), null);
  assert.equal(twoUnitScaleLabel([0, 2, 4]), null);
});
