import { test } from "node:test";
import assert from "node:assert/strict";
import {
  synchronizeAttackWithDuration,
  repeatsToCloseFinalDuration,
  coordinateTimeStructures,
} from "../src/core/timeStructureCoordination.ts";

test("Section A, First Case (aa=aT=4): no repeats needed, A=aT, T'=T (book Figure 58, p.36)", () => {
  const sync = synchronizeAttackWithDuration(4, 4, 6);
  assert.equal(sync.synchronizedAttacks, 4);
  assert.equal(sync.synchronizedDuration, 6);
});

test("Section A, Second Case (aa=5, aT=4, coprime): A=20, T'=30t (book Figure 59, p.37)", () => {
  const sync = synchronizeAttackWithDuration(5, 4, 6);
  assert.equal(sync.synchronizedAttacks, 20);
  assert.equal(sync.synchronizedDuration, 30);
});

test("Section A, Third Case (aa=6, aT=4, reducible to 3/2): A=12, T'=18t (book Figure 60, p.37)", () => {
  const sync = synchronizeAttackWithDuration(6, 4, 6);
  assert.equal(sync.synchronizedAttacks, 12);
  assert.equal(sync.synchronizedDuration, 18);
});

test("synchronizedAttacks always equals LCM(attackCount, durationAttackCount)", () => {
  function lcm(a, b) {
    function gcd(x, y) {
      return y === 0 ? x : gcd(y, x % y);
    }
    return (a * b) / gcd(a, b);
  }
  for (const [aa, aT] of [
    [4, 4],
    [5, 4],
    [6, 4],
    [7, 9],
    [3, 8],
  ]) {
    const sync = synchronizeAttackWithDuration(aa, aT, 10);
    assert.equal(sync.synchronizedAttacks, lcm(aa, aT));
  }
});

test("Section B, First Case (T'=T''=6t): closes after 1 repeat (book Figure 61, p.37)", () => {
  assert.equal(repeatsToCloseFinalDuration(6, 6), 1);
});

test("Section B, Second Case (T'=6t, T''=5t, coprime): closes after 6 repeats (book Figure 62, p.38)", () => {
  assert.equal(repeatsToCloseFinalDuration(6, 5), 6);
});

test("Section B, Third Case (T'=6t, T''=4t, reducible to 3/2): closes after 3 repeats (book Figure 63, p.38)", () => {
  assert.equal(repeatsToCloseFinalDuration(6, 4), 3);
});

test("Section C: the book's own full worked example (pli=4,pla=3,aa=8,aT=6,T=10t,T''=8t) reproduces every intermediate number exactly (Figure 66, p.39)", () => {
  const result = coordinateTimeStructures(4, 3, 8, 6, 10, 8);
  assert.equal(result.reducedInstrumentalPlaces, 4);
  assert.equal(result.synchronizedAttacks, 32);
  assert.deepEqual(result.synchronizedAttacksFraction, { numerator: 16, denominator: 3 });
  assert.deepEqual(result.synchronizedDuration, { numerator: 160, denominator: 3 });
  assert.deepEqual(result.finalRepeatsFraction, { numerator: 20, denominator: 3 });
  assert.equal(result.finalRepeats, 20);
  assert.equal(result.scaleFactor, 3);
});

test("Section C collapses to a whole-number result (scaleFactor 1) when everything already divides evenly", () => {
  const result = coordinateTimeStructures(2, 2, 4, 4, 6, 6);
  assert.equal(result.scaleFactor, 1);
  assert.equal(result.finalRepeats, result.finalRepeatsFraction.numerator);
});
