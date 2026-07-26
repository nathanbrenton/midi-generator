import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GROWTH_SERIES,
  THREE_GENERATOR_CASES,
  commonProduct,
  complementaryFactors,
  buildTheme,
  buildCountertheme,
  threeGeneratorGroupings,
} from "../src/core/threeGenerators.ts";

test("GROWTH_SERIES matches the book's three series exactly", () => {
  assert.deepEqual(GROWTH_SERIES.map((s) => [...s.values]), [
    [1, 2, 3, 5, 8, 13],
    [1, 3, 4, 7, 11, 18],
    [1, 4, 5, 9, 14, 23],
  ]);
});

test("each value in a growth series (after the first two) is the sum of the two before it", () => {
  for (const series of GROWTH_SERIES) {
    for (let i = 2; i < series.values.length; i++) {
      assert.equal(series.values[i], series.values[i - 1] + series.values[i - 2]);
    }
  }
});

test("THREE_GENERATOR_CASES matches the book's 'important and practical combinations'", () => {
  assert.deepEqual(
    THREE_GENERATOR_CASES.map((c) => c.label),
    ["2 : 3 : 5", "3 : 5 : 8", "3 : 4 : 7", "4 : 5 : 9"],
  );
});

test("every three-generator case is pairwise coprime, so its common product equals its LCM", () => {
  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }
  for (const { generators } of THREE_GENERATOR_CASES) {
    for (let i = 0; i < generators.length; i++) {
      for (let j = i + 1; j < generators.length; j++) {
        assert.equal(gcd(generators[i], generators[j]), 1, `${generators[i]},${generators[j]}`);
      }
    }
  }
});

test("commonProduct and complementaryFactors match the book's own worked example (2:3:5 -> 30, 15/10/6)", () => {
  assert.equal(commonProduct([2, 3, 5]), 30);
  assert.deepEqual(complementaryFactors([2, 3, 5]), [15, 10, 6]);
});

test("buildTheme(2,3,5) is the generators' own resultant: cycle length 30, durations 6,4,2,3,3,2,4,6", () => {
  const theme = buildTheme([2, 3, 5]);
  assert.equal(theme.cycleLength, 30);
  assert.deepEqual(theme.segments.map((s) => s.duration), [6, 4, 2, 3, 3, 2, 4, 6]);
  assert.equal(theme.segments.reduce((sum, s) => sum + s.duration, 0), 30);
});

test("buildCountertheme(2,3,5) is the complementary factors' resultant: same cycle length 30, 22 durations", () => {
  const countertheme = buildCountertheme([2, 3, 5]);
  assert.equal(countertheme.cycleLength, 30);
  assert.deepEqual(
    countertheme.segments.map((s) => s.duration),
    [2, 1, 1, 1, 1, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 1, 1, 2],
  );
  assert.equal(countertheme.segments.reduce((sum, s) => sum + s.duration, 0), 30);
});

test("theme and countertheme always share the same cycle length -- the common product -- for every case", () => {
  for (const { generators } of THREE_GENERATOR_CASES) {
    const product = commonProduct(generators);
    assert.equal(buildTheme(generators).cycleLength, product);
    assert.equal(buildCountertheme(generators).cycleLength, product);
  }
});

test("threeGeneratorGroupings(2,3,5) offers every divisor the book names: 2,3,5,6,10,15", () => {
  const groupings = threeGeneratorGroupings([2, 3, 5]);
  const byDivisor = Object.fromEntries(groupings.map((g) => [g.unitsPerBar, g.bars]));
  assert.deepEqual(byDivisor, { 2: 15, 3: 10, 5: 6, 15: 2, 10: 3, 6: 5 });
});

test("every grouping's bars * unitsPerBar equals the common product, for every case", () => {
  for (const { generators } of THREE_GENERATOR_CASES) {
    const product = commonProduct(generators);
    for (const grouping of threeGeneratorGroupings(generators)) {
      assert.equal(grouping.bars * grouping.unitsPerBar, product);
    }
  }
});
