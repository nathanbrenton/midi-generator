import { test } from "node:test";
import assert from "node:assert/strict";
import {
  structureCount,
  STRUCTURE_COUNTS,
  reciprocalExpansion,
  diadTransformations,
  sigmaCounts,
  sigmaLimit,
  structureFamilies,
  familyMembers,
  directionalUnitCounts,
  directionalUnitsByMotion,
  directionalManifold,
  fourthsCycle,
  fourthsTetrad,
  reciprocatingStrata,
  canonSchemes,
  rotatePhase,
  alternatingSigns,
  densityGroup,
} from "../src/core/generalHarmony.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

test("structures in the twelve-unit octave: 11 two-part, 55 three-part, 165 four-part", () => {
  assert.equal(structureCount(2), 11);
  assert.equal(structureCount(3), 55);
  assert.equal(structureCount(4), 165);
  assert.deepEqual(STRUCTURE_COUNTS, { 2: 11, 3: 55, 4: 165 });
});

test("diatonic expansions reciprocate in octave inversion: E0-E5, E1-E4, E2-E3; diads a⇄b and const. ab", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((e) => reciprocalExpansion(e)), [5, 4, 3, 2, 1, 0]);
  assert.deepEqual(diadTransformations(true), ["a⇄b"]);
  assert.deepEqual(diadTransformations(false), ["a⇄b", "const. ab"]);
});

test("sigma counts: 11 x 12 = 132 hybrid (42 diatonic); 11³ = 1,331 and 6³ = 216; 165² x 11 = 299,475; 24² = 576 transformations, 9 forms by 2 = 36 (p.1076-1145)", () => {
  const c = sigmaCounts();
  assert.deepEqual(c.hybridThreePart, { general: 132, diatonic: 42 });
  assert.deepEqual(c.twoStrataOfTwoParts, { general: 1331, diatonic: 216 });
  assert.deepEqual(c.twoStrataOfFourParts, { general: 299475, transformations: 576, fundamentalPairs: 36 });
});

test("limits: 10 parts in 5 strata (11 with the root); 144S2p = 288p, a score of 289; 576 parts of four-part strata (577)", () => {
  assert.deepEqual(sigmaLimit(5, 2), { strata: 5, parts: 10, withRoot: 11 });
  assert.deepEqual(sigmaLimit(12, 2, 12), { strata: 144, parts: 288, withRoot: 289 });
  assert.deepEqual(sigmaLimit(12, 4, 12), { strata: 144, parts: 576, withRoot: 577 });
});

test("families: the stated rule gives 30 triad and 41 tetrad families (the book prints 29 and 40), whose members are the 55 and 165 structures (p.1158)", () => {
  assert.deepEqual(structureFamilies(2), { families: 30, singleMember: 5, members: 55 });
  assert.deepEqual(structureFamilies(3), { families: 41, singleMember: 3, members: 165 });
  assert.equal(familyMembers([3, 3, 3]).length, 1);
  assert.equal(familyMembers([5, 3, 3]).length, 3);
  assert.equal(familyMembers([1, 2, 3]).length, 6);
  // N(Σ = 5 + 3 + 3) = 27 x 5 = 135
  assert.equal(27 * 5, 135);
});

test("directional units: 9/25, 27/125, 81/625; the book's tables 1 + 16 + 12 + 12 + 24 + 12 + 24 + 24 = 125 and the S4p sum 625; 165 x 3 x 625 = 309,375 (p.1169-1186)", () => {
  assert.deepEqual([2, 3, 4].map((n) => directionalUnitCounts(n)), [
    { forms: 9, intonations: 25 },
    { forms: 27, intonations: 125 },
    { forms: 81, intonations: 625 },
  ]);
  const s3 = directionalUnitsByMotion(3);
  assert.deepEqual(s3.map((r) => r.forms), [1, 6, 12, 8]);
  assert.deepEqual(s3.map((r) => r.total), [1, 12, 48, 64]);
  // the book's grouping: (2)(3) 2 x 8; (4)-(9) 6 x 2; (10)-(12), (16)-(18), last six x 4; (13)-(15), (19)-(21) x 8
  assert.equal(1 + 16 + 12 + 12 + 24 + 12 + 24 + 24, s3.reduce((a, r) => a + r.total, 0));
  const s4 = directionalUnitsByMotion(4);
  assert.equal(s4.reduce((a, r) => a + r.forms, 0), 81);
  assert.equal(1 + 32 + 16 + 32 + 64 + 32 + 64 + 48 + 96 + 48 + 192, s4.reduce((a, r) => a + r.total, 0));
  assert.equal(directionalManifold(), 309375);
});

test("harmony of fourths: C4, C7, C10 step 3, 6, 9 degrees down; E2 tetrad on c is c f b e", () => {
  assert.deepEqual(fourthsCycle(4), [0, 4, 1, 5, 2, 6, 3]);
  assert.deepEqual(fourthsCycle(7), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(fourthsCycle(10), [0, 5, 3, 1, 6, 4, 2]);
  assert.deepEqual(fourthsTetrad(MAJOR, 60, 0), [60, 65, 71, 76]);
});

test("reciprocating strata coincide only on the dominant, an S(7) (p.1139)", () => {
  const same = (a, b) => [...a].sort().join() === [...b].sort().join();
  const coinciding = [0, 1, 2, 3, 4, 5, 6].filter((d) => {
    const { upper, lower } = reciprocatingStrata(MAJOR, d);
    return same(upper, lower);
  });
  assert.deepEqual(coinciding, [4]);
  assert.deepEqual(reciprocatingStrata(MAJOR, 4).upper, [7, 11, 2, 5]);
});

test("canon schemes from three-part strata: 3! orders, clockwise or counterclockwise = 12", () => {
  assert.equal(canonSchemes(3), 12);
});

test("phasic rotation adds modulo θ: the book's two problems give φ3 and φ7 (p.1237)", () => {
  assert.equal(rotatePhase(0, [2, -3, 5, 1, -4, 3, -1], 8), 3);
  assert.equal(rotatePhase(3, [2, -3, -1, 6], 8), 7);
  assert.equal(rotatePhase(0, [4], 3), 1);
  assert.equal(rotatePhase(0, [-13], 5), 2);
});

test("resultants with alternating signs return to φ0 (Figure 140)", () => {
  const r43 = [3, 1, 2, 2, 1, 3];
  const r54 = [4, 1, 3, 2, 2, 3, 1, 4];
  assert.deepEqual(alternatingSigns(r43), [3, -1, 2, -2, 1, -3]);
  assert.equal(rotatePhase(0, alternatingSigns(r43), 8), 0);
  assert.equal(rotatePhase(5, alternatingSigns(r54), 8), 5);
});

test("density-groups as the book writes them", () => {
  assert.deepEqual(densityGroup(3, 3), { label: "3d3t", area: 9 });
  assert.deepEqual(densityGroup(1, 2), { label: "d2t", area: 2 });
});
