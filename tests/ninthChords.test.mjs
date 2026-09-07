import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stackedNinthChord,
  ninthPositions,
  buildNinthVoicing,
  NINTH_PREPARATION_TABLE,
  NINTH_UPPER_FUNCTIONS,
} from "../src/core/ninthChords.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const C_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

function pc(n) {
  return ((n % 12) + 12) % 12;
}

test("stackedNinthChord: Cmaj9 in root position is bass=C, upper={E,B,D} -- root and fifth omitted from the upper voices (p.460)", () => {
  const { bass, upper } = stackedNinthChord(C_MAJOR, 60, 0);
  assert.equal(bass, 60); // C4
  assert.deepEqual(upper, [64, 71, 74]); // E4, B4, D5 -- third, seventh, ninth
});

test("ninthPositions: exactly 6 distinct permutations of the 3 upper voices (p.460, Figure 156)", () => {
  const positions = ninthPositions();
  assert.equal(positions.length, 6);
  for (const position of positions) {
    assert.deepEqual([...position].sort(), [...NINTH_UPPER_FUNCTIONS].sort());
  }
  const unique = new Set(positions.map((p) => p.join(",")));
  assert.equal(unique.size, 6, "all 6 positions must be distinct orderings");
});

test("buildNinthVoicing stacks the given position upward in close position above the bass", () => {
  const { bass, upper } = buildNinthVoicing(["ninth", "third", "seventh"], C_MAJOR, 60, 0);
  assert.equal(bass, 60);
  assert.deepEqual(upper.map(pc), [2, 4, 11]); // D, E, B in that order
  for (let i = 1; i < upper.length; i++) assert.ok(upper[i] > upper[i - 1], "each voice must sit strictly above the previous one");
  assert.ok(upper[0] > bass, "the lowest upper voice must sit above the bass");
});

test("NINTH_PREPARATION_TABLE has exactly 9 entries (3 methods x 3 target-function pairs, p.461)", () => {
  assert.equal(NINTH_PREPARATION_TABLE.length, 9);
  const suspending1 = NINTH_PREPARATION_TABLE.find((e) => e.method === "suspending" && e.fromSeventh === 1);
  assert.equal(suspending1.cycle, "C7");
  const descending1 = NINTH_PREPARATION_TABLE.find((e) => e.method === "descending" && e.fromSeventh === 1);
  assert.equal(descending1.cycle, "C0");
  const ascending5 = NINTH_PREPARATION_TABLE.find((e) => e.method === "ascending" && e.fromSeventh === 5);
  assert.equal(ascending5.cycle, "C-7");
});
