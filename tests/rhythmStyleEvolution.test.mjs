import { test } from "node:test";
import assert from "node:assert/strict";
import { interferenceGroupSizes, traceOrigin } from "../src/core/rhythmStyleEvolution.ts";
import { generateResultant } from "../src/core/resultant.ts";

test("interferenceGroupSizes matches the book's own five terms exactly: 2,3,5,9,17 (p.84)", () => {
  assert.deepEqual(interferenceGroupSizes(5), [2, 3, 5, 9, 17]);
});

test("interferenceGroupSizes(1) is just the seed value 2", () => {
  assert.deepEqual(interferenceGroupSizes(1), [2]);
});

test("every term after the first equals 2 * previous - 1, generically", () => {
  const sizes = interferenceGroupSizes(8);
  for (let i = 1; i < sizes.length; i++) {
    assert.equal(sizes[i], 2 * sizes[i - 1] - 1);
  }
});

test("traceOrigin(5,3) matches the book's own worked example exactly: a=8, b=5 (p.84-85)", () => {
  assert.deepEqual(traceOrigin(5, 3), { a: 8, b: 5 });
});

test("traceOrigin is order-independent -- (3,5) traces to the same origin as (5,3)", () => {
  assert.deepEqual(traceOrigin(3, 5), traceOrigin(5, 3));
});

test("traceOrigin(5,3)'s resultant r(8,5) really does open with segments 5,3, confirmed via the actual resultant engine", () => {
  const { a, b } = traceOrigin(5, 3);
  const resultant = generateResultant([a, b]);
  assert.equal(resultant.segments[0].duration, 5);
  assert.equal(resultant.segments[1].duration, 3);
});

test("traceOrigin round-trips correctly for many coprime binomials, confirmed via generateResultant generically", () => {
  for (const [x, y] of [
    [1, 2],
    [2, 3],
    [3, 4],
    [1, 4],
    [5, 2],
    [7, 3],
  ]) {
    const { a, b } = traceOrigin(x, y);
    const resultant = generateResultant([a, b]);
    const [first, second] = resultant.segments;
    assert.equal(first.duration, Math.max(x, y));
    assert.equal(second.duration, Math.min(x, y));
  }
});

test("traceOrigin throws for non-positive or non-integer inputs", () => {
  assert.throws(() => traceOrigin(0, 3));
  assert.throws(() => traceOrigin(2.5, 3));
});
