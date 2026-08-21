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
  assert.deepEqual(traceOrigin(5, 3), { a: 8, b: 5, reducedX: 5, reducedY: 3 });
});

test("traceOrigin's {a,b} origin is order-independent -- (3,5) traces to the same origin as (5,3)", () => {
  const { a: a1, b: b1 } = traceOrigin(3, 5);
  const { a: a2, b: b2 } = traceOrigin(5, 3);
  assert.equal(a1, a2);
  assert.equal(b1, b2);
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

test("traceOrigin reduces a non-coprime fragment by its gcd before tracing -- (4,2) traces the same origin as (2,1)", () => {
  const fromScaled = traceOrigin(4, 2);
  const fromReduced = traceOrigin(2, 1);
  assert.equal(fromScaled.a, fromReduced.a);
  assert.equal(fromScaled.b, fromReduced.b);
  assert.equal(fromScaled.reducedX, 2);
  assert.equal(fromScaled.reducedY, 1);
});

test("regression: a non-coprime fragment's traced resultant actually opens with the REDUCED fragment, not the original -- this was silently wrong before reduction was added", () => {
  const { a, b, reducedX, reducedY } = traceOrigin(4, 2);
  const resultant = generateResultant([a, b]);
  const [first, second] = resultant.segments;
  // The resultant does NOT open with the original (4,2) -- only with the reduced (2,1).
  assert.notEqual(first.duration, 4);
  assert.equal(first.duration, Math.max(reducedX, reducedY));
  assert.equal(second.duration, Math.min(reducedX, reducedY));
});

test("traceOrigin leaves already-coprime fragments unreduced (reducedX/reducedY equal the input)", () => {
  const { reducedX, reducedY } = traceOrigin(5, 3);
  assert.equal(reducedX, 5);
  assert.equal(reducedY, 3);
});
