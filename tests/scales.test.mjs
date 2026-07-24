import { test } from "node:test";
import assert from "node:assert/strict";
import {
  symmetricDivisionScale,
  intervalCellScale,
  midiNoteForDegree,
} from "../src/core/scales.ts";

test("dividing by 6 gives the whole-tone scale", () => {
  const scale = symmetricDivisionScale(6);
  assert.deepEqual(scale.degrees, [0, 2, 4, 6, 8, 10]);
});

test("dividing by 4 gives the diminished (symmetric) scale", () => {
  const scale = symmetricDivisionScale(4);
  assert.deepEqual(scale.degrees, [0, 3, 6, 9]);
});

test("dividing by 3 gives the augmented scale", () => {
  const scale = symmetricDivisionScale(3);
  assert.deepEqual(scale.degrees, [0, 4, 8]);
});

test("dividing by 12 gives the chromatic scale", () => {
  const scale = symmetricDivisionScale(12);
  assert.equal(scale.degrees.length, 12);
  assert.deepEqual(scale.intervals, Array(12).fill(1));
});

test("uneven division distributes the remainder and still sums to the octave", () => {
  const scale = symmetricDivisionScale(5);
  assert.equal(scale.intervals.reduce((a, b) => a + b, 0), 12);
  assert.equal(scale.degrees.length, 5);
});

test("interval cell tiles across the octave and clips the final step", () => {
  const scale = intervalCellScale([1, 2]);
  assert.deepEqual(scale.degrees, [0, 1, 3, 4, 6, 7, 9, 10]);
  assert.equal(scale.intervals.reduce((a, b) => a + b, 0), 12);
});

test("midiNoteForDegree wraps to the next octave past the scale length", () => {
  const scale = symmetricDivisionScale(4); // [0,3,6,9]
  assert.equal(midiNoteForDegree(scale, 60, 0), 60);
  assert.equal(midiNoteForDegree(scale, 60, 4), 72); // one full octave up
  assert.equal(midiNoteForDegree(scale, 60, -1), 60 - 3); // wraps below the root
});
