import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BALINESE,
  PRIMITIVE,
  pitchUnitPermutations,
  toAxis,
  intervalPermutations,
  intervalTranspositions,
  modernizedScale,
  sigmaE1,
  sigmaOnAxis,
  cycleStep,
  cycleDegrees,
  cadences,
  strataRoots,
  stratifySigma,
  potentialAuxiliaries,
  melodizingFunctions,
} from "../src/core/pitchFamilies.ts";

const NAMES = ["c", "db", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const names = (ps) => ps.map((p) => NAMES[((p % 12) + 12) % 12]).join(" ");

test("Figure 1, stylized primitive: d0 = c d f; (1) d f c, f c d; (2) on one axis c eb bb, c g a", () => {
  const d = pitchUnitPermutations(PRIMITIVE);
  assert.deepEqual(d.map(names), ["c d f", "d f c", "f c d"]);
  assert.deepEqual(d.map((s) => names(toAxis(s))), ["c d f", "c eb bb", "c g a"]);
});

test("Figure 1 (3)-(4): interval permutation c eb f; intervals moved onto the units d e g, f g bb", () => {
  assert.deepEqual(intervalPermutations(PRIMITIVE).map(names), ["c d f", "c eb f"]);
  assert.deepEqual(intervalTranspositions(PRIMITIVE).map(names), ["c d f", "d e g", "f g bb"]);
});

test("Figure 1, modernized primitive: symmetry at the span c-f: c d f g bb c eb f ab; c eb bb → c eb bb db ab; c g a → c g a e f#", () => {
  assert.equal(names(modernizedScale(PRIMITIVE, 4)), "c d f g bb c eb f ab");
  assert.equal(names(modernizedScale([0, 3, 10], 2)), "c eb bb db ab");
  assert.equal(names(modernizedScale([0, 7, 9], 2)), "c g a e f#");
});

test("Figure 2: the Balinese E0 = c db eb g ab; Σ(E1) on I = c eb ab db g", () => {
  assert.equal(names(BALINESE), "c db eb g ab");
  assert.deepEqual(sigmaE1(BALINESE, 0), [60, 63, 68, 73, 79]);
  assert.equal(names(sigmaE1(BALINESE, 1)), "db g c eb ab");
  assert.equal(sigmaOnAxis(BALINESE).length, 5);
  assert.deepEqual(sigmaOnAxis(BALINESE)[0], [0, 3, 8, 13, 19]);
});

test("Figure 4: C1 = I IV II V III I, C2 = I II III IV V I, C3 = I V IV III II I; seven units give Book V's C3/C5/C7", () => {
  const roman = (ds) => ds.map((d) => ["I", "II", "III", "IV", "V", "VI", "VII"][d]).join(" ");
  assert.equal(roman(cycleDegrees(1, 5)), "I IV II V III I");
  assert.equal(roman(cycleDegrees(2, 5)), "I II III IV V I");
  assert.equal(roman(cycleDegrees(3, 5)), "I V IV III II I");
  assert.deepEqual([1, 2, 3].map((k) => cycleStep(k, 7)), [-2, -4, -6]);
});

test("Figure 4 cadences: C1 I IV I / I III I / I IV III I; C2 I II I / I V I / I II V I; C3 I V I / I II I / I V II I", () => {
  assert.deepEqual(cadences(1, 5), { initial: [0, 3, 0], final: [0, 2, 0], compound: [0, 3, 2, 0] });
  assert.deepEqual(cadences(2, 5), { initial: [0, 1, 0], final: [0, 4, 0], compound: [0, 1, 4, 0] });
  assert.deepEqual(cadences(3, 5), { initial: [0, 4, 0], final: [0, 1, 0], compound: [0, 4, 1, 0] });
});

test("Figure 10: strata of 1 + 2 + 2 (a; b, c; d, e), roots descending 3 + 5: c a e c# g# f c", () => {
  assert.deepEqual(stratifySigma(sigmaE1(BALINESE, 0), [1, 2, 2]), [[60], [63, 68], [73, 79]]);
  const roots = strataRoots([3, 5]);
  assert.equal(names(roots), "c a e db ab f c");
  assert.equal(roots.length, 7);
});

test("Figure 11: derivatives on c are c d f# g b, c e f a bb, c db f gb ab, c e f g b; the auxiliaries are d e f f# a bb b (the book omits a)", () => {
  const onAxis = pitchUnitPermutations(BALINESE).map((s) => toAxis(s));
  assert.deepEqual(onAxis.slice(1).map(names), ["c d f# g b", "c e f a bb", "c db f f# ab", "c e f g b"]);
  assert.equal(names(potentialAuxiliaries(BALINESE, onAxis)), "d e f f# a bb b");
});

test("Figure 12: interval permutations 2 4 1 1, 4 1 1 2, 1 1 2 4; auxiliaries d e f f#", () => {
  const perms = intervalPermutations(BALINESE);
  assert.deepEqual(perms.slice(1).map(names), ["c d f# g ab", "c e f f# ab", "c db d e ab"]);
  assert.equal(names(potentialAuxiliaries(BALINESE, perms)), "d e f f#");
});

test("Ch.3: harmony of three functions melodized with four", () => {
  assert.deepEqual(melodizingFunctions(3), ["a", "b", "c", "d"]);
  assert.deepEqual(melodizingFunctions(2), ["a", "b", "c"]);
});
