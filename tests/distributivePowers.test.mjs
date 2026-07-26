import { test } from "node:test";
import assert from "node:assert/strict";
import { distributivePower, synchronizeToPower } from "../src/core/distributivePowers.ts";

test("power 1 returns the terms unchanged", () => {
  assert.deepEqual(distributivePower([2, 1], 1), [2, 1]);
});

test("distributive square of the binomial (2,1) matches the book exactly: 4,2,2,1 (p.75)", () => {
  assert.deepEqual(distributivePower([2, 1], 2), [4, 2, 2, 1]);
});

test("distributive cube of the binomial (2,1) matches the book exactly: 8,4,4,2,4,2,2,1 (p.77)", () => {
  assert.deepEqual(distributivePower([2, 1], 3), [8, 4, 4, 2, 4, 2, 2, 1]);
});

test("a binomial's distributive square always has 4 terms (2^2=4), a trinomial's has 9 (3^2=9) -- book's own generalization", () => {
  assert.equal(distributivePower([2, 1], 2).length, 4);
  assert.equal(distributivePower([3, 2, 1], 2).length, 9);
});

test("a binomial's distributive cube always has 8 terms (2^3=8) -- book's own generalization", () => {
  assert.equal(distributivePower([2, 1], 3).length, 8);
});

test("distributive power always has terms.length ** power entries, generically", () => {
  for (const [terms, power] of [
    [[1, 2, 3], 3],
    [[5, 5], 4],
    [[1, 2, 3, 4], 2],
  ]) {
    assert.equal(distributivePower(terms, power).length, terms.length ** power);
  }
});

test("distributive power always sums to sum(terms) ** power, generically (book: trinomial square denominator = sum^2 = 16 for 2+1+1)", () => {
  assert.equal(
    distributivePower([2, 1, 1], 2).reduce((a, b) => a + b, 0),
    4 ** 2,
  );
  for (const [terms, power] of [
    [[2, 1], 3],
    [[3, 2, 1], 2],
    [[1, 1, 1, 1], 3],
  ]) {
    const sum = terms.reduce((a, b) => a + b, 0);
    assert.equal(
      distributivePower(terms, power).reduce((a, b) => a + b, 0),
      sum ** power,
    );
  }
});

test("synchronizing the first power (2,1) with its own square matches the book exactly: 3*(2+1)=6,3 (p.75)", () => {
  assert.deepEqual(synchronizeToPower([2, 1], 1, 2), [6, 3]);
});

test("synchronizing the first power (2,1) with its cube matches the book exactly: 9*(2+1)=18,9 (p.77)", () => {
  assert.deepEqual(synchronizeToPower([2, 1], 1, 3), [18, 9]);
});

test("synchronizing the square with the cube matches the book exactly: 3*(4+2+2+1)=12,6,6,3 (p.79-80)", () => {
  assert.deepEqual(synchronizeToPower([2, 1], 2, 3), [12, 6, 6, 3]);
});

test("synchronizeToPower(terms, k, k) is a no-op (scale factor 1)", () => {
  assert.deepEqual(synchronizeToPower([2, 1, 1], 2, 2), distributivePower([2, 1, 1], 2));
});

test("theme and countertheme always sum to the same total: sum(terms)^toPower, for any fromPower <= toPower", () => {
  const terms = [3, 1, 2];
  const sum = terms.reduce((a, b) => a + b, 0);
  for (const toPower of [2, 3]) {
    for (let fromPower = 1; fromPower <= toPower; fromPower++) {
      const total = synchronizeToPower(terms, fromPower, toPower).reduce((a, b) => a + b, 0);
      assert.equal(total, sum ** toPower);
    }
  }
});

test("throws for a non-positive power or toPower < fromPower", () => {
  assert.throws(() => distributivePower([1, 2], 0));
  assert.throws(() => synchronizeToPower([1, 2], 3, 1));
});
