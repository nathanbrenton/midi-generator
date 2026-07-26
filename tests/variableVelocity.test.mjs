import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NATURAL_HARMONIC_SERIES,
  SUMMATION_SERIES,
  PRIME_NUMBER_SERIES,
  accelerateGroup,
  shiftBalance,
} from "../src/core/variableVelocity.ts";
import { GROWTH_SERIES } from "../src/core/threeGenerators.ts";

test("natural harmonic series 1-8 sums to 36, matching the book's own stated practical stopping point (p.92)", () => {
  const sum = NATURAL_HARMONIC_SERIES.slice(0, 8).reduce((a, b) => a + b, 0);
  assert.equal(sum, 36);
});

test("accelerateGroup((3,1,2), (1,2,3)) matches the book's own worked example exactly: 3,1,2,6,2,4,9,3,6 (p.93)", () => {
  assert.deepEqual(accelerateGroup([3, 1, 2], [1, 2, 3]), [3, 1, 2, 6, 2, 4, 9, 3, 6]);
});

test("accelerateGroup always produces group.length * multipliers.length terms", () => {
  assert.equal(accelerateGroup([1, 2, 3, 4], [1, 2, 3]).length, 12);
});

test("each repetition in accelerateGroup sums to multiplier * sum(group)", () => {
  const group = [3, 1, 2];
  const groupSum = group.reduce((a, b) => a + b, 0);
  const result = accelerateGroup(group, [1, 2, 3]);
  for (let i = 0; i < 3; i++) {
    const repetition = result.slice(i * group.length, (i + 1) * group.length);
    assert.equal(repetition.reduce((a, b) => a + b, 0), groupSum * (i + 1));
  }
});

test("shiftBalance unbalances Chopin's (2,2) binomial into (3,1) with tau=1 (p.93)", () => {
  assert.deepEqual(shiftBalance(2, 2, 1), [3, 1]);
});

test("shiftBalance balances a swung (3,1) binomial back into (2,2) with tau=-1 (p.94)", () => {
  assert.deepEqual(shiftBalance(3, 1, -1), [2, 2]);
});

test("shiftBalance always preserves the total (x+y), for any tau", () => {
  for (const [x, y, tau] of [
    [2, 2, 1],
    [3, 1, -1],
    [4, 4, 0.5],
    [5, 3, 2],
  ]) {
    const [newX, newY] = shiftBalance(x, y, tau);
    assert.equal(newX + newY, x + y);
  }
});

test("SUMMATION_SERIES matches Ch.6's GROWTH_SERIES values exactly -- the book's own cross-chapter consistency", () => {
  assert.deepEqual(SUMMATION_SERIES, GROWTH_SERIES.map((s) => [...s.values]));
});

test("PRIME_NUMBER_SERIES matches the book's own list exactly, including the leading 1 (p.91)", () => {
  assert.deepEqual(PRIME_NUMBER_SERIES, [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
});
