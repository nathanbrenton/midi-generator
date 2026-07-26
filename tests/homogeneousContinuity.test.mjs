import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chunkIntoPieces,
  divisorsOf,
  homogeneousContinuityParts,
} from "../src/core/homogeneousContinuity.ts";

test("chunkIntoPieces splits evenly into contiguous pieces", () => {
  assert.deepEqual(chunkIntoPieces([1, 2, 3, 4], 2), [
    [1, 2],
    [3, 4],
  ]);
  assert.deepEqual(chunkIntoPieces(["a1", "b1", "c1", "d1"], 4), [["a1"], ["b1"], ["c1"], ["d1"]]);
});

test("chunkIntoPieces throws when the count doesn't divide evenly", () => {
  assert.throws(() => chunkIntoPieces([1, 2, 3], 2));
});

test("divisorsOf lists every divisor ascending, including 1 and n", () => {
  assert.deepEqual(divisorsOf(4), [1, 2, 4]);
  assert.deepEqual(divisorsOf(6), [1, 2, 3, 6]);
  assert.deepEqual(divisorsOf(5), [1, 5]);
});

test("homogeneousContinuityParts on 4 pieces matches the book's Figure 124 exactly (p.67, 16-bar continuity in 4 parts)", () => {
  const parts = homogeneousContinuityParts(["a1", "b1", "c1", "d1"]);
  assert.deepEqual(parts, [
    ["a1", "b1", "c1", "d1", "b1", "c1", "d1", "a1", "c1", "d1", "a1", "b1", "d1", "a1", "b1", "c1"],
    ["b1", "c1", "d1", "a1", "c1", "d1", "a1", "b1", "d1", "a1", "b1", "c1", "a1", "b1", "c1", "d1"],
    ["c1", "d1", "a1", "b1", "d1", "a1", "b1", "c1", "a1", "b1", "c1", "d1", "b1", "c1", "d1", "a1"],
    ["d1", "a1", "b1", "c1", "a1", "b1", "c1", "d1", "b1", "c1", "d1", "a1", "c1", "d1", "a1", "b1"],
  ]);
});

test("homogeneousContinuityParts on 2 pieces gives 8 items per part (Procedure 1's '8-bar, 2-part continuity', p.66)", () => {
  const parts = homogeneousContinuityParts(["a1", "b1"]);
  assert.deepEqual(parts, [
    ["a1", "b1", "b1", "a1"],
    ["b1", "a1", "a1", "b1"],
  ]);
});

test("every part has exactly n^2 items for n pieces", () => {
  for (const n of [2, 3, 4, 5]) {
    const pieces = Array.from({ length: n }, (_, i) => i);
    const parts = homogeneousContinuityParts(pieces);
    assert.equal(parts.length, n);
    for (const part of parts) assert.equal(part.length, n * n);
  }
});

test("each part is a genuine rotation-offset of the others -- part p+1 is part p's own rotation-sequence shifted by one rotation", () => {
  const pieces = ["a1", "b1", "c1"];
  const parts = homogeneousContinuityParts(pieces);
  // part 0 = rotations [0,1,2]; part 1 = rotations [1,2,0]; part 2 = rotations [2,0,1]
  const n = pieces.length;
  const asRotationBlocks = (part) =>
    Array.from({ length: n }, (_, k) => part.slice(k * n, (k + 1) * n).join(","));
  assert.deepEqual(asRotationBlocks(parts[0]), ["a1,b1,c1", "b1,c1,a1", "c1,a1,b1"]);
  assert.deepEqual(asRotationBlocks(parts[1]), ["b1,c1,a1", "c1,a1,b1", "a1,b1,c1"]);
  assert.deepEqual(asRotationBlocks(parts[2]), ["c1,a1,b1", "a1,b1,c1", "b1,c1,a1"]);
});

test("applying homogeneousContinuityParts to pieces built from chunkIntoPieces of an 8-segment resultant works end to end", () => {
  const segments = [1, 2, 1, 2, 1, 2, 1, 2];
  const pieces = chunkIntoPieces(segments, 4); // 4 pieces of 2 units each
  const parts = homogeneousContinuityParts(pieces);
  assert.equal(parts.length, 4);
  for (const part of parts) {
    const flat = part.flat();
    assert.equal(flat.length, 32); // 4 pieces/rotation * 4 rotations * 2 units/piece
    assert.equal(flat.reduce((a, b) => a + b, 0), 48); // 4 rotations * (sum of all 8 segments = 12)
  }
});
