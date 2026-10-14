import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stackedNinthChord,
  ninthPositions,
  buildNinthVoicing,
  NINTH_PREPARATION_TABLE,
  NINTH_UPPER_FUNCTIONS,
  NINTH_RESOLUTIONS,
  NINTH_FAMILIES,
  consecutiveSevenths,
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

// Resolutions of S(9), Figure 157 (p.460-461), read with positive cycles running downward.
test("S(9) resolutions: the ninth always steps down; the seventh too except in C0; positive cycles only; S(9) goes to S(7) or S(5)/S(6) (p.460-461)", async () => {
  const { cycleDegreeStep } = await import("../src/core/diatonicHarmony.ts");
  const { midiNoteForDegree } = await import("../src/core/scales.ts");
  const scale = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
  const pitch = (root, fn) => midiNoteForDegree(scale, 60, root + fn - 1);
  const offsets = { third: 3, seventh: 7, ninth: 9 };
  const names = ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
  const seen = {};
  for (const r of NINTH_RESOLUTIONS) {
    const next = r.cycle === "C0" ? 0 : cycleDegreeStep(Number(r.cycle.slice(1)));
    const motion = {};
    for (const [fn, n] of Object.entries(offsets)) {
      const from = pitch(0, n) % 12;
      const to = pitch(next, r.moves[fn]) % 12;
      motion[fn] = ((to - from + 18) % 12) - 6; // signed semitones, nearest
    }
    assert.ok(motion.ninth < 0 && motion.ninth >= -2, `${r.cycle}: the ninth steps down`);
    if (r.cycle === "C0") assert.equal(motion.seventh, 0);
    else assert.ok(motion.seventh < 0 && motion.seventh >= -2, `${r.cycle}: the seventh steps down`);
    seen[r.cycle] = ["third", "seventh", "ninth"].map((fn) => names[pitch(next, r.moves[fn]) % 12]).join("-") + " / " + names[pitch(next, r.bass) % 12];
  }
  assert.deepEqual(seen, { C0: "e-b-c / c", C3: "e-a-c / c", C5: "e-a-c / f", C7: "f-a-c / d" });
});

test("the two families of S(9) (Figures 162-163) and the four C0 pairs that make consecutive sevenths (p.464-465)", () => {
  const label = (f) => `${f.family === "minor seventh" ? "7b" : "7n"}S${f.index}`;
  assert.deepEqual(NINTH_FAMILIES.map(label), ["7bS1", "7bS2", "7bS3", "7bS4", "7nS1", "7nS2", "7nS3"]);
  assert.deepEqual(NINTH_FAMILIES.map((f) => f.name), ["large", "diminished", "minor", "small", "major", "augmented I", "augmented II"]);
  const bad = [];
  for (let i = 0; i < NINTH_FAMILIES.length; i++)
    for (let j = i + 1; j < NINTH_FAMILIES.length; j++)
      if (consecutiveSevenths(NINTH_FAMILIES[i], NINTH_FAMILIES[j])) bad.push(`${label(NINTH_FAMILIES[i])}-${label(NINTH_FAMILIES[j])}`);
  assert.deepEqual(bad.sort(), ["7bS1-7bS4", "7bS3-7nS2", "7bS4-7nS1", "7nS2-7nS3"]);
});
