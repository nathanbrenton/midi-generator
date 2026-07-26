import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intervalInterferenceResultant,
  slidingWindowMerge,
  slidingWindowSelect,
  intervalsToMidiNotes,
} from "../src/core/pitchScaleEvolution.ts";
import { generalPermutations, circularPermutations } from "../src/core/permutations.ts";

test("intervalInterferenceResultant(3,2) matches the book's own example exactly: 2,1,2 (p.115)", () => {
  assert.deepEqual(intervalInterferenceResultant(3, 2), [2, 1, 2]);
});

test("intervalInterferenceResultant(4,1) matches the book's own example exactly: 1,3,1 (p.115)", () => {
  assert.deepEqual(intervalInterferenceResultant(4, 1), [1, 3, 1]);
});

test("intervalInterferenceResultant is symmetric -- (a,b) and (b,a) give the same resultant", () => {
  assert.deepEqual(intervalInterferenceResultant(3, 2), intervalInterferenceResultant(2, 3));
});

test("intervalInterferenceResultant always sums to a+b", () => {
  for (const [a, b] of [[3, 2], [4, 1], [5, 3], [7, 2]]) {
    assert.equal(
      intervalInterferenceResultant(a, b).reduce((x, y) => x + y, 0),
      a + b,
    );
  }
});

test("generalPermutations of the book's own resultant trinomial (2,1,2) gives exactly the 3 forms the book lists (p.115)", () => {
  const rows = generalPermutations([2, 1, 2]).map((r) => r.join(","));
  assert.deepEqual(new Set(rows), new Set(["2,1,2", "2,2,1", "1,2,2"]));
});

test("circularPermutations of the c-d-e-g-a scale's own 5-interval sequence matches the book's own d1 exactly (p.117)", () => {
  const d0 = [2, 2, 3, 2, 3]; // c-d-e-g-a, wrapping to the octave
  const rotations = circularPermutations(d0);
  assert.deepEqual(rotations[1], [2, 3, 2, 3, 2]); // d1: d-e-g-a-c
});

test("slidingWindowMerge with window 2 on the book's own 6-interval example matches all 5 listed rows exactly (p.119)", () => {
  const intervals = [2, 2, 1, 2, 2, 1];
  assert.deepEqual(slidingWindowMerge(intervals, 2), [
    [4, 1, 2, 2, 1],
    [2, 3, 2, 2, 1],
    [2, 2, 3, 2, 1],
    [2, 2, 1, 4, 1],
    [2, 2, 1, 2, 3],
  ]);
});

test("slidingWindowMerge always preserves the total sum", () => {
  const intervals = [2, 2, 1, 2, 2, 1];
  const total = intervals.reduce((a, b) => a + b, 0);
  for (const merged of slidingWindowMerge(intervals, 3)) {
    assert.equal(merged.reduce((a, b) => a + b, 0), total);
  }
});

test("slidingWindowSelect with window 5 on the book's own 6-interval example matches both listed 'partial six-unit scales' (p.120)", () => {
  const intervals = [2, 2, 1, 2, 2, 1];
  assert.deepEqual(slidingWindowSelect(intervals, 5), [
    [2, 2, 1, 2, 2],
    [2, 1, 2, 2, 1],
  ]);
});

test("slidingWindowSelect and slidingWindowMerge both throw for an out-of-range window size", () => {
  assert.throws(() => slidingWindowSelect([1, 2, 3], 0));
  assert.throws(() => slidingWindowSelect([1, 2, 3], 4));
  assert.throws(() => slidingWindowMerge([1, 2, 3], 4));
});

test("intervalsToMidiNotes produces intervals.length + 1 notes via cumulative sum from root", () => {
  assert.deepEqual(intervalsToMidiNotes(60, [2, 1, 2]), [60, 62, 63, 65]);
});
