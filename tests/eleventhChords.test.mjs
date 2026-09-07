import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stackedEleventhChord,
  eleventhPositions,
  buildEleventhVoicing,
  resolveEleventhToNinth,
  ELEVENTH_UPPER_FUNCTIONS,
} from "../src/core/eleventhChords.ts";
import { stackedNinthChord } from "../src/core/ninthChords.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const C_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

function pc(n) {
  return ((n % 12) + 12) % 12;
}

test("stackedEleventhChord: C11 in root position is bass=C, upper={B,D,F} -- third and fifth both omitted (p.469)", () => {
  const { bass, upper } = stackedEleventhChord(C_MAJOR, 60, 0);
  assert.equal(bass, 60); // C4
  assert.deepEqual(upper, [71, 74, 77]); // B4 (7th), D5 (9th), F5 (11th)
});

test("the upper 7-9-11 voices are themselves stacked thirds, like a triad (p.469)", () => {
  const { upper } = stackedEleventhChord(C_MAJOR, 60, 0);
  const step1 = ((pc(upper[1]) - pc(upper[0])) % 12 + 12) % 12;
  const step2 = ((pc(upper[2]) - pc(upper[1])) % 12 + 12) % 12;
  assert.ok([3, 4].includes(step1), "7th->9th must be a third (3 or 4 semitones)");
  assert.ok([3, 4].includes(step2), "9th->11th must be a third (3 or 4 semitones)");
});

test("eleventhPositions: exactly 6 distinct permutations of the 3 upper voices (p.469, Figure 176)", () => {
  const positions = eleventhPositions();
  assert.equal(positions.length, 6);
  for (const position of positions) {
    assert.deepEqual([...position].sort(), [...ELEVENTH_UPPER_FUNCTIONS].sort());
  }
  const unique = new Set(positions.map((p) => p.join(",")));
  assert.equal(unique.size, 6);
});

test("buildEleventhVoicing stacks the given position upward in close position above the bass", () => {
  const { bass, upper } = buildEleventhVoicing(["eleventh", "seventh", "ninth"], C_MAJOR, 60, 0);
  assert.equal(bass, 60);
  assert.deepEqual(upper.map(pc), [5, 11, 2]); // F, B, D in that order
  for (let i = 1; i < upper.length; i++) assert.ok(upper[i] > upper[i - 1]);
  assert.ok(upper[0] > bass);
});

test("resolveEleventhToNinth lands exactly on Ch.10's own S(9) chord for the same root -- \"S(9) has its proper structural constitution, i.e. 1,3,7,9\" (p.469-470)", () => {
  const resolved = resolveEleventhToNinth(C_MAJOR, 60, 0);
  const ninth = stackedNinthChord(C_MAJOR, 60, 0);
  assert.deepEqual(resolved, ninth);
  assert.deepEqual(resolved.upper.map(pc), [4, 11, 2]); // 3rd, 7th, 9th -- E, B, D
});
