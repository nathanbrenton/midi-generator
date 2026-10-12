import { test } from "node:test";
import assert from "node:assert/strict";
import {
  higherOrderElements,
  higherOrderElementCount,
  maxHigherOrder,
  combinationsBy,
  combinationCases,
} from "../src/core/higherOrderPermutations.ts";

test("order 1 returns the seeds unchanged", () => {
  const result = higherOrderElements([[2], [1]], 1);
  assert.deepEqual(result, [[2], [1]]);
});

test("order 2 matches the book's own formula exactly: a2=a1+b1, b2=b1+a1 (Figure 120, p.63)", () => {
  const result = higherOrderElements([[2], [1]], 2);
  assert.deepEqual(result, [
    [2, 1],
    [1, 2],
  ]);
});

test("order 3 matches the book's own formula exactly: a3=a2+b2, b3=b2+a2 (Figure 120, p.63)", () => {
  const result = higherOrderElements([[2], [1]], 3);
  assert.deepEqual(result, [
    [2, 1, 1, 2],
    [1, 2, 2, 1],
  ]);
});

test("order 4 continues the same recursion (a4=a3+b3, b4=b3+a3)", () => {
  const result = higherOrderElements([[2], [1]], 4);
  assert.deepEqual(result, [
    [2, 1, 1, 2, 1, 2, 2, 1],
    [1, 2, 2, 1, 2, 1, 1, 2],
  ]);
});

test("two elements stay two elements at every order (2! = 2) -- only their length grows", () => {
  for (let order = 1; order <= 5; order++) {
    assert.equal(higherOrderElements([[2], [1]], order).length, 2);
  }
});

test("each element's length doubles every order (for 2 seeds), matching 2^(order-1) times the seed length", () => {
  for (let order = 1; order <= 5; order++) {
    const result = higherOrderElements([[2], [1]], order);
    for (const element of result) {
      assert.equal(element.length, 2 ** (order - 1));
    }
  }
});

test("from order 2 onward, every element has the same total duration sum (each has absorbed all seeds' content by then)", () => {
  for (let order = 2; order <= 5; order++) {
    const result = higherOrderElements([[2], [1]], order);
    const sums = result.map((element) => element.reduce((a, b) => a + b, 0));
    assert.equal(sums[0], sums[1]);
  }
});

test("three elements: the second order is the book's own a2..f2, every permutation of a1, b1, c1, in its own naming order (p.65)", () => {
  const [a1, b1, c1] = [[1], [2], [3]];
  const result = higherOrderElements([a1, b1, c1], 2);
  assert.deepEqual(result, [
    [1, 2, 3], // a2 = a1 + b1 + c1
    [1, 3, 2], // b2 = a1 + c1 + b1
    [3, 1, 2], // c2 = c1 + a1 + b1
    [2, 1, 3], // d2 = b1 + a1 + c1
    [2, 3, 1], // e2 = b1 + c1 + a1
    [3, 2, 1], // f2 = c1 + b1 + a1
  ]);
});

test("element counts grow as n -> n!: 3 elements give 6 on the second order, 720 on the third (p.63)", () => {
  assert.equal(higherOrderElementCount(3, 1), 3);
  assert.equal(higherOrderElementCount(3, 2), 6);
  assert.equal(higherOrderElementCount(3, 3), 720);
  assert.equal(higherOrderElementCount(2, 9), 2); // two elements stay two forever
  assert.equal(higherOrderElements([[1], [2], [3]], 3).length, 720);
});

test("maxHigherOrder: unbounded for two seeds, order 3 for three (720 elements), and the guard refuses beyond it", () => {
  assert.equal(maxHigherOrder(2), Infinity);
  assert.equal(maxHigherOrder(3), 3);
  assert.throws(() => higherOrderElements([[1], [2], [3]], 4)); // 720! elements
});

test("combinationCases reproduces the book's own totals for six second-order elements (p.65-66)", () => {
  assert.deepEqual(combinationCases(6, 2), { combinations: 15, permutationsEach: 2, total: 30 });
  assert.deepEqual(combinationCases(6, 3), { combinations: 20, permutationsEach: 6, total: 120 });
  assert.deepEqual(combinationCases(6, 4), { combinations: 15, permutationsEach: 24, total: 360 });
  assert.deepEqual(combinationCases(6, 5), { combinations: 6, permutationsEach: 120, total: 720 });
  assert.deepEqual(combinationCases(6, 6), { combinations: 1, permutationsEach: 720, total: 720 });
});

test("combinationsBy lists combinations in the book's own order: a2+b2, a2+c2, ..., e2+f2 (p.65)", () => {
  const byTwo = combinationsBy(6, 2);
  assert.deepEqual(byTwo[0], [0, 1]); // a2 + b2
  assert.deepEqual(byTwo[4], [0, 5]); // a2 + f2
  assert.deepEqual(byTwo[5], [1, 2]); // b2 + c2
  assert.deepEqual(byTwo[14], [4, 5]); // e2 + f2
});

test("throws for fewer than two seeds or a non-positive order", () => {
  assert.throws(() => higherOrderElements([[1]], 2));
  assert.throws(() => higherOrderElements([[1], [2]], 0));
});
