import { test } from "node:test";
import assert from "node:assert/strict";
import { contrapuntalVariationCount, partOrders, entrancePlan, soundingVoices } from "../src/core/contrapuntalVariations.ts";

test("variations of entering and dropping out: 12 (6 circular) for three parts, 48 (8) for four, 240 (10) for five (p.606-607)", () => {
  assert.deepEqual([3, 4, 5].map((n) => contrapuntalVariationCount(n)), [12, 48, 240]);
  assert.deepEqual([3, 4, 5].map((n) => contrapuntalVariationCount(n, true)), [6, 8, 10]);
  assert.equal(partOrders(["S", "A", "T"]).length, 6);
  assert.deepEqual(partOrders(["S", "A", "T"], true).map((o) => o.join("")), ["SAT", "ATS", "TSA"]);
});

test("Figure 368: S, A, T, B entering under A = 4a + 3a + 2a + 2a -- S4a + S3a + S2a + S2a; A3a + A2a + A2a; T2a + T2a; B2a (p.609)", () => {
  const plan = entrancePlan(["S", "A", "T", "B"], [4, 3, 2, 2]);
  assert.deepEqual(plan.map((p) => `${p.voice}:${p.attacks.join("+")}`), ["S:4+3+2+2", "A:3+2+2", "T:2+2", "B:2"]);
  assert.deepEqual(plan.map((p) => p.entersAt), [0, 4, 7, 9]);
  const sounding = soundingVoices(["S", "A", "T", "B"], [4, 3, 2, 2]);
  assert.equal(sounding.length, 11); // "Theme: Type I: 11 H"
  assert.deepEqual(sounding[0], ["S"]);
  assert.deepEqual(sounding[10], ["S", "A", "T", "B"]);
  assert.deepEqual(soundingVoices(["S", "A", "T", "B"], [4, 3, 2, 2], "drop")[10], ["S"]);
});
