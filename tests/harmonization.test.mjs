import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HARMONIZATION_FORMS,
  functionOf,
  groupAssignments,
  harmonize,
  placements,
  chordsForNote,
  triadPlacements,
  assignmentCount,
} from "../src/core/harmonization.ts";
import { SIGMA_13 } from "../src/core/masterStructures.ts";

const XIII = SIGMA_13[12];
const D = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
const tones = (s) => s.split(" ").map((n) => D[n]);
const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

test("nine forms of harmonization (p.666)", () => {
  assert.equal(HARMONIZATION_FORMS.length, 9);
});

test("Figure 45: a b c d over C is 13-7-1-9; e c b d over D is 9-7-13-1; e f g a over G is 13-7-1-9 (p.670)", () => {
  assert.deepEqual(tones("a b c d").map((t) => functionOf(t, D.c)), [13, 7, 1, 9]);
  assert.deepEqual(tones("e c b d").map((t) => functionOf(t, D.d)), [9, 7, 13, 1]);
  assert.deepEqual(tones("e f g a").map((t) => functionOf(t, D.g)), [13, 7, 1, 9]);
});

test("one chord can harmonize all seven tones -- none exceeds the 13th (p.667); a narrower range leaves fewer roots", () => {
  assert.equal(groupAssignments(tones("c d e f g a b")).length, 7);
  assert.ok(groupAssignments(tones("c e"), [5, 13]).every((o) => o.functions.every((f) => f >= 5)));
  assert.ok(groupAssignments(tones("c e"), [5, 13]).length < groupAssignments(tones("c e")).length);
});

test("harmonize prefers positive cycles between the chords", async () => {
  const { cycleBetween } = await import("../src/core/diatonicHarmony.ts");
  const result = harmonize(tones("e d c b a g f e d c b c"), [2, 2, 2, 2, 2, 2], [3, 13]);
  assert.equal(result.length, 6);
  for (let i = 1; i < result.length; i++) assert.ok([3, 5, 7].includes(cycleBetween(result[i - 1].rootDegree, result[i].rootDegree)), `chord ${i}`);
});

test("Σ XIII: c-e♭-b♭ fits as 3-5-9 and 13-1-5 as the book says -- and also as 11-13-3 (f♯-a-e), which it overlooks (p.672)", () => {
  const found = placements(XIII, [0, 3, 10]).map((p) => p.join("-"));
  assert.ok(found.includes("3-5-9"));
  assert.ok(found.includes("13-1-5"));
  assert.deepEqual(found.sort(), ["11-13-3", "13-1-5", "3-5-9"]);
});

test("Σ XIII: c is satisfied by C, B♭, A♭, G♭, F, E♭, D (p.674)", () => {
  assert.deepEqual(new Set(chordsForNote(XIII, 0).map((c) => NAMES[c.root])), new Set(["C", "Bb", "Ab", "Gb", "F", "Eb", "D"]));
});

test("the second method: Σ with b♭ and f♯ on c takes a minor triad only as 5-7-9 and 13-1-3, so 2³ = 8 harmonizations (p.680-681)", () => {
  assert.deepEqual(triadPlacements(XIII, [3, 4]), [[5, 7, 9], [13, 1, 3]]);
  assert.equal(assignmentCount(2).total, 8);
});

test("the first method: 7 + 18 x 7 + 35 x 6 = 7 + 126 + 210 = 343 harmonizations (p.680)", () => {
  assert.deepEqual(assignmentCount(7), { constant: 7, twoEqual: 126, variable: 210, total: 343 });
  // the three upper functions of a Σ can be read as any of its seven consecutive triples
  assert.equal(triadPlacements(XIII, [4, 3]).length + triadPlacements(XIII, [3, 4]).length + triadPlacements(XIII, [3, 3]).length + triadPlacements(XIII, [4, 4]).length, 7);
});
