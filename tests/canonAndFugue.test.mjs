import { test } from "node:test";
import assert from "node:assert/strict";
import { canon, canonTemporalStructure, expositionForms, expositionAxes, interludeDurations, TWO_PART_STRUCTURES } from "../src/core/canonAndFugue.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const AEOLIAN = intervalCellScale([2, 1, 2, 2, 1, 2, 2]);
const NAMES = ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];

test("continuous imitation: the follower is the leader shifted in time, its structure identical (p.777)", () => {
  const [leader, follower] = canon([0, 2, 4, 3, 1, 0], [2, 1, 1, 2, 1, 1], 4, [
    { scale: MAJOR, tonic: 60, degreeShift: 0 },
    { scale: MAJOR, tonic: 48, degreeShift: 0 },
  ]);
  follower.forEach((n, i) => {
    assert.equal(n.startUnits, leader[i].startUnits + 4);
    assert.equal(n.durationUnits, leader[i].durationUnits);
    assert.equal(n.midiNote, leader[i].midiNote - 12); // type I: identical intonation
  });
});

test("types II and IV change the intonation, because the scale changes (p.783)", () => {
  const [leader, follower] = canon([0, 1, 2, 3, 4], [1, 1, 1, 1, 1], 2, [
    { scale: MAJOR, tonic: 60, degreeShift: 0 },
    { scale: AEOLIAN, tonic: 57, degreeShift: 0 },
  ]);
  const steps = (v) => v.slice(1).map((n, i) => n.midiNote - v[i].midiNote);
  assert.notDeepEqual(steps(follower), steps(leader));
});

test("a two-part canon's temporal structure: a + b + a + b over (rest) + a + b + a (p.778)", () => {
  assert.deepEqual(canonTemporalStructure(4), { leader: ["a", "b", "a", "b"], follower: ["rest", "a", "b", "a"] });
});

test("Figure 94: 16 forms of exposition, the diagonal four with one position (p.792)", () => {
  const forms = expositionForms();
  assert.equal(forms.length, 16);
  assert.equal(forms.filter((f) => f.diagonal).length, 4);
});

test("exposition axes: type II with CF on c and CP on e goes c, a, f, d; type III on ∜2 with CP a minor third above, c, a, f♯, e♭ (p.806)", () => {
  const ii = expositionAxes("II", 0, 2, 4, MAJOR);
  assert.deepEqual(ii.map((e) => NAMES[e.cf]), ["c", "a", "f", "d"]);
  assert.deepEqual(ii.map((e) => NAMES[e.cp]), ["e", "c", "a", "f"]); // "CP2 must have P.A. on c"
  const iii = expositionAxes("III", 0, 3, 4);
  assert.deepEqual(iii.map((e) => NAMES[e.cf]), ["c", "a", "f#", "eb"]);
  assert.deepEqual(iii.map((e) => NAMES[e.cp]), ["eb", "c", "a", "f#"]);
});

test("interlude schemes 4 and 5: each interlude longer, or shorter (p.808); two-part structures (Figure 111)", () => {
  assert.deepEqual(interludeDurations("growing", 4), [1, 2, 3, 4]);
  assert.deepEqual(interludeDurations("shrinking", 4), [4, 3, 2, 1]);
  assert.deepEqual(TWO_PART_STRUCTURES["S(7)"], [1, 7]);
});
