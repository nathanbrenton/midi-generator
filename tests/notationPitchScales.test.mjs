import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/core/notation/pitchScales.ts";
import { superscript, formatRoot } from "../src/core/notation/format.ts";

test("Ch.1: pitch-units p and pitch-intervals i of c-d-e-g-a (p.101)", () => {
  assert.deepEqual(P.p([2, 2, 3, 2]), [60, 62, 64, 67, 69]);
  assert.deepEqual(P.i([60, 62, 64, 67, 69]), [2, 2, 3, 2]);
  assert.equal(P.group([60, 61]).group, 1); // one root-tone, range within 11
});

test("Ch.2: scale counts and the tetrachord table (p.103-113)", () => {
  assert.equal(P.scaleCount(7), 462);
  assert.equal(P.FIRST_GROUP_TOTAL, 2048);
  assert.deepEqual(P.tetrachordScale("m1", "h"), [2, 1, 2, 2, 1, 3, 1]); // harmonic minor
  assert.equal(P.melodicForms([1, 2, 3]).length, 6);
});

test("Ch.3: 5 = 3+2 / 2+3 gives the resultant 2+1+2 (c-d-eb-f); 5 = 4+1 gives 1+3+1 (p.115)", () => {
  assert.deepEqual(P.resultantScale(3, 2), [2, 1, 2]);
  assert.deepEqual(P.resultantScale(4, 1), [1, 3, 1]);
});

test("Ch.3: the displacement scale d₁ of c-d-e-g-a's intervals (p.117)", () => {
  assert.deepEqual(P.d(0, [2, 2, 3, 2, 3]), [2, 2, 3, 2, 3]);
  assert.deepEqual(P.d(1, [2, 2, 3, 2, 3]), [2, 3, 2, 3, 2]);
  assert.equal(P.dLabel(1), "d₁");
});

test("Ch.4: the P.A. is the unit with the greatest summed duration, and N-unit scales offer N² axis-relations (p.125)", () => {
  const melody = [
    { midiNote: 69, durationUnits: 3 },
    { midiNote: 67, durationUnits: 1 },
    { midiNote: 69, durationUnits: 4 }, // a: 3 + 4 = 7 -- "unit a, whose durations sum up to 7, forms the P.A."
    { midiNote: 64, durationUnits: 2 },
  ];
  assert.deepEqual(P.PA(melody), { midiNote: 69, totalDuration: 7 });
  assert.equal(P.axisRelations(5), 25);
  assert.equal(P.axisRelations(7), 49);
  assert.deepEqual(P.AXIS_RELATIONS, ["U-U", "U-P", "P-U", "P-P"]);
});

test("Ch.5: E₁ of c-d-e-g-a ascends c-e-a-d-g; a 7-unit scale has N_E = 6 expansions (p.134)", () => {
  assert.deepEqual(P.E(1, [60, 62, 64, 67, 69]), [60, 64, 69, 74, 79]);
  assert.equal(P.ELabel(1), "E₁");
  assert.equal(P.NE(7), 6);
  assert.deepEqual(P.translate([60, 62], [60, 62, 64, 65, 67, 69, 71], 1), [60, 64]);
});

test("Ch.6: S = ⁿ√2 -- equal temperament's step is ¹²√2, the Javanese ⁵√2 (p.145)", () => {
  assert.ok(Math.abs(P.S(12) - 1.0594630943592953) < 1e-12);
  assert.ok(Math.abs(P.S(12) ** 12 - 2) < 1e-12);
  assert.ok(Math.abs(P.S(5) ** 5 - 2) < 1e-12);
  assert.equal(P.formatSystem(12), "¹²√2");
  assert.equal(P.formatSystem(2), "√2");
  assert.equal(P.formatSystem(3), "∛2");
  assert.equal(formatRoot(4), "∜2");
  assert.equal(superscript("12"), "¹²");
});

test("Ch.7: the two-tonic system C-F#, its 10 four-unit sectional scales and 576 melodic forms (p.149-152)", () => {
  assert.deepEqual(P.tonics(2), [60, 66]);
  assert.equal(P.gap(2), 6);
  assert.equal(P.sectionalScaleCount(6, 4), 10);
  assert.equal(P.melodicFormCount(4, 2), 576); // (4!)²
});

test("Ch.8: three tonics over two octaves, C-Ab-E (p.163)", () => {
  assert.deepEqual(P.fourthGroupTonics(3), [60, 68, 76]);
});
