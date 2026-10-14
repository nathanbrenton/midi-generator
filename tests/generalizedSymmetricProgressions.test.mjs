import { test } from "node:test";
import assert from "node:assert/strict";
import {
  descendingInterval,
  symmetricProgressionCycleLength,
  chordRootProgression,
  modulationInterval,
  completeSymmetricProgression,
} from "../src/core/generalizedSymmetricProgressions.ts";
import { generateCompositions } from "../src/core/symmetricScales.ts";

test("descendingInterval matches the book's own table exactly (p.489)", () => {
  const C = 0;
  assert.equal(descendingInterval(C, 0), 0); // c -> c
  assert.equal(descendingInterval(C, 11), 1); // c -> b
  assert.equal(descendingInterval(C, 10), 2); // c -> bb
  assert.equal(descendingInterval(C, 9), 3); // c -> a
  assert.equal(descendingInterval(C, 8), 4); // c -> ab
  assert.equal(descendingInterval(C, 7), 5); // c -> g
  assert.equal(descendingInterval(C, 6), 6); // c -> f#
  assert.equal(descendingInterval(C, 5), 7); // c -> f
  assert.equal(descendingInterval(C, 4), 8); // c -> e
  assert.equal(descendingInterval(C, 3), 9); // c -> eb
  assert.equal(descendingInterval(C, 2), 10); // c -> d
  assert.equal(descendingInterval(C, 1), 11); // c -> db
});

test("symmetricProgressionCycleLength matches the book's own worked examples exactly (p.490)", () => {
  assert.equal(symmetricProgressionCycleLength(5), 12); // binomial 3+2: 12 recurrences
  assert.equal(symmetricProgressionCycleLength(12), 1); // r4-3: 3+1+2+2+1+3=12, closes after 1 cycle
  assert.equal(symmetricProgressionCycleLength(20), 3); // r5-5-4: 4+1+3+2+2+3+1+4=20, closes after 3 cycles
});

test("chordRootProgression turns a rhythm group directly into a descending chord-root sequence", () => {
  const roots = chordRootProgression(60, [3, 2]); // C4, then down a minor 3rd, then down a whole step
  assert.deepEqual(roots, [60, 57, 55]);
});

test("modulationInterval finds the interval for the book's own C->Eb modulation example (p.492): 9", () => {
  const interval = modulationInterval(0, 3); // C to Eb, descending
  assert.equal(interval, 9);
  // "breaking up number 9 into binomials: 8+1, 7+2, 6+3, 5+4, and their reciprocals" -- generateCompositions reuse, no new function needed
  const binomials = generateCompositions(interval, 2);
  assert.deepEqual(binomials, [
    [1, 8],
    [2, 7],
    [3, 6],
    [4, 5],
    [5, 4],
    [6, 3],
    [7, 2],
    [8, 1],
  ]);
});

test("modulationInterval adds the invariant 12 for the book's own C->Bb example (p.493): 2 -> 14", () => {
  assert.equal(modulationInterval(0, 10), 2);
  assert.equal(modulationInterval(0, 10, true), 14);
});

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const spell = (roots) => roots.map((n) => NAMES[((n % 12) + 12) % 12]).join("-");

test("Figure 204: small descending numbers are the positive steps of three and four tonics, the negative of six and twelve (p.489-490)", async () => {
  const { symmetricRoots } = await import("../src/core/symmetricHarmony.ts");
  const step = (n, form) => descendingInterval(0, symmetricRoots(n, form).tonics[1]);
  assert.deepEqual([3, 4].map((n) => step(n, "positive")), [4, 3]); // 4+4+4, 3+3+3+3 -- positive C3
  assert.deepEqual([6, 12].map((n) => step(n, "negative")), [2, 1]); // 2+2+..., 1+1+... -- negative C-7
  assert.deepEqual([6, 12].map((n) => step(n, "positive")), [10, 11]); // the "or 10 + 10 ..., 11 + 11 ..." of the table
});

test("Figure 205: the binomial 3 + 2 from C runs twelve times before it returns (p.490)", () => {
  const roots = completeSymmetricProgression(60, [3, 2]);
  assert.equal(roots.length, 25);
  assert.equal(spell(roots), "C-A-G-E-D-B-A-F#-E-Db-B-Ab-F#-Eb-Db-Bb-Ab-F-Eb-C-Bb-G-F-D-C");
});

test("r(4÷3) = 3+1+2+2+1+3 closes after one cycle; r(5÷4) after three (p.490)", async () => {
  const { generateResultant } = await import("../src/core/resultant.ts");
  const r43 = generateResultant([4, 3]).segments.map((s) => s.duration);
  assert.deepEqual(r43, [3, 1, 2, 2, 1, 3]);
  assert.equal(symmetricProgressionCycleLength(r43.reduce((a, b) => a + b)), 1);
  const r54 = generateResultant([5, 4]).segments.map((s) => s.duration);
  assert.equal(symmetricProgressionCycleLength(r54.reduce((a, b) => a + b)), 3);
});

test("Figure 206: (3+1+2) and its permutations revitalize a short span, closing on C (p.491)", () => {
  const group = [[3, 1, 2], [3, 2, 1], [2, 3, 1], [1, 3, 2], [1, 2, 3], [2, 1, 3]].flat();
  const roots = chordRootProgression(60, group);
  assert.equal(spell(roots.slice(0, 7)), "C-A-Ab-F#-Eb-Db-C");
  assert.equal(spell(roots.slice(12)), "C-B-A-F#-E-Eb-C");
});

test("between Wagner and Ravel: 2(3) + 5 + 10 gives C-A-F#-C#-D#-C-A-E-F# (p.491)", () => {
  assert.equal(spell(chordRootProgression(60, [3, 3, 5, 10, 3, 3, 5, 10])), "C-A-F#-Db-Eb-C-A-E-F#");
});

test("Figure 207: the telephone number Columbus 5-7573 is C-G-C-G-C-A ..., closing after 4 cycles (p.491)", () => {
  const roots = completeSymmetricProgression(60, [5, 7, 5, 7, 3]);
  assert.equal(symmetricProgressionCycleLength(27), 4);
  assert.equal(spell(roots.slice(0, 11)), "C-G-C-G-C-A-E-A-E-A-F#");
  assert.equal(roots.length, 21);
  assert.equal(spell([roots[20]]), "C");
});

test("modulating C -> Eb through 9: 5 + 4 gives C-G-Eb, 4 + 1 + 4 gives C-Ab-G-Eb (p.492)", () => {
  assert.equal(spell(chordRootProgression(60, [5, 4])), "C-G-Eb");
  assert.equal(spell(chordRootProgression(60, [4, 1, 4])), "C-Ab-G-Eb");
});

test("C -> Bb through 14: 7 + 7 = C-F-Bb, 5 + 2 + 2 + 5 = C-G-F-Eb-Bb, and resultants readjusted to 14 (p.493)", async () => {
  const { generateResultant } = await import("../src/core/resultant.ts");
  assert.equal(modulationInterval(0, 10, true), 14);
  assert.equal(spell(chordRootProgression(60, [7, 7])), "C-F-Bb");
  assert.equal(spell(chordRootProgression(60, [5, 2, 2, 5])), "C-G-F-Eb-Bb");
  // r(4÷3) sums to 12; "readjustment" adds 2 to reach 14.
  const r43 = generateResultant([4, 3]).segments.map((s) => s.duration);
  assert.equal(spell(chordRootProgression(60, [...r43, 2])), "C-A-Ab-F#-E-Eb-C-Bb");
  // r(5÷3) sums to 15; its fourth term becomes 2.
  const r53 = generateResultant([5, 3]).segments.map((s) => s.duration);
  assert.deepEqual(r53, [3, 2, 1, 3, 1, 2, 3]);
  assert.equal(spell(chordRootProgression(60, [3, 2, 1, 2, 1, 2, 3])), "C-A-G-F#-E-Eb-Db-Bb");
});

test("modulation examples: C -> Eb by 1 + 3 + 1 + 3 + 1 (Figure 209); D -> Bb is 4, + 12 = 16 (Figure 210); tonic-dominant 5 splits 4+1, 3+2, 2+3, 1+4 (p.493-494)", () => {
  assert.equal(spell(chordRootProgression(60, [1, 3, 1, 3, 1])).split("-").at(-1), "Eb");
  assert.equal(modulationInterval(2, 10, true), 16);
  assert.deepEqual(generateCompositions(5, 2), [[1, 4], [2, 3], [3, 2], [4, 1]]);
});
