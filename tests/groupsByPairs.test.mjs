import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExpansion, buildContraction, buildBalance, computePairGrouping } from "../src/core/groupsByPairs.ts";
import { generateResultant } from "../src/core/resultant.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";

function durations(resultant) {
  return resultant.segments.map((s) => s.duration);
}

// Confirmed against the book's own worked examples (Figures 38-46): Expansion
// is the plain resultant then the fractioned one (short to long); Contraction
// is the same two pieces in reverse (long to short); Balance is the
// fractioned resultant, then the plain resultant repeated m = floor(a/b)
// times, then one sustained note of a^2 - m*a*b. generateResultant and
// generateFractionedResultant are independently verified elsewhere against
// the book and Resultants_Numbers.txt, so building expected arrays from them
// here tests the composition itself, not the underlying resultant math.

test("expansion concatenates plain then fractioned, for 3:2 and 4:3 (Figures 42-43)", () => {
  for (const [a, b] of [[3, 2], [4, 3]]) {
    const expected = [...durations(generateResultant([a, b])), ...durations(generateFractionedResultant(a, b))];
    const result = buildExpansion(a, b);
    assert.deepEqual(durations(result), expected, `${a}:${b}`);
    assert.equal(result.cycleLength, a * b + a * a, `${a}:${b}`);
  }
});

test("contraction concatenates fractioned then plain — expansion in reverse order (Figures 45-46)", () => {
  for (const [a, b] of [[3, 2], [4, 3]]) {
    const expected = [...durations(generateFractionedResultant(a, b)), ...durations(generateResultant([a, b]))];
    const result = buildContraction(a, b);
    assert.deepEqual(durations(result), expected, `${a}:${b}`);
    assert.equal(result.cycleLength, buildExpansion(a, b).cycleLength, `${a}:${b}`);
  }
});

test("balance of 3:2: fractioned + one plain + a sustained tail of a(a-b) (Figure 38)", () => {
  const fractioned = durations(generateFractionedResultant(3, 2));
  const plain = durations(generateResultant([3, 2]));
  const result = buildBalance(3, 2);
  assert.deepEqual(durations(result), [...fractioned, ...plain, 3]); // m=1, tail=3(3-2)=3
  assert.equal(result.cycleLength, 18); // 2*a^2
});

test("balance of 4:3: fractioned + one plain + a sustained tail of a(a-b) (Figure 39)", () => {
  const fractioned = durations(generateFractionedResultant(4, 3));
  const plain = durations(generateResultant([4, 3]));
  const result = buildBalance(4, 3);
  assert.deepEqual(durations(result), [...fractioned, ...plain, 4]); // m=1, tail=4(4-3)=4
  assert.equal(result.cycleLength, 32); // 2*a^2
});

test("balance of 5:2 uses m=2 plain repetitions and the (a^2-mab) tail (Figures 40-41)", () => {
  const fractioned = durations(generateFractionedResultant(5, 2));
  const plain = durations(generateResultant([5, 2]));
  const result = buildBalance(5, 2);
  assert.deepEqual(durations(result), [...fractioned, ...plain, ...plain, 5]); // m=2, tail=25-2*5*2=5
  assert.equal(result.cycleLength, 50); // 2*a^2
});

test("computePairGrouping divides every pair technique's total exactly by a, with no remainder", () => {
  for (const [a, b] of [[3, 2], [4, 3], [5, 2], [7, 5], [9, 8]]) {
    assert.equal(computePairGrouping(a, buildExpansion(a, b).cycleLength).bars % 1, 0, `expansion ${a}:${b}`);
    assert.equal(computePairGrouping(a, buildContraction(a, b).cycleLength).bars % 1, 0, `contraction ${a}:${b}`);
    assert.equal(computePairGrouping(a, buildBalance(a, b).cycleLength).bars % 1, 0, `balance ${a}:${b}`);
  }
});

test("balance always totals exactly 2 * a^2, for every canonical case", () => {
  const cases = [
    [3, 2], [4, 3], [5, 2], [5, 3], [5, 4], [6, 5], [7, 2], [7, 3], [7, 4],
    [7, 5], [7, 6], [8, 3], [8, 5], [8, 7], [9, 2], [9, 4], [9, 5], [9, 7], [9, 8],
  ];
  for (const [a, b] of cases) {
    const result = buildBalance(a, b);
    assert.equal(result.cycleLength, 2 * a * a, `${a}:${b}`);
    const total = result.segments.reduce((sum, s) => sum + s.duration, 0);
    assert.equal(total, 2 * a * a, `${a}:${b}`);
  }
});
