import { test } from "node:test";
import assert from "node:assert/strict";
import { HYBRID_CONTINUITY_RATIO, smoothJoinRoot, buildHybridSegmentJoin } from "../src/core/hybridHarmonicContinuity.ts";

test("HYBRID_CONTINUITY_RATIO matches the book's own stated formula exactly: Hy = di3H + ch6H + sy3H (p.552)", () => {
  assert.deepEqual(HYBRID_CONTINUITY_RATIO, { diatonic: 3, chromatic: 6, symmetric: 3 });
  // "di + 2ch + sy" -- chromatic gets twice the weight of either neighbor
  assert.equal(HYBRID_CONTINUITY_RATIO.chromatic, 2 * HYBRID_CONTINUITY_RATIO.diatonic);
  assert.equal(HYBRID_CONTINUITY_RATIO.chromatic, 2 * HYBRID_CONTINUITY_RATIO.symmetric);
});

test("smoothJoinRoot reproduces the book's own worked example exactly: E-F-F# (p.553)", () => {
  const E = 4;
  const F = 5;
  const join = smoothJoinRoot(E, F);
  assert.equal(join, 6); // F#
});

test("smoothJoinRoot repeats whatever interval (up or down, any size) ended the preceding group", () => {
  assert.equal(smoothJoinRoot(60, 58), 56); // descending whole step continues descending
  assert.equal(smoothJoinRoot(60, 64), 68); // ascending major third continues ascending
  assert.equal(smoothJoinRoot(60, 60), 60); // no motion continues as no motion
});

test("buildHybridSegmentJoin reports both the join root and the repeated interval", () => {
  const join = buildHybridSegmentJoin(4, 5); // E -> F
  assert.equal(join.interval, 1);
  assert.equal(join.joinRoot, 6); // F#
});
