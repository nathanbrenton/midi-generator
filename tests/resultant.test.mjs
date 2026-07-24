import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateResultant,
  generatorPulse,
  distributeRemainder,
  BINARY_SYNCHRONIZATION_CASES,
} from "../src/core/resultant.ts";

// Published resultant durations for all 19 canonical binary-synchronization
// cases, transcribed from the user's own 2017 reference notes
// (schillinger-midi-artifacts/Resultants_Numbers.txt), which match
// Schillinger's own book. Keyed by "a:b" to cross-check against
// BINARY_SYNCHRONIZATION_CASES below.
const PUBLISHED_RESULTANTS = {
  "3:2": [2, 1, 1, 2],
  "4:3": [3, 1, 2, 2, 1, 3],
  "5:2": [2, 2, 1, 1, 2, 2],
  "5:3": [3, 2, 1, 3, 1, 2, 3],
  "5:4": [4, 1, 3, 2, 2, 3, 1, 4],
  "6:5": [5, 1, 4, 2, 3, 3, 2, 4, 1, 5],
  "7:2": [2, 2, 2, 1, 1, 2, 2, 2],
  "7:3": [3, 3, 1, 2, 3, 2, 1, 3, 3],
  "7:4": [4, 3, 1, 4, 2, 2, 4, 1, 3, 4],
  "7:5": [5, 2, 3, 4, 1, 5, 1, 4, 3, 2, 5],
  "7:6": [6, 1, 5, 2, 4, 3, 3, 4, 2, 5, 1, 6],
  "8:3": [3, 3, 2, 1, 3, 3, 1, 2, 3, 3],
  "8:5": [5, 3, 2, 5, 1, 4, 4, 1, 5, 2, 3, 5],
  "8:7": [7, 1, 6, 2, 5, 3, 4, 4, 3, 5, 2, 6, 1, 7],
  "9:2": [2, 2, 2, 2, 1, 1, 2, 2, 2, 2],
  "9:4": [4, 4, 1, 3, 4, 2, 2, 4, 3, 1, 4, 4],
  "9:5": [5, 4, 1, 5, 3, 2, 5, 2, 3, 5, 1, 4, 5],
  "9:7": [7, 2, 5, 4, 3, 6, 1, 7, 1, 6, 3, 4, 5, 2, 7],
  "9:8": [8, 1, 7, 2, 6, 3, 5, 4, 4, 5, 3, 6, 2, 7, 1, 8],
};

test("all 19 canonical binary-synchronization cases match Schillinger's published resultants", () => {
  assert.equal(BINARY_SYNCHRONIZATION_CASES.length, 19);
  for (const { a, b } of BINARY_SYNCHRONIZATION_CASES) {
    const expected = PUBLISHED_RESULTANTS[`${a}:${b}`];
    assert.ok(expected, `missing published resultant for ${a}:${b}`);
    const result = generateResultant([a, b]);
    assert.deepEqual(
      result.segments.map((s) => s.duration),
      expected,
      `${a}:${b} resultant mismatch`,
    );
  }
});

// Classic published Schillinger example: resultant of 3 and 2 is 2,1,1,2.
test("resultant of 3 and 2", () => {
  const result = generateResultant([3, 2]);
  assert.equal(result.cycleLength, 6);
  assert.deepEqual(result.attackPoints, [0, 2, 3, 4]);
  assert.deepEqual(result.segments.map((s) => s.duration), [2, 1, 1, 2]);
});

// Classic published Schillinger example: resultant of 5 and 3 is 3,2,1,3,1,2,3.
test("resultant of 5 and 3", () => {
  const result = generateResultant([5, 3]);
  assert.equal(result.cycleLength, 15);
  assert.deepEqual(result.segments.map((s) => s.duration), [3, 2, 1, 3, 1, 2, 3]);
});

test("coincidence points list every generator that fires together", () => {
  const result = generateResultant([2, 2]);
  assert.equal(result.cycleLength, 2);
  assert.deepEqual(result.attackPoints, [0, 1]);
  for (const segment of result.segments) {
    assert.deepEqual(segment.sources, [0, 1]);
  }
});

test("three-generator resultant uses the LCM of all values", () => {
  const result = generateResultant([2, 3, 4]);
  assert.equal(result.cycleLength, 12);
  const total = result.segments.reduce((sum, s) => sum + s.duration, 0);
  assert.equal(total, 12);
});

test("rejects fewer than two generators", () => {
  assert.throws(() => generateResultant([3]));
});

test("rejects non-positive-integer generators", () => {
  assert.throws(() => generateResultant([3, 0]));
  assert.throws(() => generateResultant([3, 1.5]));
});

test("generatorPulse produces evenly spaced segments summing to the cycle", () => {
  const pulse = generatorPulse(3, 12);
  assert.equal(pulse.length, 3);
  assert.deepEqual(pulse.map((s) => s.duration), [4, 4, 4]);
});

test("generatorPulse rejects a cycle length that isn't a multiple of the generator", () => {
  assert.throws(() => generatorPulse(5, 12));
});

test("distributeRemainder spreads extras evenly and sums to the remainder", () => {
  const extras = distributeRemainder(5, 2);
  assert.equal(extras.reduce((a, b) => a + b, 0), 2);
  assert.equal(Math.max(...extras), 1);
});
