import { test } from "node:test";
import assert from "node:assert/strict";
import { quantizeGaps } from "../src/core/quantize.ts";

const PPQ = 480; // ticks per quarter note

test("sousta (quarter, eighth, eighth) quantizes perfectly on the eighth-note grid, its coarsest exact fit", () => {
  const result = quantizeGaps([480, 240, 240], PPQ);
  assert.equal(result.divisionsPerQuarter, 2);
  assert.equal(result.errorRatio, 0);
  assert.deepEqual(result.units, [2, 1, 1]);
});

test("picks the coarsest grid that actually explains the gaps, not just any grid", () => {
  // A dotted-eighth + sixteenth pattern (360, 120) only lands cleanly on
  // the sixteenth-note grid (divisionsPerQuarter=4), not the quarter or
  // eighth grid.
  const result = quantizeGaps([360, 120], PPQ);
  assert.equal(result.divisionsPerQuarter, 4);
  assert.equal(result.errorRatio, 0);
  assert.deepEqual(result.units, [3, 1]);
});

test("humanized (slightly off-grid) timing still resolves to the intended grid with small nonzero error", () => {
  // Sixteenth-note pattern (120 ticks each) performed with a few ticks of
  // human drift on each note.
  const result = quantizeGaps([118, 123, 121, 117], PPQ);
  assert.equal(result.divisionsPerQuarter, 4);
  assert.deepEqual(result.units, [1, 1, 1, 1]);
  assert.ok(result.errorRatio > 0 && result.errorRatio < 0.06);
});

test("a genuine triplet feel resolves to a triplet division, not a straight one", () => {
  // Eighth-note triplets: 160 ticks each (3 per quarter note).
  const result = quantizeGaps([160, 160, 160, 160, 160, 160], PPQ);
  assert.equal(result.divisionsPerQuarter, 3);
  assert.deepEqual(result.units, [1, 1, 1, 1, 1, 1]);
  assert.equal(result.errorRatio, 0);
});

test("empty input returns an empty result without dividing by zero", () => {
  const result = quantizeGaps([], PPQ);
  assert.deepEqual(result.units, []);
  assert.equal(result.errorRatio, 0);
});

test("a single very short gap is clamped to at least 1 unit, never 0", () => {
  const result = quantizeGaps([2], PPQ);
  assert.ok(result.units[0] >= 1);
});
