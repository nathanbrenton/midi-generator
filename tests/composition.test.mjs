import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reciprocatingBinomials,
  adjacentResultant,
  binomialParts,
  binomialEffect,
  resourceScales,
  thematicSequence,
  coordinate,
  subjectsOf,
  subjectTotals,
  fragmentFor,
  symmetricRecurrence,
  symmetricKeys,
  clockUnits,
  distributePeriod,
  climaxPositions,
  subjectSaturation,
  POLYTHEMATIC_EXAMPLE,
  DIAL,
  reciprocalPosition,
  zoneOf,
  stimulusFor,
  gravity,
  cellScale,
  dubbingSpeed,
  patternCombinations,
  relationClasses,
  configurationalModulation,
} from "../src/core/composition.ts";
import { generateResultant } from "../src/core/resultant.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";
import { buildCountertheme } from "../src/core/threeGenerators.ts";
import { distributivePower } from "../src/core/distributivePowers.ts";
import { circularPermutations } from "../src/core/permutations.ts";

const durations = (r) => r.segments.map((s) => s.duration);
const NAMES = ["c", "db", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const names = (ps) => ps.map((p) => NAMES[((p % 12) + 12) % 12]).join(" ");
const seq = (apps) => apps.map((a) => `${a.subject}${a.exposition}:${a.coefficient}`).join(" ");

test("Ch.5: resultants of generators a unit apart reciprocate -- r4÷3 = (3+1)(2+2)(1+3), r6÷5 adds the balanced 3+3", () => {
  for (const n of [3, 4, 5, 6, 7, 8, 9]) assert.equal(reciprocatingBinomials(adjacentResultant(n)).reciprocating, true, `r${n}÷${n - 1}`);
  assert.deepEqual(reciprocatingBinomials(adjacentResultant(4)).binomials, [[3, 1], [2, 2], [1, 3]]);
  assert.deepEqual(reciprocatingBinomials(adjacentResultant(6)).balanced, [[3, 3]]);
  assert.equal(reciprocatingBinomials([3, 2, 1, 3, 1, 2, 3]).reciprocating, false);
  assert.deepEqual([[5, 1], [1, 5], [3, 3]].map((b) => binomialEffect(b)), ["suspension", "anticipation", "balanced"]);
});

test("Figure 19: S (5+1)(4+2)(2+4)(1+5), A, T, B1 rotated, Bn (3+3) throughout", () => {
  const parts = binomialParts(adjacentResultant(6), 5).map((p) => p.map((b) => b.join("+")).join(" "));
  assert.deepEqual(parts, ["5+1 4+2 2+4 1+5", "4+2 2+4 1+5 5+1", "2+4 1+5 5+1 4+2", "1+5 5+1 4+2 2+4", "3+3 3+3 3+3 3+3"]);
});

test("Ch.9: 5 one-unit, 10 two-unit, 10 three-unit, 1 five-unit scales; the best are vI+vV, vII+vIV, vI+vIII+vV, vII+vIII+vIV", () => {
  assert.deepEqual([1, 2, 3, 5].map((k) => resourceScales(k).all.length), [5, 10, 10, 1]);
  assert.deepEqual(resourceScales(2).symmetric, [[1, 5], [2, 4]]);
  assert.deepEqual(resourceScales(3).symmetric, [[1, 3, 5], [2, 3, 4]]);
});

test("Ch.11: the four groups of thematic sequence, with the book's progressive forms", () => {
  const show = (g) => g.map((x) => (x.length > 1 ? `(${x.join("+")})` : x[0])).join(" + ");
  assert.equal(show(thematicSequence(1, 3)), "(A+B+C)");
  assert.equal(show(thematicSequence(2, 4)), "A + B + C + D + C + B + A");
  assert.equal(show(thematicSequence(3, 3)), "(A+B+C) + (B+C+A) + (C+A+B)");
  assert.equal(show(thematicSequence(4, 2)), "A + (A+B) + B");
  assert.equal(show(thematicSequence(4, 3)), "A + (A+B) + (A+B+C) + (B+C) + C");
  assert.equal(show(thematicSequence(4, 4, 1)), "A + (A+B+C) + (A+B+C+D) + (B+C+D) + D");
  assert.equal(show(thematicSequence(4, 5, 0)), "A + (A+B) + (A+B+C) + (A+B+C+D+E) + (C+D+E) + (D+E) + E");
  assert.equal(show(thematicSequence(4, 7, 0)), "A + (A+B+C) + (A+B+C+D) + (A+B+C+D+E+F+G) + (D+E+F+G) + (E+F+G) + G");
});

test("Ch.12: the book's coordinations -- r4÷3, the fractional 4÷3, r7÷4, permutation of 3+1+2+2", () => {
  assert.equal(seq(coordinate(["A"], durations(generateResultant([4, 3])))), "A1:3 A2:1 A3:2 A4:2 A5:1 A6:3");
  assert.deepEqual(durations(generateFractionedResultant(4, 3)), [3, 1, 2, 1, 1, 1, 1, 2, 1, 3]);
  assert.equal(seq(coordinate(["A", "B"], durations(generateFractionedResultant(4, 3)))), "A1:3 B1:1 A2:2 B2:1 A3:1 B3:1 A4:1 B4:2 A5:1 B5:3");
  assert.equal(coordinate(["A"], durations(generateResultant([7, 4]))).map((a) => a.coefficient).join("+"), "4+3+1+4+2+2+4+1+3+4");
  const perms = [[3, 1, 2, 2], [1, 2, 2, 3], [2, 2, 3, 1], [2, 3, 1, 2]].flat();
  assert.equal(coordinate(["A"], perms).length, 16); // "one thematic unit makes 16 appearances"
});

test("Ch.12: involution and interference -- (3+1)², (3+1)³ over A+B, 3+1 over A+B+A, (2+1+1)² over A+B+C and its circular form, 1+2+3 progressive", () => {
  assert.equal(seq(coordinate(["A"], distributivePower([3, 1], 2))), "A1:9 A2:3 A3:3 A4:1");
  assert.equal(seq(coordinate(["A", "B"], distributivePower([3, 1], 3))), "A1:27 B1:9 A2:9 B2:3 A3:9 B3:3 A4:3 B4:1");
  assert.equal(seq(coordinate(["A", "B", "A"], [3, 1])), "A1:3 B1:1 A2:3 A3:1 B2:3 A4:1");
  const square = distributivePower([2, 1, 1], 2);
  assert.equal(seq(coordinate(["A", "B", "C"], square)), "A1:4 B1:2 C1:2 A2:2 B2:1 C2:1 A3:2 B3:1 C3:1");
  assert.equal(seq(coordinate(thematicSequence(3, 3).flat(), square)), "A1:4 B1:2 C1:2 B2:2 C2:1 A2:1 C3:2 A3:1 B3:1");
  assert.equal(seq(coordinate(thematicSequence(4, 3).flat(), [1, 2, 3])), "A1:1 A2:2 B1:3 A3:1 B2:2 C1:3 B3:1 C2:2 C3:3");
});

test("Ch.12: a symmetric group fits a symmetric sequence -- A3 B1 C2 D1 E1 D1 C2 B1 A3", () => {
  const apps = coordinate(thematicSequence(2, 5).flat(), [3, 1, 2, 1, 1, 1, 2, 1, 3]);
  assert.equal(apps.map((a) => a.subject + a.coefficient).join(" "), "A3 B1 C2 D1 E1 D1 C2 B1 A3");
});

test("Ch.13: with 3+1+2 over (A+B+C) circular, each subject is maximal in a different exposition -- A1, B2, C3", () => {
  const apps = coordinate(thematicSequence(3, 3).flat(), [3, 1, 2]);
  assert.equal(seq(apps), "A1:3 B1:1 C1:2 B2:3 C2:1 A2:2 C3:3 A3:1 B3:2");
  assert.deepEqual(subjectsOf(apps), { A: 1, B: 2, C: 3 });
  assert.deepEqual([0, 4, 8].map((p) => fragmentFor(p, 9)), ["first", "middle", "last"]);
});

test("Ch.14: 3 minutes at t = 1/4 s is 720t; 4A in 90 s by 3+1+2+2 and 2B by 3+1", () => {
  assert.equal(clockUnits(180, 1 / 4), 720);
  assert.deepEqual(distributePeriod(180, [1, 2], [[1, 1, 1, 1], [1, 1]]), [[15, 15, 15, 15], [60, 60]]);
  assert.deepEqual(distributePeriod(180, [1, 1], [[1, 1, 1, 1], [1, 1]]), [[22.5, 22.5, 22.5, 22.5], [45, 45]]);
  assert.deepEqual(distributePeriod(180, [1, 1], [[3, 1, 2, 2], [3, 1]]), [[33.75, 11.25, 22.5, 22.5], [67.5, 22.5]]);
});

test("Ch.14: r(3÷4÷7) over two, three and four subjects; the totals 40, 30, 6, 8 and 24, 18, 22, 20T", () => {
  const r = durations(buildCountertheme([3, 4, 7]));
  assert.deepEqual(r, [12, 9, 3, 4, 8, 6, 6, 8, 4, 3, 9, 12]);
  assert.equal(seq(coordinate(symmetricRecurrence(["A", "B", "A", "B", "A", "B"]), r)), "A1:12 B1:9 A2:3 B2:4 A3:8 B3:6 B4:6 A4:8 B5:4 A5:3 B6:9 A6:12");
  assert.equal(coordinate(symmetricRecurrence(["A", "B", "C", "B", "C", "A"]), r).map((a) => a.subject).join(""), "ABCBCAACBCBA");
  assert.deepEqual(subjectTotals(coordinate(symmetricRecurrence(["A", "B", "C", "D", "A", "B"]), r)), { A: 40, B: 30, C: 6, D: 8 });
  assert.deepEqual(subjectTotals(coordinate(symmetricRecurrence(["A", "B", "C", "D", "C", "D"]), r)), { A: 24, B: 18, C: 22, D: 20 });
});

test("Ch.14: climaxes -- 3+1 at the last quarter, 5+3 at the sixth eighth, 2+1+1 and 3+3+2, (3+1)² over 16, (5+3)² over 64, 13+8+5+3+2+1 = 32", () => {
  assert.deepEqual(climaxPositions([3, 1]), [3 / 4]);
  assert.deepEqual(climaxPositions([5, 3]), [5 / 8]);
  assert.deepEqual(climaxPositions([2, 1, 1]), [2 / 4, 3 / 4]);
  assert.deepEqual(climaxPositions([3, 3, 2]), [3 / 8, 6 / 8]);
  assert.deepEqual(climaxPositions(distributivePower([3, 1], 2)), [9 / 16, 12 / 16, 15 / 16]);
  assert.deepEqual(distributivePower([5, 3], 2), [25, 15, 15, 9]);
  assert.equal(climaxPositions([13, 8, 5, 3, 2, 1]).length, 5);
  assert.equal([13, 8, 5, 3, 2, 1].reduce((a, b) => a + b), 32);
});

test("Ch.14 F: A, B, C of 16T with t' = t, 4t, 2t -- 256t, 64t', 128t', 64 seconds each, 160, 40, 80 attacks", () => {
  const [A, B, C] = [1, 4, 2].map((tp) => subjectSaturation(16, tp, 1 / 4, 16, 10));
  assert.deepEqual([A.unitsPerT, B.unitsPerT, C.unitsPerT], [16, 4, 8]);
  assert.deepEqual([A.totalUnits, B.totalUnits, C.totalUnits], [256, 64, 128]);
  assert.deepEqual([A.seconds, B.seconds, C.seconds], [64, 64, 64]);
  assert.deepEqual([A.attacks, B.attacks, C.attacks], [160, 40, 80]);
});

test("Ch.16: the miniature -- 28 + 42 + 28 = 98T\", ratio 2:3:2, 448t, 168t', 224t', 196 s (3'16\")", () => {
  const { periods, tPrime, secondsPerT, sequence, keys } = POLYTHEMATIC_EXAMPLE;
  const totals = Object.fromEntries(Object.entries(periods).map(([s, p]) => [s, p.reduce((a, b) => a + b)]));
  assert.deepEqual(totals, { A: 28, B: 42, C: 28 });
  assert.deepEqual([totals.A / 14, totals.B / 14, totals.C / 14], [2, 3, 2]);
  assert.deepEqual(Object.entries(totals).map(([s, T]) => (T * 16) / tPrime[s]), [448, 168, 224]);
  assert.equal((totals.A + totals.B + totals.C) * secondsPerT, 196);
  assert.deepEqual(sequence.map((g) => g.join("")), thematicSequence(4, 3).map((g) => g.join("")));
  assert.deepEqual(keys, symmetricKeys(["C", "E", "G"]));
});

test("Ch.17: the dial -- reciprocal pairs across the vertical axis, zones, and the stimulus for a displaced balance", () => {
  const byName = Object.fromEntries(DIAL.map((d) => [d.name, d.angle]));
  const pair = (a, b) => assert.equal(reciprocalPosition(byName[a]), byName[b]);
  pair("subnormal", "supernormal");
  pair("infranormal", "ultranormal");
  pair("subnatural", "supernatural");
  pair("normal", "abnormal");
  assert.deepEqual([135, 180, 225].map(zoneOf), ["negative", "axis", "positive"]);
  assert.equal(stimulusFor(150), 210);
  assert.equal(stimulusFor(210), 150);
});

test("Ch.18: gravity and the zones' scales -- (1+2), (1+5), (1+3), (3+3+5) lower; (4+3), (3+1), (4+1), (6+2+1+1) upper", () => {
  assert.equal(names(cellScale([1, 2], 9)), "c db eb e f# g a bb c");
  assert.equal(names(cellScale([1, 5], 5)), "c db f# g c");
  assert.equal(names(cellScale([1, 3], 7)), "c db e f ab a c");
  assert.equal(names(cellScale([3, 3, 5], 8)), "c eb f# b d f bb db");
  assert.equal(names(cellScale([3, 1], 7)), "c eb e g ab b c");
  assert.equal(names(cellScale([4, 1], 11)), "c e f a bb d eb g ab c db");
  for (const c of [[1, 2], [1, 5], [3, 8], [1, 3], [3, 3, 5], [1, 1, 2, 6], [3, 3, 4], [4, 6, 5], [4, 5, 6]]) assert.equal(gravity(c), "lower", c.join("+"));
  for (const c of [[4, 3], [5, 4], [3, 1], [4, 1], [8, 3], [3, 1, 1], [5, 3, 3], [6, 2, 1, 1], [4, 4, 3], [6, 5, 4]]) assert.equal(gravity(c), "upper", c.join("+"));
  assert.equal(gravity([4, 3, 4]), "balanced");
});

test("Ch.18: re-dubbed records -- twice is about 1/5 of the speed, three times about 1/13", () => {
  assert.equal(Math.round(1 / dubbingSpeed(2)), 5);
  assert.equal(Math.round(1 / dubbingSpeed(3)), 13);
});

test("Ch.19: 8 + 28 + 56 + 70 + 56 + 28 + 8 = 254, with all eight 255; 16 relations; r5÷4 modulates a to b", () => {
  const { byCount, total } = patternCombinations();
  assert.deepEqual(byCount, [8, 28, 56, 70, 56, 28, 8, 1]);
  assert.equal(total - 1, 254);
  assert.equal(total, 255);
  assert.equal(relationClasses().length, 16);
  assert.equal(configurationalModulation(durations(generateResultant([5, 4]))).map((m) => `${m.count}${m.pattern}`).join(" + "), "4a + 1b + 3a + 2b + 2a + 3b + 1a + 4b");
});

test("Ch.15 D, Study in Rhythm I: roots falling 4+3+3+4+3+4+4+4+3+4+4 from F give the book's twelve chords; (a+b+b+a)+(b+a+a+b)+(b+a+a+b) of 7 fills 12 bars of 7/8", () => {
  const steps = [4, 3, 3, 4, 3, 4, 4, 4, 3, 4, 4];
  const roots = steps.reduce((acc, s) => [...acc, acc[acc.length - 1] - s], [5]);
  const SPELL = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  assert.equal(roots.map((r) => SPELL[((r % 12) + 12) % 12]).join(" + "), "F + Db + Bb + G + Eb + C + Ab + E + C + A + F + Db");
  const a = [4, 2, 1], b = [2, 1, 4];
  const subject = [a, b, b, a, b, a, a, b, b, a, a, b].flat();
  assert.equal(subject.reduce((x, y) => x + y), 12 * 7);
});

test("Ch.15 E, Study in Rhythm II: seven circular permutations of r5÷3 in two parts -- 7·15·2 = 210t, 14 bars of 15t", () => {
  const r = durations(generateResultant([5, 3]));
  const rotations = circularPermutations(r);
  assert.equal(rotations.length, 7);
  assert.deepEqual(rotations[1], [2, 1, 3, 1, 2, 3, 3]);
  const total = rotations.flat().reduce((x, y) => x + y) * 2;
  assert.equal(total, 210);
  assert.equal(total / 15, 14);
});

test("Ch.16: the book prints the total as 96·2 = 196; its own sum is 98T\", and 98·2 = 196", () => {
  const total = Object.values(POLYTHEMATIC_EXAMPLE.periods).flat().reduce((a, b) => a + b);
  assert.equal(total, 98);
  assert.notEqual(96 * 2, 196);
  assert.equal(total * 2, 196);
});
