import { test } from "node:test";
import assert from "node:assert/strict";
import {
  firstGroupScaleCount,
  FIRST_GROUP_TOTAL,
  firstGroupScales,
  melodicForms,
  TETRACHORDS,
  tetrachordScale,
  SEVEN_UNIT_TABLE,
} from "../src/core/firstGroupScales.ts";

test("firstGroupScaleCount matches every count the book states (p.103-111)", () => {
  assert.equal(firstGroupScaleCount(1), 1); // "the number of scales: one"
  assert.equal(firstGroupScaleCount(2), 11); // "eleven"
  assert.equal(firstGroupScaleCount(3), 55);
  assert.equal(firstGroupScaleCount(4), 165);
  assert.equal(firstGroupScaleCount(7), 462); // "there are 462 seven unit scales"
});

test("the whole First Group totals 2,048 scales, the sum over every unit count (p.111)", () => {
  assert.equal(FIRST_GROUP_TOTAL, 2048);
  let sum = 0;
  for (let units = 1; units <= 12; units++) sum += firstGroupScaleCount(units);
  assert.equal(sum, 2048);
});

test("firstGroupScales enumerates exactly the book's tables: 11 two-unit intervals c-db .. c-b, 55 three-unit pairs", () => {
  assert.deepEqual(firstGroupScales(2), [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11]]);
  const three = firstGroupScales(3);
  assert.equal(three.length, 55);
  assert.ok(three.every(([x, y]) => x + y <= 11)); // range limit 11
  assert.ok(three.some(([x, y]) => x === 1 && y === 10)); // the table's last entry, 1+10
});

test("melodicForms of a three-unit scale are the book's six forms in its own order: a1+b1+c1, a1+c1+b1, c1+a1+b1, ... (p.106)", () => {
  assert.deepEqual(melodicForms(["a", "b", "c"]), [
    ["a", "b", "c"],
    ["a", "c", "b"],
    ["c", "a", "b"],
    ["b", "a", "c"],
    ["b", "c", "a"],
    ["c", "b", "a"],
  ]);
  assert.deepEqual(melodicForms(["a", "b"]), [["a", "b"], ["b", "a"]]); // two-unit: a1+b1, b1+a1
});

test("the four tetrachords each span a perfect fourth (p.112)", () => {
  assert.deepEqual(TETRACHORDS.M, [2, 2, 1]);
  assert.deepEqual(TETRACHORDS.m1, [2, 1, 2]);
  assert.deepEqual(TETRACHORDS.m2, [1, 2, 2]);
  assert.deepEqual(TETRACHORDS.h, [1, 3, 1]);
  for (const t of Object.values(TETRACHORDS)) assert.equal(t.reduce((s, x) => s + x, 0), 5);
});

test("the Table of Scales builds the six familiar scales, each spanning the octave (p.113)", () => {
  const byName = Object.fromEntries(SEVEN_UNIT_TABLE.map((s) => [`${s.form} ${s.family}`, tetrachordScale(s.lower, s.upper)]));
  assert.deepEqual(byName["natural major"], [2, 2, 1, 2, 2, 2, 1]);
  assert.deepEqual(byName["harmonic major"], [2, 2, 1, 2, 1, 3, 1]);
  assert.deepEqual(byName["melodic major"], [2, 2, 1, 2, 1, 2, 2]);
  assert.deepEqual(byName["natural minor"], [2, 1, 2, 2, 1, 2, 2]);
  assert.deepEqual(byName["harmonic minor"], [2, 1, 2, 2, 1, 3, 1]);
  assert.deepEqual(byName["melodic minor"], [2, 1, 2, 2, 2, 2, 1]);
  for (const scale of Object.values(byName)) assert.equal(scale.reduce((s, x) => s + x, 0), 12);
});
