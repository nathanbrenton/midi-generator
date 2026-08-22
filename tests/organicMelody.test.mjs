import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extendSummationSeries,
  spiralSequenceBasic,
  spiralSequenceDeveloped,
  spiralSequenceExtended,
} from "../src/core/organicMelody.ts";
import { SUMMATION_SERIES } from "../src/core/variableVelocity.ts";
import { intervalsToMidiNotes } from "../src/core/pitchScaleEvolution.ts";

test("extendSummationSeries reproduces the book's own First (Fibonacci) series to 11 terms exactly: 1,2,3,5,8,13,21,34,55,89,144 (p.330)", () => {
  assert.deepEqual(extendSummationSeries(SUMMATION_SERIES[0], 11), [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]);
});

test("extendSummationSeries reproduces the book's own Second series to 7 terms exactly: 1,3,4,7,11,18,29 (p.333)", () => {
  assert.deepEqual(extendSummationSeries(SUMMATION_SERIES[1], 7), [1, 3, 4, 7, 11, 18, 29]);
});

test("extendSummationSeries reproduces the book's own Third series to 7 terms exactly: 1,4,5,9,14,23,37 (p.333, confirmed again by Figure 130's own caption, p.348)", () => {
  assert.deepEqual(extendSummationSeries(SUMMATION_SERIES[2], 7), [1, 4, 5, 9, 14, 23, 37]);
});

test("extendSummationSeries returns the seed unchanged when count <= seed.length", () => {
  assert.deepEqual(extendSummationSeries(SUMMATION_SERIES[0], 4), [1, 2, 3, 5]);
});

// Pattern A (p.341-343), confirmed against the book's own Figure 120/121
// worked numbers, rendered as a page image since the OCR text mangled
// the formula notation into noise.
test("spiralSequenceBasic matches the book's own Figure 120 first worked example exactly: 5,8,-21 (First series, starting at index 3)", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[0], 11);
  assert.deepEqual(spiralSequenceBasic(series, 3), [5, 8, -21]);
});

test("spiralSequenceBasic matches the book's own Figure 120/121 second worked example exactly: 8,13,-34 (First series, starting at index 4)", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[0], 11);
  assert.deepEqual(spiralSequenceBasic(series, 4), [8, 13, -34]);
});

test("spiralSequenceBasic always produces exactly 3 intervals (4 pitch-units), matching the book's own stated count (p.343)", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[0], 11);
  assert.equal(spiralSequenceBasic(series, 0).length, 3);
  const notes = intervalsToMidiNotes(60, spiralSequenceBasic(series, 3));
  assert.equal(notes.length, 4);
});

// Pattern B (p.345-346): three summed terms, one omitted, next with
// opposite sign.
test("spiralSequenceDeveloped produces the correct 4-term pattern: t[i],t[i+1],t[i+2],-t[i+4]", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[0], 11);
  // index 0: 1,2,3,-8 (omits index3=5)
  assert.deepEqual(spiralSequenceDeveloped(series, 0), [1, 2, 3, -8]);
});

test("spiralSequenceDeveloped always produces exactly 4 intervals (5 pitch-units)", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[2], 7);
  const pattern = spiralSequenceDeveloped(series, 0);
  assert.equal(pattern.length, 4);
  const notes = intervalsToMidiNotes(60, pattern);
  assert.equal(notes.length, 5);
});

// Pattern C (p.350-352): three summed terms, two omitted, last with
// opposite sign.
test("spiralSequenceExtended produces the correct 4-term pattern: t[i],t[i+1],t[i+2],-t[i+5]", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[0], 11);
  // index 0: 1,2,3,-13 (omits index3=5, index4=8)
  assert.deepEqual(spiralSequenceExtended(series, 0), [1, 2, 3, -13]);
});

test("spiralSequenceExtended always produces exactly 4 intervals (5 pitch-units)", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[1], 7);
  const pattern = spiralSequenceExtended(series, 0);
  assert.equal(pattern.length, 4);
  const notes = intervalsToMidiNotes(60, pattern);
  assert.equal(notes.length, 5);
});

test("all three spiral patterns produce a melody whose final note is BELOW where it would land without the negative sign (the descending resolution)", () => {
  const series = extendSummationSeries(SUMMATION_SERIES[0], 11);
  const notes = intervalsToMidiNotes(60, spiralSequenceBasic(series, 3)); // 5,8,-21
  // 60 -> 65 -> 73 -> 52 (73-21=52), confirming the final leap is a large descent
  assert.deepEqual(notes, [60, 65, 73, 52]);
});
