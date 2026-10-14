import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stackedEleventhChord,
  eleventhPositions,
  buildEleventhVoicing,
  resolveEleventhToNinth,
  ELEVENTH_UPPER_FUNCTIONS,
  eleventhResolutionChain,
  prepareEleventh,
  ELEVENTH_FAMILIES,
  ELEVENTH_RESOLUTIONS,
  eleventhFormName,
  symmetricEleventhChord,
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

const pcName = (n) => ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"][((n % 12) + 12) % 12];

test("the C0 chain S(11) -> S(9) -> S(7) -> S(6)③, one function down at a time, 11 first (p.469)", async () => {
  const { intervalCellScale } = await import("../src/core/scales.ts");
  const scale = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
  const chain = eleventhResolutionChain(scale, 48, 0);
  assert.deepEqual(
    chain.map((c) => `${c.label} ${pcName(c.bass)}|${c.upper.map(pcName).join("-")}`),
    ["S(11) c|b-d-f", "S(9) c|b-d-e", "S(7) c|b-c-e", "S(6) c|a-c-e"],
  );
  // S(9) "has its proper structural constitution (1, 3, 7, 9)": the chord Ch.10 builds.
  assert.deepEqual(new Set(chain[1].upper.map((n) => n % 12)), new Set(stackedNinthChord(scale, 48, 0).upper.map((n) => n % 12)));
});

test("preparing S(11): C7 moves the bass of S(5) up a step under unchanged upper voices; C0 moves the upper voices down (p.470-471)", async () => {
  const { intervalCellScale } = await import("../src/core/scales.ts");
  const scale = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
  const c7 = prepareEleventh(scale, 48, 0, "C7");
  assert.deepEqual(c7.to.upper, c7.from.upper);
  assert.equal(pcName(c7.to.bass), "d");
  assert.deepEqual(new Set(c7.to.upper.map((n) => n % 12)), new Set(stackedEleventhChord(scale, 48, 1).upper.map((n) => n % 12)));
  const c0 = prepareEleventh(scale, 48, 0, "C0");
  assert.equal(c0.to.bass, c0.from.bass);
  assert.deepEqual(c0.to.upper.map(pcName), ["b", "d", "f"]);
  assert.ok(c0.to.upper.every((n, k) => n < c0.from.upper[k] && c0.from.upper[k] - n <= 2));
});

test("the two families of S(11), classified by their upper triad on the seventh (Figures 182-183, p.473)", () => {
  const names = ["c", "db", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
  const spell = (f) => symmetricEleventhChord(f.family, f.structure, 48).upper.map((n) => names[n % 12]).join("-");
  const common = ELEVENTH_FAMILIES.filter((f) => f.common);
  assert.deepEqual(common.map(spell), ["bb-d-f", "bb-db-f", "bb-d-f#", "b-eb-f#", "b-d-f#", "b-d-f"]);
  assert.deepEqual(common.map(eleventhFormName), ["major", "minor", "augmented", "major", "minor", "diminished"]);
  assert.deepEqual(ELEVENTH_FAMILIES.filter((f) => !f.common).map(eleventhFormName), ["diminished", "augmented"]);
});

test("resolutions of S(11) act only in C0, C3 and C5 -- the cycles of two, three and four tonics, as Section C says (p.473)", async () => {
  const { SYMMETRIC_CYCLE_FOR_TONIC_COUNT } = await import("../src/core/symmetricHarmony.ts");
  const cycles = new Set(ELEVENTH_RESOLUTIONS.map((r) => r.cycle).filter((c) => c !== "C0"));
  assert.deepEqual([...cycles].sort(), ["C3", "C5"]);
  assert.deepEqual(new Set([2, 3, 4].map((n) => SYMMETRIC_CYCLE_FOR_TONIC_COUNT[n])), cycles);
});
