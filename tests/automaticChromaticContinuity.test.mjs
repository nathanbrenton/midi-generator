import { test } from "node:test";
import assert from "node:assert/strict";
import {
  voiceOrders,
  automaticChromaticContinuity,
  automaticContinuityFormCount,
  VOICES,
} from "../src/core/automaticChromaticContinuity.ts";

test("voiceOrders: exactly the 6 orderings the book lists by name (p.545): SAT, STA, TSA, AST, ATS, TAS", () => {
  const orders = voiceOrders().map((o) => o.join(""));
  assert.equal(orders.length, 6);
  for (const label of ["SAT", "STA", "TSA", "AST", "ATS", "TAS"]) {
    assert.ok(orders.includes(label), `missing order ${label}`);
  }
});

test("automaticChromaticContinuity produces exactly 36 chords (p.545: \"3 x 12 = 36\")", () => {
  const steps = automaticChromaticContinuity(1, ["S", "A", "T"], "down", 60);
  assert.equal(steps.length, 36);
});

test("chord 37 (one past the 36th) coincides with chord 1, up to octave -- \"closes at 36+1\" (p.545)", () => {
  const steps = automaticChromaticContinuity(1, ["S", "A", "T"], "down", 60);
  const unalteredBase = { S: 60 + 4 + 3, A: 60 + 4, T: 60 }; // the true starting chord, before any modification
  const last = steps[steps.length - 1]; // group 11, modification 3 -- the whole chord transposed by 12 semitones
  for (const voice of VOICES) {
    assert.equal(last.pitches[voice], unalteredBase[voice] - 12);
  }
});

test("within a group, modification 1 alters only the first voice in the order; modification 2 alters the first two; modification 3 alters all three", () => {
  const steps = automaticChromaticContinuity(1, ["S", "A", "T"], "down", 60);
  const [mod1, mod2, mod3] = steps.slice(0, 3); // group 0
  const base = { S: 60 + 4 + 3, A: 60 + 4, T: 60 };

  assert.equal(mod1.pitches.S, base.S - 1);
  assert.equal(mod1.pitches.A, base.A);
  assert.equal(mod1.pitches.T, base.T);

  assert.equal(mod2.pitches.S, base.S - 1);
  assert.equal(mod2.pitches.A, base.A - 1);
  assert.equal(mod2.pitches.T, base.T);

  assert.equal(mod3.pitches.S, base.S - 1);
  assert.equal(mod3.pitches.A, base.A - 1);
  assert.equal(mod3.pitches.T, base.T - 1);
});

test("each successive group starts one semitone further in the chosen direction than the last (p.545)", () => {
  const steps = automaticChromaticContinuity(1, ["S", "A", "T"], "down", 60);
  const group0mod1 = steps[0];
  const group1mod1 = steps[3];
  assert.equal(group1mod1.pitches.T, group0mod1.pitches.T - 1);
});

test("automaticContinuityFormCount matches the book's own stated total exactly: 48 (p.545)", () => {
  assert.equal(automaticContinuityFormCount(), 48);
});
