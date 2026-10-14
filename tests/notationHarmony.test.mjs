import { test } from "node:test";
import assert from "node:assert/strict";
import * as H from "../src/core/notation/harmony.ts";

const names = (degrees) => degrees.map((d) => "cdefgab"[d]).join("-");

test("Ch.2: Cₙ as the book writes and notates it -- C₃ c-a-f-d-b-g-e, C₅ c-f-b-e-a-d-g, C₇ c-d-e-f-g-a-b (p.363)", () => {
  assert.equal(names(H.C(3)), "c-a-f-d-b-g-e");
  assert.equal(names(H.C(5)), "c-f-b-e-a-d-g");
  assert.equal(names(H.C(7)), "c-d-e-f-g-a-b");
  assert.equal(names(H.C(0, 4)), "g-g-g-g-g-g-g");
  assert.deepEqual([H.formatCycle(3), H.formatCycle(-5), H.formatCycle(0)], ["C₃", "C₋₅", "C₀"]);
  assert.deepEqual(["C5", "C-5", "C₋₇", "C0", "C4"].map(H.parseCycle), [5, -5, -7, 0, null]);
  assert.equal(H.cycleBetween(0, H.cycleStep(-3)), -3);
});

test("Ch.2: HS_E₀…HS_E₅ are C₃ C₅ C₇ and C₋₇ C₋₅ C₋₃ (p.362, 386)", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(H.HS_E), [3, 5, 7, -7, -5, -3]);
  assert.equal(H.formatHS(1), "HS_E₁");
});

test("Ch.2: binomial C₃ + C₅ and the negative form", () => {
  assert.equal(names(H.binomial(3, 5)), "c-a-d-b-e-c-f-d-g-e-a-f-b-g");
  assert.equal(H.negativeForm(3), -3);
  assert.equal(H.TRANSFORMATIONS.clockwise.mark, "↻");
  assert.equal(H.POSITIONS.open.length, 3);
});

test("Ch.3, Ch.4: structural and cycle groups read and written as the book prints them (p.391, 393)", () => {
  assert.deepEqual(H.parseStructuralGroup("3S1 + S3 + 2S2"), [[3, 1], [1, 3], [2, 2]]);
  assert.deepEqual(H.parseStructuralGroup("4S₃ + S₇ + 3S₄"), [[4, 3], [1, 7], [3, 4]]);
  assert.equal(H.formatStructuralGroup([[3, 1], [1, 3], [2, 2]]), "3S₁ + S₃ + 2S₂");
  assert.deepEqual(H.parseCycleGroup("2C7 + C3 + C5"), [[2, 7], [1, 3], [1, 5]]);
  assert.equal(H.formatCycleGroup([[2, 7], [1, 3], [1, 5]]), "2C₇ + C₃ + C₅");
  assert.equal(H.parseCycleGroup("2C4 + C3"), null);
  assert.equal(H.parseStructuralGroup("hello"), null);
});

test("Ch.5: Type III systems in root notation, with their cycles (p.396)", () => {
  const four = H.tonicSystem(4);
  assert.equal(four.notation, "∜2");
  assert.deepEqual(four.tonics, [0, 9, 6, 3]);
  assert.equal(H.tonicSystem(2).notation, "√2");
  assert.equal(H.TYPES.II, "diatonic-symmetric");
});

test("Ch.6-11: doublings, G₆, and the families written with the book's marks", () => {
  assert.equal(H.formatDoubling(5, 3), "S(5)③");
  assert.equal(H.G6_FORMULA, "G₆ = S(5) + S(6)③ + S(5)");
  assert.equal(H.formatG6(-5), "G₆(C₋₅)");
  assert.equal(H.formatFamily("minor seventh", 1), "7♭S₁");
  assert.equal(H.formatFamily("major seventh", 4), "7♮S₄");
  assert.equal(H.S7[3].name, "large");
  assert.deepEqual(H.S5[4].intervals, [3, 3]);
});

test("Ch.12, Ch.17: descending interval numbers and Hy = di3H + ch6H + sy3H", () => {
  assert.deepEqual([H.interval(0, 7), H.interval(0, 11), H.interval(0, 3)], [5, 1, 9]);
  assert.equal(H.HY.formula, "Hy = di3H + ch6H + sy3H");
});
