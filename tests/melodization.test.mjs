import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCALE_OF_TENSION,
  rootsUnderHeldTone,
  cycleOfFunctions,
  MELODIZATION_TABLE,
  melodizingFunctions,
  melodizationCount,
  melodize,
} from "../src/core/melodization.ts";
import { cycleDegreeStep } from "../src/core/diatonicHarmony.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const names = (degrees) => degrees.map((d) => "CDEFGAB"[d]).join(" ");

test("a held c read clockwise through the scale of tension lies over C A F D B G E C -- C3; 1-5-9 ... C5; 1-7-13 ... C7 (p.620-621)", () => {
  assert.equal(names(rootsUnderHeldTone(0, [...SCALE_OF_TENSION, 1])), "C A F D B G E C");
  assert.equal(names(rootsUnderHeldTone(0, [1, 5, 9, 13, 3, 7, 11, 1])), "C F B E A D G C");
  assert.equal(names(rootsUnderHeldTone(0, [1, 7, 13, 5, 11, 3, 9, 1])), "C D E F G A B C");
  assert.deepEqual([cycleOfFunctions(1, 3), cycleOfFunctions(1, 5), cycleOfFunctions(1, 7)], [3, 5, 7]);
  // "By reading the above progression backwards, the negative form is obtained."
  assert.equal(cycleOfFunctions(3, 1), -3);
});

test("Figure 2: 2C5 + C3 + C5 + 2C7 melodized by the root is c f b g c d e; by the 7, the same pattern (p.621)", () => {
  const steps = [5, 5, 3, 5, 7, 7].map(cycleDegreeStep);
  const roots = steps.reduce((acc, s) => [...acc, (((acc[acc.length - 1] + s) % 7) + 7) % 7], [0]);
  assert.equal(names(roots), "C F B G C D E");
  const byRoot = roots.map((d) => d);
  const bySeventh = roots.map((d) => (d + 6) % 7);
  assert.equal(names(bySeventh), "B E A F B C D");
  const motion = (ds) => ds.slice(1).map((d, i) => (((d - ds[i]) % 7) + 7) % 7);
  assert.deepEqual(motion(bySeventh), motion(byRoot));
});

test("Table I: S(5) is melodized by 1, 3, 5, 7, 13 -- the c chord by c, e, g, b, a but not d or f (p.622-623, Figures 4-5)", () => {
  assert.deepEqual(melodizingFunctions("S(5)"), [1, 3, 5, 7, 13]);
  assert.deepEqual(melodizingFunctions("S(7)"), [1, 3, 5, 7, 9, 13]);
  assert.deepEqual(melodizingFunctions("S(9)"), [1, 3, 5, 7, 9, 11, 13]);
  assert.deepEqual(melodizingFunctions("S(11)"), [1, 5, 7, 9, 11, 13]);
  assert.equal(MELODIZATION_TABLE.filter((r) => r.tension === "S(13)").length, 2); // "two forms of structures"
});

test("Table II: with two or more attacks, 9 over S(5) after 7 and 11 over S(7) after 9 (p.625, Figure 7)", () => {
  assert.ok(melodizingFunctions("S(5)", 2, 7).includes(9));
  assert.ok(!melodizingFunctions("S(5)", 2, 5).includes(9));
  assert.ok(!melodizingFunctions("S(5)", 1, 7).includes(9));
  assert.ok(melodizingFunctions("S(7)", 3, 9).includes(11));
});

test("five practical functions per chord: 5^8 = 390,625 melodizations of eight chords (p.623)", () => {
  assert.equal(melodizationCount(8), 390625);
});

test("melodize: every tone is a usable function inside the range, moving along the axis", () => {
  const chords = [0, 3, 6, 4, 0, 1, 2].map((rootDegree) => ({ rootDegree, tension: "S(5)" }));
  const up = melodize(MAJOR, 60, chords, [1, 13], "a", 60, [55, 96]);
  assert.ok(up.functions.every((fn) => melodizingFunctions("S(5)").includes(fn)));
  for (let i = 1; i < up.pitches.length; i++) assert.ok(up.pitches[i] > up.pitches[i - 1]);
  const narrow = melodize(MAJOR, 60, chords, [1, 5], "0");
  assert.ok(narrow.functions.every((fn) => fn <= 5));
});

test("statistical melodization: count each pitch class once per chord, keep the high marks, root on the highest (p.663)", async () => {
  const { quantitativeAnalysis, quantitativeScale } = await import("../src/core/melodization.ts");
  const chords = [[52, 56, 59, 64], [52, 55, 59, 64], [53, 57, 60, 65], [52, 56, 59, 62], [57, 60, 64, 69]]; // E E- F E7 Am
  const counts = quantitativeAnalysis(chords);
  assert.equal(counts[4], 4); // e in four chords, doubled e counted once
  const { root, scale } = quantitativeScale(chords, 2);
  assert.equal(root, 4);
  assert.equal(scale[0], 4);
  assert.ok(scale.every((pc) => counts[pc] >= 2));
});

test("compound axes a + b and b + a: up then down, down then up (Figure 6)", () => {
  const chords = [0, 3, 6, 2, 5, 1, 4, 0].map((rootDegree) => ({ rootDegree, tension: "S(5)" }));
  const ab = melodize(MAJOR, 60, chords, [1, 13], "a+b", 67, [55, 96]).pitches;
  for (let i = 1; i < 4; i++) assert.ok(ab[i] > ab[i - 1]);
  for (let i = 5; i < 8; i++) assert.ok(ab[i] < ab[i - 1]);
});
