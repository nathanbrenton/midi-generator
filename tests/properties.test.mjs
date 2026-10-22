// General statements of the book checked over whole ranges rather than single worked examples.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateResultant } from "../src/core/resultant.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";
import { alternatingSigns, rotatePhase } from "../src/core/generalHarmony.ts";
import { attackFormCounts, distributions } from "../src/core/instrumentalForms.ts";
import { compositionCount, generateCompositions } from "../src/core/symmetricScales.ts";
import { diatonicCycle } from "../src/core/diatonicHarmony.ts";
import { reciprocatingBinomials } from "../src/core/composition.ts";
import { distinctPermutationCount, generalPermutations } from "../src/core/permutations.ts";

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const durations = (r) => r.segments.map((s) => s.duration);

test("Book XI Ch.15 (p.1237): every even-length resultant with alternating signs sums to zero, so its phasic rotation returns to φ0", () => {
  for (let a = 2; a <= 12; a++) {
    for (let b = 1; b < a; b++) {
      if (gcd(a, b) !== 1) continue;
      for (const r of [durations(generateResultant([a, b])), durations(generateFractionedResultant(a, b))]) {
        if (r.length % 2) continue;
        const signed = alternatingSigns(r);
        assert.equal(signed.reduce((x, y) => x + y, 0), 0, `r${a}÷${b}: ${r.join("+")}`);
        assert.equal(rotatePhase(0, signed, a * b), 0);
      }
    }
  }
});

test("Book XI Ch.5: a resultant of generators a unit apart always pairs into reciprocating binomials", () => {
  for (let n = 3; n <= 16; n++) assert.ok(reciprocatingBinomials(durations(generateResultant([n, n - 1]))).reciprocating, `r${n}÷${n - 1}`);
});

test("Book VIII: for 2-12 attacks over 2-4 parts the table's forms add up to the surjection and circular totals", () => {
  for (let parts = 2; parts <= 4; parts++) {
    for (let A = parts; A <= 12; A++) {
      const rows = distributions(A, parts);
      const counts = attackFormCounts(A, parts);
      assert.equal(rows.reduce((s, r) => s + r.general, 0), counts.general, `A=${A}, ${parts} parts general`);
      assert.equal(rows.reduce((s, r) => s + r.circular, 0), counts.circular, `A=${A}, ${parts} parts circular`);
    }
  }
});

test("Book II Ch.7: the number of ways to fill a gap with sectional-scale units is the compositions count", () => {
  for (let gap = 2; gap <= 12; gap++) {
    for (let units = 1; units <= gap; units++) {
      assert.equal(generateCompositions(gap, units).length, compositionCount(gap, units), `gap ${gap}, ${units} units`);
    }
  }
});

test("Book V Ch.1: every diatonic cycle, positive or negative, passes through all seven degrees once", () => {
  for (const c of [3, 5, 7, -3, -5, -7]) assert.equal(new Set(diatonicCycle(c)).size, 7, `C${c}`);
});

test("Book I Ch.9: general permutations are exactly the distinct orders, n! over the repeats' factorials", () => {
  for (const values of [[3, 1], [2, 1, 1], [3, 1, 2, 2], [1, 1, 1, 2, 2], [4, 3, 2, 1, 1]]) {
    const rows = generalPermutations(values);
    assert.equal(rows.length, distinctPermutationCount(values));
    assert.equal(new Set(rows.map((r) => r.join())).size, rows.length);
  }
});
