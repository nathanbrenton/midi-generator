import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VARIABLE_DOUBLING_FORMS,
  doublingPositions,
  positionCount,
  buildDoublingVoicing,
} from "../src/core/variableDoublings.ts";

test("VARIABLE_DOUBLING_FORMS matches the book's own comparative table exactly (p.401)", () => {
  assert.deepEqual(VARIABLE_DOUBLING_FORMS[1].upperVoiceFunctions, [1, 3, 5]);
  assert.deepEqual(VARIABLE_DOUBLING_FORMS[3].upperVoiceFunctions, [3, 3, 5]);
  assert.deepEqual(VARIABLE_DOUBLING_FORMS[5].upperVoiceFunctions, [3, 5, 5]);
});

test("S(5)(3) and S(5)(5) each have exactly 3 positions, matching the book's own explicit claim (p.401)", () => {
  assert.equal(positionCount(3), 3);
  assert.equal(positionCount(5), 3);
});

test("S(5)(1) has 6 positions -- unstated in prose, but the general-permutations count of 3 distinct values, matching Figure 57's own six columns", () => {
  assert.equal(positionCount(1), 6);
});

test("doublingPositions never produces a duplicate ordering", () => {
  for (const doubled of [1, 3, 5]) {
    const positions = doublingPositions(doubled);
    const unique = new Set(positions.map((p) => p.join(",")));
    assert.equal(unique.size, positions.length);
  }
});

test("every position keeps the same multiset of functions as its doubling form", () => {
  for (const doubled of [1, 3, 5]) {
    const expected = [...VARIABLE_DOUBLING_FORMS[doubled].upperVoiceFunctions].sort();
    for (const position of doublingPositions(doubled)) {
      assert.deepEqual([...position].sort(), expected);
    }
  }
});

test("buildDoublingVoicing keeps the root in the bass and stacks the upper voices strictly ascending", () => {
  const voicing = buildDoublingVoicing([3, 3, 5], 60, { third: 4, fifth: 7 });
  assert.equal(voicing.bass, 60);
  assert.equal(voicing.upper.length, 3);
  for (let i = 1; i < voicing.upper.length; i++) {
    assert.ok(voicing.upper[i] > voicing.upper[i - 1]);
  }
  assert.ok(voicing.upper.every((note) => note > voicing.bass));
});

test("buildDoublingVoicing reproduces the correct pitch classes for a C major S(5)(1) voicing", () => {
  const voicing = buildDoublingVoicing([1, 3, 5], 60, { third: 4, fifth: 7 });
  const pitchClasses = voicing.upper.map((n) => n % 12);
  assert.deepEqual(pitchClasses, [0, 4, 7]); // C, E, G
});
