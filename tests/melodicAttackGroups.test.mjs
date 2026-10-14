import { test } from "node:test";
import assert from "node:assert/strict";
import {
  binomialContrast,
  permuteBinomials,
  secondOrderBinomial,
  balancedAttackDurations,
  chordDurations,
  squareSynchronization,
} from "../src/core/melodicAttackGroups.ts";
import { generateResultant } from "../src/core/resultant.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";
import { distributivePower } from "../src/core/distributivePowers.ts";

const r = (a, b) => generateResultant([a, b]).segments.map((s) => s.duration);
const rf = (a, b) => generateFractionedResultant(a, b).segments.map((s) => s.duration);

test("polynomial attack-groups from resultants: r4÷3, r̲3÷2, r9÷8 (p.643, Figure 17)", () => {
  assert.deepEqual(r(4, 3), [3, 1, 2, 2, 1, 3]);
  assert.deepEqual(rf(3, 2), [2, 1, 1, 1, 1, 1, 2]);
  assert.deepEqual(r(9, 8), [8, 1, 7, 2, 6, 3, 5, 4, 4, 5, 3, 6, 2, 7, 1, 8]);
});

test("permuting the binomials of r9÷8 puts the least animation at the ends: a + 8a + 2a + 7a ... + 8a + a (p.643)", () => {
  assert.deepEqual(permuteBinomials(r(9, 8)), [1, 8, 2, 7, 3, 6, 4, 5, 5, 4, 6, 3, 7, 2, 8, 1]);
  assert.deepEqual(secondOrderBinomial(4, 2, 4), [4, 2, 2, 4]);
});

test("involution groups: (2 + 1)² = 4a + 2a + 2a + a, (1 + 3)² = a + 3a + 3a + 9a (p.643)", () => {
  assert.deepEqual(distributivePower([2, 1], 2), [4, 2, 2, 1]);
  assert.deepEqual(distributivePower([1, 3], 2), [1, 3, 3, 9]);
});

test("contrast falls as the terms approach equality: a + 6a > 2a + 6a > 3a + 6a > 5a + 6a > 6a + 6a (p.642)", () => {
  const order = [[1, 6], [2, 6], [3, 6], [5, 6], [6, 6]].map(([a, b]) => binomialContrast(a, b));
  for (let i = 1; i < order.length; i++) assert.ok(order[i] < order[i - 1]);
  assert.equal(order[4], 0);
});

test("Figures 21-22: series 6 and 8 over the attack group a + 2a + 3a + 5a + 3a + 2a + a (p.648)", () => {
  assert.deepEqual(balancedAttackDurations(6, [5, 1], [4, 1, 1], [1, 1, 2, 1, 1]), [[6], [5, 1], [4, 1, 1], [1, 1, 2, 1, 1], [1, 1, 4], [1, 5], [6]]);
  const eight = balancedAttackDurations(8, [5, 3], [3, 3, 2], [2, 1, 2, 1, 2]);
  assert.deepEqual(eight, [[8], [5, 3], [3, 3, 2], [2, 1, 2, 1, 2], [2, 3, 3], [3, 5], [8]]);
  assert.deepEqual(eight.map((g) => g.length), [1, 2, 3, 5, 3, 2, 1]);
  assert.ok(eight.every((g) => g.reduce((a, b) => a + b) === 8));
});

test("Figure 23: attacks r5÷4 per chord against durations r̲4÷3 -- chords of 7t, t, 4t, 4t, 4t, 4t, t, 7t; 32t, four bars of 8t (p.649)", () => {
  assert.deepEqual(rf(4, 3), [3, 1, 2, 1, 1, 1, 1, 2, 1, 3]);
  const { perAttack, perChord } = chordDurations(r(5, 4), rf(4, 3));
  assert.deepEqual(perAttack[0], [3, 1, 2, 1]);
  assert.deepEqual(perChord, [7, 1, 4, 4, 4, 4, 1, 7]);
  assert.equal(perChord.reduce((a, b) => a + b), 32);
});

test("Figure 24: (3 + 1 + 2 + 2)² against 8(3 + 1 + 2 + 2) = 24t + 8t + 16t + 16t (p.650)", () => {
  const { melody, harmony } = squareSynchronization([3, 1, 2, 2]);
  assert.deepEqual(melody, [[9, 3, 6, 6], [3, 1, 2, 2], [6, 2, 4, 4], [6, 2, 4, 4]]);
  assert.deepEqual(harmony, [24, 8, 16, 16]);
});

test("Figure 25: (2 + 1 + 1)³ against 4(2 + 1 + 1)² -- 9 chords, 27 attacks, 3 to a chord (p.651)", async () => {
  const { powerSynchronization } = await import("../src/core/melodicAttackGroups.ts");
  const { melody, harmony } = powerSynchronization([2, 1, 1], 3);
  assert.equal(harmony.length, 9);
  assert.equal(melody.flat().length, 27);
  assert.deepEqual(melody[0], [8, 4, 4]);
  assert.deepEqual(harmony, distributivePower([2, 1, 1], 2).map((x) => 4 * x)); // 16t + 8t + 8t + ...
});

test("coefficients of duration: M = r̲4÷3 twice over H = 6 + 2 + 4 + 2 + 2 + 2 + 2 + 4 + 2 + 6 (p.652)", () => {
  const h = rf(4, 3).map((x) => 2 * x);
  assert.deepEqual(h, [6, 2, 4, 2, 2, 2, 2, 4, 2, 6]);
  assert.equal(h.reduce((a, b) => a + b), 2 * rf(4, 3).reduce((a, b) => a + b));
});
