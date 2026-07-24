import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTimeSignatureOptions } from "../src/core/timeSignature.ts";

test("denominator 16 is never offered", () => {
  for (const [a, b] of [[3, 2], [4, 3], [9, 8]]) {
    const options = computeTimeSignatureOptions({ technique: "plain", a, b, cycleLength: a * b });
    assert.ok(options.every((o) => o.denominator !== 16));
    assert.ok(options.every((o) => [2, 4, 8].includes(o.denominator)));
  }
});

test("every numerator (beatsPerBar) stays within 2-15", () => {
  const cases = [
    { technique: "plain", a: 9, b: 8, cycleLength: 72 },
    { technique: "fractioned", a: 9, b: 2, cycleLength: 81 },
    { technique: "balance", a: 5, b: 2, cycleLength: 50 },
  ];
  for (const params of cases) {
    for (const option of computeTimeSignatureOptions(params)) {
      assert.ok(option.beatsPerBar >= 2 && option.beatsPerBar <= 15, `${option.label} out of range`);
    }
  }
});

test("every option's bars * beatsPerBar * unitsPerBeat reconstructs the cycle length exactly", () => {
  const options = computeTimeSignatureOptions({ technique: "plain", a: 9, b: 8, cycleLength: 72 });
  for (const option of options) {
    assert.equal(option.bars * option.beatsPerBar * option.unitsPerBeat, 72);
  }
});

test("balance of 5:2 offers 2 x 5/4 among its by-a readings, matching the user's own '10/4 breaks into 2x5/4' example", () => {
  const options = computeTimeSignatureOptions({ technique: "balance", a: 5, b: 2, cycleLength: 50 });
  const byA = options.filter((o) => o.unitsPerBeat === 5 && o.denominator === 4);
  assert.deepEqual(
    byA.map((o) => o.label).sort(),
    ["10/4", "2 × 5/4", "5 × 2/4"].sort(),
  );
});

test("expansion of 7:5 offers 3x4/4 and 4x3/4, matching the user's own '12/4 breaks into 3x4/4 or 4x3/4' example", () => {
  const options = computeTimeSignatureOptions({ technique: "expansion", a: 7, b: 5, cycleLength: 7 * (7 + 5) });
  const labels = options.map((o) => o.label);
  assert.ok(labels.includes("3 × 4/4"));
  assert.ok(labels.includes("4 × 3/4"));
  assert.ok(labels.includes("12/4")); // the un-broken-down single-bar reading is still offered too
});

test("cut time (2/2) is offered wherever a 4/4-shaped reading exists", () => {
  const options = computeTimeSignatureOptions({ technique: "plain", a: 4, b: 3, cycleLength: 12 });
  assert.ok(options.some((o) => o.label === "4/4"));
  assert.ok(options.some((o) => o.label === "2/2"));
});

test("no cut time is offered when no 4/4-shaped reading exists", () => {
  const options = computeTimeSignatureOptions({ technique: "plain", a: 3, b: 2, cycleLength: 6 });
  assert.ok(!options.some((o) => o.denominator === 2));
});

test("4:3 plain's raw view breaks 12 units into every valid factor pair (2-15), including the trivial 12/8", () => {
  const options = computeTimeSignatureOptions({ technique: "plain", a: 4, b: 3, cycleLength: 12 });
  const raw = options.filter((o) => o.unitsPerBeat === 1);
  assert.deepEqual(
    raw.map((o) => o.label).sort(),
    ["12/8", "2 × 6/8", "3 × 4/8", "4 × 3/8", "6 × 2/8"].sort(),
  );
});

test("no duplicate options even when different unitsPerBeat sources coincide", () => {
  const options = computeTimeSignatureOptions({ technique: "plain", a: 4, b: 3, cycleLength: 12 });
  const keys = options.map((o) => `${o.bars}x${o.beatsPerBar}/${o.denominator}`);
  assert.equal(keys.length, new Set(keys).size);
});

test("fractioned technique does not offer a by-b reading", () => {
  const options = computeTimeSignatureOptions({ technique: "fractioned", a: 4, b: 3, cycleLength: 16 });
  assert.ok(!options.some((o) => o.unitsPerBeat === 3));
});
