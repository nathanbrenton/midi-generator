import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/core/notation/rhythm.ts";
import { subscript, underline, prime, formatSum, formatRepeat } from "../src/core/notation/format.ts";

test("format helpers print the book's own written forms", () => {
  assert.equal(subscript("3÷2"), "₃÷₂");
  assert.equal(underline("r"), "r̲");
  assert.equal(prime("r"), "r′");
  assert.equal(prime("T", 2), "T″");
  assert.equal(formatSum([2, 1, 1, 2]), "2+1+1+2");
  assert.equal(formatRepeat(2, 3), "2(3)");
  assert.equal(formatRepeat(2, [2, 3, 3]), "2(2+3+3)");
});

test("Ch.2: 3 ÷ 2 -- c.p. 6, complementary factors 2 and 3 written 2(3), 3(2), r₃÷₂ = 2+1+1+2 (p.7)", () => {
  assert.equal(R.formatInterference(3, 2), "3÷2");
  assert.equal(R.cp(3, 2), 6);
  assert.equal(R.cd, 1);
  assert.deepEqual(R.complementaryFactors(3, 2), [2, 3]);
  assert.deepEqual(R.generatorGroups(3, 2), ["2(3)", "3(2)"]);
  assert.deepEqual(R.r(3, 2), [2, 1, 1, 2]);
  assert.equal(R.rLabel(3, 2), "r₃÷₂");
});

test("Ch.2: r₄÷₃ = 3+1+2+2+1+3, the book's own example of inversion about the axis (p.10)", () => {
  assert.deepEqual(R.r(4, 3), [3, 1, 2, 2, 1, 3]);
});

test("Ch.2: T = r₍a÷1₎ -- a bar is a units of 1 (p.5)", () => {
  assert.deepEqual(R.T(3), [1, 1, 1]);
});

test("Ch.1: monomial periodicity a·t1 + ... + a·tn (p.3)", () => {
  assert.deepEqual(R.periodicity(3, 4), [3, 3, 3, 3]);
});

test("Ch.3: 3 ÷ 2 groups as ab/ab = T (one T of 6t), ab/a = bT (two T of 3t), ab/b = aT (three T of 2t) (p.12-13)", () => {
  assert.deepEqual(R.groupings(3, 2), [
    { formula: "ab/ab = T", T: 1, t: 6 },
    { formula: "ab/a = bT", T: 2, t: 3 },
    { formula: "ab/b = aT", T: 3, t: 2 },
  ]);
});

test("Ch.4: r̲₃÷₂ = 2+1+1+1+1+1+2 with N_b = 3 − 2 + 1 = 2 (p.15-16)", () => {
  assert.deepEqual(R.rFractioned(3, 2), [2, 1, 1, 1, 1, 1, 2]);
  assert.equal(R.rFractionedLabel(3, 2), "r̲₃÷₂");
  assert.equal(R.Nb(3, 2), 2);
  assert.equal(R.Nb(4, 3), 2);
});

test("Ch.4: grouping r̲₃÷₂ by b gives a²/b = 9/2 = 4½ -- two runs of r̲ to close, 2(4½) = 9 (p.17)", () => {
  const byB = R.fractionedGroupings(3, 2)[2];
  assert.equal(byB.formula, "a²/b = Q");
  assert.equal(byB.T, 4);
  assert.equal(byB.remainder, 1);
  assert.equal(byB.runs, 2);
});

test("Ch.5: B = r̲₃÷₂ + r₃÷₂ + 3(3−2) = [(2+1)+(1+1+1)+(1+2)] + [(2+1)+(1+2)+3] (p.21)", () => {
  assert.deepEqual(R.B(3, 2), [2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 2, 3]);
});

test("Ch.5: B₍a>mb₎ for 5 ÷ 2: m = 2, a² − mab = 25 − 20 = 5, total 2a² = 50 (p.22)", () => {
  assert.equal(R.m(5, 2), 2);
  const balance = R.B(5, 2);
  assert.equal(balance.reduce((s, d) => s + d, 0), 50);
  assert.equal(balance[balance.length - 1], 5);
});

test("Ch.5: E = r₃÷₂ + r̲₃÷₂ and C = r̲₄÷₃ + r₄÷₃, the book's own worked sums (p.23)", () => {
  assert.deepEqual(R.E(3, 2), [2, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2]);
  assert.deepEqual(R.C(4, 3), [3, 1, 2, 1, 1, 1, 1, 2, 1, 3, 3, 1, 2, 2, 1, 3]);
});

test("Ch.6: 2 ÷ 3 ÷ 5 -- c.p. 30, 15(2) 10(3) 6(5), r′ = 6+4+2+3+3+2+4+6 (p.25)", () => {
  assert.equal(R.cp(2, 3, 5), 30);
  assert.deepEqual(R.generatorGroups(2, 3, 5), ["15(2)", "10(3)", "6(5)"]);
  assert.deepEqual(R.rPrime(2, 3, 5), [6, 4, 2, 3, 3, 2, 4, 6]);
  assert.equal(R.r(2, 3, 5).length, 22);
  assert.equal(R.rPrimeLabel(2, 3, 5), "r′₂÷₃÷₅");
});

test("Ch.7: r̲₃÷₂'s 7 terms against 2 kettle-drum places -- drums appear 7 times, the resultant twice (p.27)", () => {
  const sync = R.instrumentalSync(7, 2);
  assert.equal(sync.instrumentRepeats, 7);
  assert.equal(sync.resultantRepeats, 2);
});

test("Ch.10: element names a₁ ... f₂, and a₂ = a₁ + b₁ (p.63-65)", () => {
  assert.equal(R.elementLabel(0, 1), "a₁");
  assert.equal(R.elementLabel(5, 2), "f₂");
  assert.deepEqual(R.higherOrder([[2], [1]], 2), [[2, 1], [1, 2]]);
});

test("Ch.12: (2+1)² = 4+2+2+1 distributively, synchronized as S = 2(2+1) + 1(2+1) = 6+3 (p.74-75)", () => {
  assert.deepEqual(R.distributivePower([2, 1], 2), [4, 2, 2, 1]);
  assert.deepEqual(R.S([2, 1]), [6, 3]);
});

test("Ch.13: iₙ = 2iₙ₋₁ − 1 gives 2, 3, 5, 9, 17; the determinant of 5 + 3 is 8 (p.84-85)", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(R.i), [2, 3, 5, 9, 17]);
  assert.equal(R.determinant(5, 3), 8);
});

test("Ch.14: rubato with τ = 1 turns Chopin's 2+2 into 3+1 (p.93)", () => {
  assert.deepEqual(R.rubato(2, 2, 1), [3, 1]);
});
