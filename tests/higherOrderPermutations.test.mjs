import { test } from "node:test";
import assert from "node:assert/strict";
import { higherOrderElements } from "../src/core/higherOrderPermutations.ts";

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

test("the number of elements (voices) stays fixed across every order -- only their length grows", () => {
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

test("generalizes cleanly to three seeds: element i concatenates itself with element (i+1 mod 3) from the previous order", () => {
  const result = higherOrderElements([[1], [2], [3]], 2);
  assert.deepEqual(result, [
    [1, 2],
    [2, 3],
    [3, 1],
  ]);
});

test("three-seed case at order 3 continues the same rotation rule", () => {
  const result = higherOrderElements([[1], [2], [3]], 3);
  assert.deepEqual(result, [
    [1, 2, 2, 3],
    [2, 3, 3, 1],
    [3, 1, 1, 2],
  ]);
});

test("throws for fewer than two seeds or a non-positive order", () => {
  assert.throws(() => higherOrderElements([[1]], 2));
  assert.throws(() => higherOrderElements([[1], [2]], 0));
});
