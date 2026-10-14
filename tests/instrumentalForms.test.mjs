import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coefficientSplits,
  multinomial,
  distributions,
  attackFormCounts,
  splitSequences,
  secondOrderElements,
  arpeggiate,
  strataAllowed,
  outwardCouplings,
} from "../src/core/instrumentalForms.ts";

test("S = 2p: general forms 2, 6, 14, 30, 62, 126, 254, 4094 and circular n(n-1) for 2-8 and 12 attacks (p.890-894)", () => {
  const ns = [2, 3, 4, 5, 6, 7, 8, 12];
  assert.deepEqual(ns.map((n) => attackFormCounts(n, 2).general), [2, 6, 14, 30, 62, 126, 254, 4094]);
  assert.deepEqual(ns.map((n) => attackFormCounts(n, 2).circular), [2, 6, 12, 20, 30, 42, 56, 132]);
  // A = 12a: 24 + 132 + 440 + 990 + 1584 + 924
  assert.deepEqual(distributions(12, 2).map((d) => d.general), [24, 132, 440, 990, 1584, 924]);
});

test("S = 3p: 36, 150, 540, 1806 general and 12, 30, 60, 105 circular for 4-7 attacks (p.912-917)", () => {
  assert.deepEqual([4, 5, 6, 7].map((n) => attackFormCounts(n, 3).general), [36, 150, 540, 1806]);
  assert.deepEqual([4, 5, 6, 7].map((n) => attackFormCounts(n, 3).circular), [12, 30, 60, 105]);
  // A = 7a: 126 + 630 + 630 + 420, the book's four forms
  assert.deepEqual(new Set(distributions(7, 3).map((d) => d.general)), new Set([126, 630, 630, 420]));
});

test("S = 3p, 12 attacks: the book prints 443,312 -- two of its products are wrong (5544 x 6 and 13,860 x 6); the count is 519,156; circular 660 (p.928)", () => {
  assert.deepEqual(attackFormCounts(12, 3), { general: 519156, circular: 660 });
  const forms = Object.fromEntries(distributions(12, 3).map((d) => [d.form.join("+"), d.general]));
  assert.equal(forms["1+5+6"], 33264); // book: 32,264
  assert.equal(forms["2+4+6"], 83160); // book: 1386 x 6 = 8316
  assert.equal(multinomial([2, 4, 6]), 13860);
  assert.equal(forms["3+4+5"], 166320);
  assert.equal(forms["4+4+4"], 34650);
});

test("S = 4p: 8400 and 40,824 for 7 and 8 attacks; for 12, 14,676,024 and 1980 -- the book's summands, though it prints 14,646,024 and 1960 (p.951-977)", () => {
  assert.equal(attackFormCounts(7, 4).general, 8400);
  assert.equal(attackFormCounts(7, 4).circular, 140);
  assert.equal(attackFormCounts(8, 4).general, 40824);
  assert.equal(attackFormCounts(8, 4).circular, 280);
  assert.deepEqual(attackFormCounts(12, 4), { general: 14676024, circular: 1980 });
  const summands = [5280, 71280, 190080, 332640, 199584, 285120, 1330560, 1995840, 1330560, 1663200, 332640, 1995840, 1247400, 3326400, 369600];
  assert.equal(summands.reduce((a, b) => a + b), 14676024);
  assert.deepEqual(new Set(distributions(12, 4).map((d) => d.general)), new Set(summands));
});

test("A = 4a in S = 3p: 2a + b + c and its orders, 12 general or 4 circular each (Figure 19)", () => {
  assert.deepEqual(coefficientSplits(4, 3), [[1, 1, 2], [1, 2, 1], [2, 1, 1]]);
  assert.equal(splitSequences([2, 1, 1]).length, 12);
  assert.deepEqual(splitSequences([2, 1, 1], true), ["aabc", "abca", "bcaa", "caab"]);
});

test("elements of the second order: b/a, c/a, c/b (p.928); an arpeggio sounds them two at once", () => {
  assert.deepEqual(secondOrderElements(), ["b/a", "c/a", "c/b"]);
  const notes = arpeggiate([60, 64, 67], ["a", "b/a", "c"]);
  assert.deepEqual(notes.map((n) => n.midiNote), [60, 64, 60, 67]);
  assert.deepEqual(notes.map((n) => n.startUnits), [0, 0.5, 0.5, 1]);
});

test("strata: never an open position above a close; couplings outward (p.1006, 1010)", () => {
  assert.equal(strataAllowed(["close", "close"]), true);
  assert.equal(strataAllowed(["open", "open"]), true);
  assert.equal(strataAllowed(["open", "close"]), true);
  assert.equal(strataAllowed(["close", "open"]), false);
  assert.deepEqual(outwardCouplings(72, [12, 24], "melody"), [84, 96]);
  assert.deepEqual(outwardCouplings(36, [12], "bass"), [24]);
});
