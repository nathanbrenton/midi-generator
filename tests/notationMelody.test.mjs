import { test } from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/core/notation/melody.ts";
import { buildAxialMelody } from "../src/core/melodicAxes.ts";

test("Ch.2 time: T = t/t = 1, and the dotted quarter + three eighths 3+1+1+1 becomes 3/6 + 1/6 + 1/6 + 1/6 (p.239)", () => {
  assert.equal(M.T, 1);
  assert.deepEqual(M.timeFractions([3, 1, 1, 1]).map((f) => `${f.numerator}/${f.denominator}`), ["3/6", "1/6", "1/6", "1/6"]);
  assert.equal(M.formatTimeGroup([3, 1, 1, 1]), "6/6 = 3t₁/6 + t₂/6 + t₃/6 + t₄/6");
});

test("Ch.2 time: a variation keeps each term's place -- 'the original third term now appears in the first place' (p.240)", () => {
  const [t1, t2, t3, t4] = M.timeTerms([3, 1, 1, 1]);
  assert.equal(M.formatTerms([t3, t1, t2, t4], 6), "6/6 = t₃/6 + 3t₁/6 + t₂/6 + t₄/6");
  assert.equal(M.formatTerms([t3, t1, t2, t4]), "t₃ + 3t₁ + t₂ + t₄");
});

test("Ch.2 pitch: c-d-f-g is 2p + 3p + 2p and c-f-d-g-c is 5p − 3p + 5p − 7p (p.241)", () => {
  assert.equal(M.formatPitchMotion([60, 62, 65, 67]), "2p + 3p + 2p");
  assert.deepEqual(M.pitchMotion([60, 65, 62, 67, 60]), [5, -3, 5, -7]);
  assert.equal(M.formatPitchMotion([60, 65, 62, 67, 60]), "5p − 3p + 5p − 7p");
});

test("Ch.2 pitch: a 15p range (c-eb') in three axes is P₁ = P₂ = P₃ = 5p -- c-f, f-bb, bb-eb' (p.241)", () => {
  assert.equal(M.range([60, 75]), 15);
  assert.deepEqual(M.partialRanges(60, [5, 5, 5]), [
    { label: "P₁", from: 60, to: 65, size: 5 },
    { label: "P₂", from: 65, to: 70, size: 5 },
    { label: "P₃", from: 70, to: 75, size: 5 },
  ]);
  assert.deepEqual(M.partialRanges(60, [5, 7]).map((p) => p.to), [65, 72]); // 12p as P₁ = 5 (c-f), P₂ = 7 (f-c') (p.268)
});

test("Ch.2 intensity: the 2-, 3- and 5-degree scales as printed, five degrees topping out at 6i (p.241)", () => {
  assert.deepEqual(M.INTENSITY_SCALES[3].map((d) => M.formatIntensity(d.units)), ["i", "2i", "3i"]);
  assert.deepEqual(M.INTENSITY_SCALES[3].map((d) => d.name), ["piano", "mezzo-forte", "forte"]);
  assert.deepEqual(M.INTENSITY_SCALES[5].map((d) => d.units), [1, 2, 3, 4, 6]);
  assert.equal(M.formatIntensity(0), "0i"); // rests: i₀ = 0i
});

test("Ch.2 quality: q scales of 2, 3 and 5 degrees between 'oo' and 'ee'; and the differentials dt, dp, di, dq (p.242)", () => {
  assert.deepEqual(M.QUALITY_SCALES[5].map(M.formatQuality), ["q", "2q", "3q", "4q", "5q"]);
  assert.equal(M.QUALITY_LIMITS.minimum.vowel, "oo");
  assert.equal(M.QUALITY_LIMITS.maximum.vowel, "ee");
  assert.deepEqual(Object.values(M.DIFFERENTIALS), ["dt", "dp", "di", "dq"]);
});

test("Ch.3: parseAxes reads the book's expressions -- time ratios, pitch ratios, and correlated (p.262, 274-275)", () => {
  assert.deepEqual(M.parseAxes("a3T + a2T + aT"), [
    { axis: "a", T: 3 },
    { axis: "a", T: 2 },
    { axis: "a", T: 1 },
  ]);
  assert.deepEqual(M.parseAxes("a3P + b2P + aP"), [
    { axis: "a", P: 3 },
    { axis: "b", P: 2 },
    { axis: "a", P: 1 },
  ]);
  assert.deepEqual(M.parseAxes("a2T2P + bTP"), [
    { axis: "a", T: 2, P: 2 },
    { axis: "b", T: 1, P: 1 },
  ]);
  assert.equal(M.parseAxes("a2,b1"), null); // not the book's notation
});

test("Ch.3: formatAxes round-trips, and parsed terms drive buildAxialMelody -- a2T + bT climbs 2 then returns (Figure 19)", () => {
  for (const text of ["a3T + a2T + aT", "a2T2P + bTP", "aTP + b2T2P", "a3P + b2P + aP + b3P + a2P + bP"]) {
    assert.equal(M.formatAxes(M.parseAxes(text)), text);
  }
  const melody = buildAxialMelody(M.toAxialTerms(M.parseAxes("a2T + bT")), 60, 1).map((n) => n.midiNote);
  assert.deepEqual(melody, [61, 62, 60]);
});

test("Ch.5-6: three axis-segments give 4³ = 64 position combinations; Ch.8: the First series from 5 spirals 5, 8, −21", () => {
  assert.equal(M.positionCombinations(3), 64);
  const first = [1, 2, 3, 5, 8, 13, 21, 34];
  assert.deepEqual(M.spiralBasic(first, 3), [5, 8, -21]);
});
