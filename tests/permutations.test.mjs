import { test } from "node:test";
import assert from "node:assert/strict";
import { generalPermutations, circularPermutations } from "../src/core/permutations.ts";

function sorted(rows) {
  return rows.map((r) => r.join(",")).sort();
}

test("generalPermutations of 2 distinct elements gives exactly 2 rows (book's 'ab, ba' table, p.47)", () => {
  const rows = generalPermutations([2, 1]);
  assert.equal(rows.length, 2);
  assert.deepEqual(sorted(rows), sorted([[2, 1], [1, 2]]));
});

test("generalPermutations of a trinomial with one repeated value gives 3 rows, not 6 (book's 2+1+1 example, p.52)", () => {
  const rows = generalPermutations([2, 1, 1]);
  assert.equal(rows.length, 3);
  assert.deepEqual(sorted(rows), sorted([[2, 1, 1], [1, 2, 1], [1, 1, 2]]));
});

test("generalPermutations of a trinomial from r5+3 (3+3+2) gives 3 rows, matching the book exactly (p.52)", () => {
  const rows = generalPermutations([3, 3, 2]);
  assert.equal(rows.length, 3);
  assert.deepEqual(sorted(rows), sorted([[3, 3, 2], [3, 2, 3], [2, 3, 3]]));
});

test("generalPermutations of an all-distinct trinomial (3+1+2) gives all 6 rows (book's r14+3 example, p.52)", () => {
  const rows = generalPermutations([3, 1, 2]);
  assert.equal(rows.length, 6);
  assert.deepEqual(
    sorted(rows),
    sorted([
      [3, 1, 2],
      [3, 2, 1],
      [1, 3, 2],
      [1, 2, 3],
      [2, 3, 1],
      [2, 1, 3],
    ]),
  );
});

test("generalPermutations of an all-distinct quadrinomial (4+1+3+2) gives all 24 rows (book's Figure 109, p.54)", () => {
  const rows = generalPermutations([4, 1, 3, 2]);
  assert.equal(rows.length, 24);
  assert.equal(new Set(sorted(rows)).size, 24);
});

test("generalPermutations with two identical pairs (3+1+2+2) gives 12 rows, not 24 (book's Figure 109b, p.54)", () => {
  const rows = generalPermutations([3, 1, 2, 2]);
  assert.equal(rows.length, 12);
});

test("generalPermutations with two pairs identical (2+1+1+2) gives 6 rows (book's Figure 109c, p.54)", () => {
  const rows = generalPermutations([2, 1, 1, 2]);
  assert.equal(rows.length, 6);
  assert.deepEqual(
    sorted(rows),
    sorted([
      [2, 1, 1, 2],
      [1, 1, 2, 2],
      [1, 2, 2, 1],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
      [2, 2, 1, 1],
    ]),
  );
});

test("generalPermutations with three elements identical (3+1+1+1) gives 4 rows (book's Figure 109d, p.55)", () => {
  const rows = generalPermutations([3, 1, 1, 1]);
  assert.equal(rows.length, 4);
  assert.deepEqual(sorted(rows), sorted([[3, 1, 1, 1], [1, 1, 1, 3], [1, 1, 3, 1], [1, 3, 1, 1]]));
});

test("generalPermutations count always matches n! / product(repeated-value factorials)", () => {
  function factorial(n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
  }
  function expectedCount(values) {
    const counts = new Map();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    let denominator = 1;
    for (const count of counts.values()) denominator *= factorial(count);
    return factorial(values.length) / denominator;
  }
  for (const values of [[1, 2, 3, 4], [1, 1, 2, 2], [5, 5, 5], [1, 2], [1, 1, 1, 1, 2]]) {
    assert.equal(generalPermutations(values).length, expectedCount(values));
  }
});

test("generalPermutations never produces duplicate rows", () => {
  for (const values of [[2, 1, 1, 2], [3, 1, 1, 1], [4, 1, 3, 2]]) {
    const rows = generalPermutations(values);
    assert.equal(new Set(sorted(rows)).size, rows.length);
  }
});

test("circularPermutations always produces exactly n rows, each a rotation of the input", () => {
  const rows = circularPermutations([2, 1, 1]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows, [
    [2, 1, 1],
    [1, 1, 2],
    [1, 2, 1],
  ]);
});

test("circularPermutations of the book's three-elements-identical group (3+1+1+1) matches its 4-row continuity exactly (p.55)", () => {
  const rows = circularPermutations([3, 1, 1, 1]);
  assert.deepEqual(rows, [
    [3, 1, 1, 1],
    [1, 1, 1, 3],
    [1, 1, 3, 1],
    [1, 3, 1, 1],
  ]);
});

test("circularPermutations always has length equal to the input length, regardless of repeats", () => {
  for (const values of [[1, 2], [2, 1, 1], [4, 1, 3, 2], [5, 5, 5, 5, 5]]) {
    assert.equal(circularPermutations(values).length, values.length);
  }
});

test("every circular permutation's values sum to the same total as the original (rotation preserves the multiset)", () => {
  const values = [4, 1, 3, 2];
  const total = values.reduce((a, b) => a + b, 0);
  for (const row of circularPermutations(values)) {
    assert.equal(row.reduce((a, b) => a + b, 0), total);
  }
});
