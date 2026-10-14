import { test } from "node:test";
import assert from "node:assert/strict";
import {
  voiceOrders,
  automaticChromaticContinuity,
  automaticContinuityFormCount,
  VOICES,
  continuityFromMoves,
  fourPartFormCount,
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

// Voices as indices, lowest first: T = 0, A = 1, S = 2 (and B = 0, T = 1, A = 2, S = 3 in four parts).
const pcs = (chord) => chord.map((n) => ((n % 12) + 12) % 12);

test("one voice at a time, S then A then T: the same 36 moves, closing on the 37th chord (p.544)", () => {
  const chords = continuityFromMoves([60, 64, 67], [[2], [1], [0]], "down");
  assert.equal(chords.length, 37);
  const book = automaticChromaticContinuity(1, ["S", "A", "T"], "down", 60);
  book.forEach((step, k) => assert.deepEqual(chords[k + 1], [step.pitches.T, step.pitches.A, step.pitches.S]));
  assert.deepEqual(pcs(chords[36]), pcs(chords[0]));
});

test("two voices at a time (Figure 288): three pairs, each voice moving twice a group -- the structure returns two semitones on", () => {
  const chords = continuityFromMoves([60, 64, 67], [[1, 0], [2, 0], [2, 1]], "up");
  assert.deepEqual(chords[3], [62, 66, 69]); // "identical S" a whole tone up
  assert.equal(chords.length, 19);
});

test("a pair compensated by the remaining voice (Figure 289): S A, then T", () => {
  const chords = continuityFromMoves([60, 64, 67], [[2, 1], [0]], "down");
  assert.deepEqual(chords[2], [59, 63, 66]);
  assert.equal(chords.length, 25);
});

test("the direction may change only after equal participation: an unequal group is refused (p.548-549)", () => {
  assert.throws(() => continuityFromMoves([60, 64, 67], [[2], [1]], "down"));
});

test("four parts: 4 x 12 = 48 chords a direction, 7 x 24 x 2 = 336 forms; Figure 292's group moves every voice twice (p.548-549)", () => {
  const maj7 = [60, 64, 67, 71]; // 4 + 3 + 4, the book's example (a)
  assert.equal(continuityFromMoves(maj7, [[0], [2], [3], [1]], "down").length, 49);
  assert.equal(fourPartFormCount(), 336);
  // S A; A T; B; S T; B -- all voices twice.
  const fig292 = continuityFromMoves(maj7, [[3, 2], [2, 1], [0], [3, 1], [0]], "up");
  assert.deepEqual(fig292[5], [62, 66, 69, 73]);
});

test("combinations: 3C2 = 3 pairs in three parts, 4C2 = 6 and 4C3 = 4 in four (p.545, 549-550)", async () => {
  const { combinationsBy } = await import("../src/core/higherOrderPermutations.ts");
  assert.deepEqual([[3, 2], [4, 2], [4, 3]].map(([n, k]) => combinationsBy(n, k).length), [3, 6, 4]);
});
