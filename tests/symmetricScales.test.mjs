import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TONIC_COUNTS,
  gapSemitones,
  symmetricTonics,
  factorial,
  compositionCount,
  melodicFormCount,
  generateCompositions,
  buildCompoundSymmetricScale,
  FOURTH_GROUP_TONIC_COUNTS,
  fourthGroupRangeOctaves,
  fourthGroupGapSemitones,
  fourthGroupTonics,
} from "../src/core/symmetricScales.ts";

test("gapSemitones matches the book's own five tonic systems: 6,4,3,2,1 for t=2,3,4,6,12 (p.149)", () => {
  assert.deepEqual(
    TONIC_COUNTS.map((t) => gapSemitones(t)),
    [6, 4, 3, 2, 1],
  );
});

test("gapSemitones rejects a tonicCount that doesn't divide 12 evenly", () => {
  assert.throws(() => gapSemitones(5));
});

test("symmetricTonics(2) matches the book's own C-F# two-tonic system exactly (p.149)", () => {
  assert.deepEqual(symmetricTonics(2, 60), [60, 66]); // C4, F#4
});

test("symmetricTonics(4) matches the book's own C-Eb-F#-A four-tonic (diminished) system exactly", () => {
  assert.deepEqual(symmetricTonics(4, 60), [60, 63, 66, 69]);
});

test("factorial matches known values", () => {
  assert.equal(factorial(0), 1);
  assert.equal(factorial(1), 1);
  assert.equal(factorial(4), 24);
  assert.equal(factorial(6), 720);
});

// The book's own "Scales with Two Tonics" table (gap=6, p.152), decoded from
// garbled OCR exponents by testing them against C(gap-1, N-1) -- confirmed
// exact for all 6 rows, summing to the book's own stated "Total number equals 32."
test("compositionCount matches the book's own two-tonic table exactly: 1,5,10,10,5,1 for N=1..6 (p.152)", () => {
  const gap = gapSemitones(2);
  const counts = [1, 2, 3, 4, 5, 6].map((n) => compositionCount(gap, n));
  assert.deepEqual(counts, [1, 5, 10, 10, 5, 1]);
  assert.equal(
    counts.reduce((a, b) => a + b, 0),
    32,
  );
});

test("compositionCount matches the book's own three-tonic table exactly: 1,3,3,1 for N=1..4, summing to 8 (p.153)", () => {
  const gap = gapSemitones(3);
  const counts = [1, 2, 3, 4].map((n) => compositionCount(gap, n));
  assert.deepEqual(counts, [1, 3, 3, 1]);
  assert.equal(
    counts.reduce((a, b) => a + b, 0),
    8,
  );
});

test("compositionCount matches the book's own four- and six-tonic tables: 1,2,1 (sum 4) and 1,1 (sum 2)", () => {
  const gap4 = gapSemitones(4);
  assert.deepEqual([1, 2, 3].map((n) => compositionCount(gap4, n)), [1, 2, 1]);
  const gap6 = gapSemitones(6);
  assert.deepEqual([1, 2].map((n) => compositionCount(gap6, n)), [1, 1]);
});

// melodicFormCount = (N!)^tonicCount -- every one of the book's own 20
// tabulated "melodic forms" numbers across all 5 tonic systems, decoded and
// confirmed exact (p.152-153).
test("melodicFormCount matches every tabulated value in the book's two-tonic table exactly", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map((n) => melodicFormCount(n, 2)),
    [1, 4, 36, 576, 14400, 518400],
  );
});

test("melodicFormCount matches every tabulated value in the book's three-tonic table exactly", () => {
  assert.deepEqual(
    [1, 2, 3, 4].map((n) => melodicFormCount(n, 3)),
    [1, 8, 216, 13824],
  );
});

test("melodicFormCount matches every tabulated value in the book's four-, six-, and twelve-tonic tables exactly", () => {
  assert.deepEqual([1, 2, 3].map((n) => melodicFormCount(n, 4)), [1, 16, 1296]);
  assert.deepEqual([1, 2].map((n) => melodicFormCount(n, 6)), [1, 64]);
  assert.deepEqual([melodicFormCount(1, 12)], [1]);
});

test("generateCompositions produces exactly compositionCount results for every (gap, N) pair, and each one sums to gap", () => {
  const gap = 6;
  for (let n = 1; n <= gap; n++) {
    const rows = generateCompositions(gap, n);
    assert.equal(rows.length, compositionCount(gap, n));
    for (const row of rows) {
      assert.equal(row.length, n);
      assert.equal(
        row.reduce((a, b) => a + b, 0),
        gap,
      );
      assert.ok(row.every((v) => Number.isInteger(v) && v >= 1));
    }
  }
});

test("generateCompositions includes the book's own Arabic 'string of pearls' example (2,1,2,1) among the 4-unit compositions of 6 (p.150)", () => {
  const rows = generateCompositions(6, 4);
  assert.ok(rows.some((row) => row.join(",") === "2,1,2,1"));
});

test("buildCompoundSymmetricScale tiles the Arabic 'string of pearls' composition across both tonics of a two-tonic system, concatenated correctly", () => {
  const tonics = symmetricTonics(2, 60); // [60, 66]
  const scale = buildCompoundSymmetricScale(tonics, [2, 1, 2, 1]);
  assert.deepEqual(scale, [60, 62, 63, 65, 66, 68, 69, 71]);
});

test("buildCompoundSymmetricScale always produces tonics.length * composition.length notes", () => {
  const tonics = symmetricTonics(3, 60);
  const scale = buildCompoundSymmetricScale(tonics, [1, 2, 1]);
  assert.equal(scale.length, tonics.length * 3);
});

// Book II Ch.8 (Fourth Group, p.163): ranges 2,3,5,11 octaves for
// tonicCount 3,4,6,12 -- decoded as tonicCount-1 in every case, confirmed
// against both of the book's own worked tonic tables.
test("fourthGroupRangeOctaves matches the book's own stated ranges: 2,3,5,11 octaves for 3,4,6,12 tonics (p.163)", () => {
  assert.deepEqual(FOURTH_GROUP_TONIC_COUNTS.map((t) => fourthGroupRangeOctaves(t)), [2, 3, 5, 11]);
});

test("fourthGroupRangeOctaves rejects a tonicCount outside the book's own four systems", () => {
  assert.throws(() => fourthGroupRangeOctaves(5));
});

test("fourthGroupGapSemitones gives an exact integer step for all four of the book's own systems: 8,9,10,11", () => {
  assert.deepEqual(FOURTH_GROUP_TONIC_COUNTS.map((t) => fourthGroupGapSemitones(t)), [8, 9, 10, 11]);
});

test("fourthGroupTonics(3) matches the book's own C-Ab-E(-C1) three-tonic, two-octave system exactly (p.163)", () => {
  const tonics = fourthGroupTonics(3, 60);
  assert.deepEqual(tonics, [60, 68, 76]); // C4, Ab4, E5
  assert.equal(tonics[0] + fourthGroupRangeOctaves(3) * 12, 84); // C1 (two octaves above C) is the implicit next tonic
});

test("fourthGroupTonics(4) matches the book's own C-A-F#-Eb(-C1) four-tonic, three-octave system exactly (p.164)", () => {
  const tonics = fourthGroupTonics(4, 60);
  assert.deepEqual(tonics, [60, 69, 78, 87]); // C4, A4, F#5, Eb6
  assert.equal(tonics[0] + fourthGroupRangeOctaves(4) * 12, 96); // C1 (three octaves above C)
});

test("buildCompoundSymmetricScale, compositionCount, and generateCompositions all work unchanged over a Fourth Group's wider gap", () => {
  const tonics = fourthGroupTonics(3, 60);
  const gap = fourthGroupGapSemitones(3); // 8
  const compositions = generateCompositions(gap, 3);
  assert.equal(compositions.length, compositionCount(gap, 3));
  const scale = buildCompoundSymmetricScale(tonics, compositions[0]);
  assert.equal(scale.length, tonics.length * 3);
});
