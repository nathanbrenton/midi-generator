import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIGURATION_ELEMENTS,
  CRYSTALLIZED,
  isCrystallized,
  suspension,
  triplePassingTones,
  anticipations,
  auxiliaryTone,
  auxiliaryClassification,
  directionalSequence,
} from "../src/core/melodicFiguration.ts";
import { intervalCellScale, midiNoteForDegree } from "../src/core/scales.ts";
import { generateResultant } from "../src/core/resultant.ts";
import { circularPermutations, generalPermutationsOf } from "../src/core/permutations.ts";
import { applyCoefficients } from "../src/core/symmetricHarmony.ts";
import { voiceLeadProgression, diatonicCycle } from "../src/core/diatonicHarmony.ts";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const pc = (n) => ((n % 12) + 12) % 12;
const r = (a, b) => generateResultant([a, b]).segments.map((s) => s.duration);

// Ch.20.
test("Figure 322: suspended, passing, auxiliary and anticipated tones, single to triple", () => {
  const kinds = [...new Set(FIGURATION_ELEMENTS.map((e) => e.element))];
  assert.deepEqual(kinds, ["suspended", "passing", "auxiliary", "anticipated"]);
  assert.deepEqual(FIGURATION_ELEMENTS.filter((e) => e.element === "suspended").map((e) => e.functions), ["↑7", "↑9 ↑7", "↑11 ↑9 ↑7"]);
});

test("crystallized structures: one suspended tone a prepared 7th of S(7), two the 7th and 9th of S(9), three 7th, 9th and 11th of S(11) (p.571)", () => {
  assert.deepEqual([1, 2, 3].map((n) => CRYSTALLIZED[n].tension), ["S(7)", "S(9)", "S(11)"]);
  assert.equal(isCrystallized([1, 5, 11]), false); // the old suspension, "S(11) = 1, 5, 11"
  assert.equal(isCrystallized([1, 7, 9, 11]), true);
  assert.equal(isCrystallized([1, 3, 7, 9]), true);
  assert.equal(isCrystallized([1, 5, 7, 9]), false); // Ch.19's "not the accepted form"
});

// Ch.21 A.
const SETS = [[[1], 7], [[3], 5], [[5], 3], [[1, 3], 7], [[3, 5], 5], [[5, 7], 3], [[1, 3, 5], 7], [[3, 5, 7], 5]];

test("suspensions: the held tones become 7 (9, 11) by the 'suspending' preparations -- 1, 3, 5 give C7, C5, C3 (p.573)", () => {
  for (const [held, cycle] of SETS) {
    const { preparationCycle, chords } = suspension(MAJOR, 60, 0, held, 5);
    assert.equal(preparationCycle, cycle, held.join("-"));
    const [prep, sus] = chords;
    // Held voices keep their pitch; they now sing 7, 9, 11.
    held.forEach((fn, k) => {
      const i = prep.functions.indexOf(fn);
      assert.equal(sus.upper[i], prep.upper[i]);
      assert.equal(sus.functions[i], [7, 9, 11][k]);
    });
    assert.ok(isCrystallized([1, ...sus.functions]), `${held.join("-")} at the suspension`);
  }
});

test("each suspended tone resolves a step down, 'the nearest function one step lower' (p.573)", () => {
  for (const [held] of SETS) {
    for (const cycle of held.length === 1 ? [3, 5, 7] : held.length === 2 ? [0, 3, 5, 7] : [3, 5]) {
      const [, sus, res] = suspension(MAJOR, 60, 0, held, cycle).chords;
      sus.functions.forEach((fn, i) => {
        if (fn < 7) return;
        if (cycle === 0 && fn === 7) return; // C0 resolves the ninth alone (p.460)
        const d = res.upper[i] - sus.upper[i];
        assert.ok(d === -1 || d === -2, `${held.join("-")} C${cycle}: ${fn} moved ${d}`);
      });
    }
  }
});

test("why the tonic triad acquires a tripled root and loses its fifth: c held over D, resolved by C5 (p.440, Figure 128)", () => {
  const [, , res] = suspension(MAJOR, 60, 0, [1], 5).chords;
  const pcs = [res.bass, ...res.upper].map(pc);
  assert.equal(pcs.filter((p) => p === 7).length, 3); // g three times
  assert.ok(!pcs.includes(2)); // no d
});

// Ch.21 B.
test("triple passing tones: 1, 3, 5 step down to 7, 9, 11 over the held bass -- the C0 preparation of S(11) -- then resolve (p.576)", async () => {
  const { prepareEleventh } = await import("../src/core/eleventhChords.ts");
  for (const cycle of [3, 5]) {
    const [triad, passing, resolved] = triplePassingTones(MAJOR, 60, 0, cycle);
    assert.equal(passing.bass, triad.bass);
    assert.ok(passing.upper.every((p, i) => triad.upper[i] - p >= 1 && triad.upper[i] - p <= 2));
    assert.ok(isCrystallized([1, ...passing.functions]));
    const c0 = prepareEleventh(MAJOR, 60, 0, "C0");
    assert.deepEqual(passing.upper.map(pc), c0.to.upper.map(pc));
    assert.ok(resolved.upper.every((p, i) => passing.upper[i] - p >= 1 && passing.upper[i] - p <= 2), `C${cycle}`);
  }
  assert.equal(triplePassingTones(MAJOR, 60, 0, 3)[2].bass, 60); // C3 keeps the bass: A minor over its third
});

// Ch.21 C.
test("anticipations: the next chord's function sung early, except where it is already a common tone (p.579)", () => {
  const roots = diatonicCycle(5).slice(0, 4);
  const chords = voiceLeadProgression(MAJOR, 60, roots, "clockwise").map((v) => ({ bass: v.bass, upper: [v.root, v.third, v.fifth].sort((a, b) => a - b) }));
  const rootOf = (k) => midiNoteForDegree(MAJOR, 60, roots[k]);
  const anticipated = anticipations(chords, rootOf, 3);
  anticipated.forEach((p, k) => {
    if (p === null) assert.equal(pc(chords[k].upper[2]), pc(rootOf(k + 1)));
    else assert.equal(pc(p), pc(rootOf(k + 1)));
  });
});

// Ch.22.
test("auxiliary intervals come from the scale or Σ: ↗5 on c is f#→g, i = 1, in c-d-e-f#-g-a-bb; f→g, i = 2, in c-d-e-f-g-a-bb (p.585)", () => {
  const lydianDominant = intervalCellScale([2, 2, 2, 1, 2, 1, 2]);
  const mixolydian = intervalCellScale([2, 2, 1, 2, 2, 1, 2]);
  assert.deepEqual(auxiliaryTone(lydianDominant, 60, 0, 5, "↗"), { auxiliary: 66, chordTone: 67, interval: 1 });
  assert.equal(auxiliaryTone(mixolydian, 60, 0, 5, "↗").interval, 2);
  // "We may introduce a ↗13, i = 1 (g# -> a of the c-chord), which is not in the Σ."
  assert.deepEqual(auxiliaryTone(lydianDominant, 60, 0, 13, "↗", true), { auxiliary: 80, chordTone: 81, interval: 1 }); // g#5 -> a5
});

test("in the harmonic minor the upper auxiliaries to the third and root of the minor triad are whole tones -- what listeners expect (p.584)", () => {
  const harmonicMinor = intervalCellScale([2, 1, 2, 2, 1, 3, 1]); // a b c d e f g#
  assert.equal(auxiliaryTone(harmonicMinor, 57, 0, 3, "↘").interval, 2); // d -> c
  assert.equal(auxiliaryTone(harmonicMinor, 57, 0, 1, "↘").interval, 2); // b -> a
});

test("Figure 349: single, double and triple auxiliaries over 1, 3, 5, 7 -- 8, 24 and 32 forms", () => {
  assert.deepEqual([1, 2, 3].map((n) => auxiliaryClassification(n).length), [8, 24, 32]);
  const pairs = new Set(auxiliaryClassification(2).map((f) => f.functions.join()));
  assert.equal(pairs.size, 6);
  assert.equal(auxiliaryClassification(4).length, 16);
});

test("directional units under coefficients: the three examples of p.589", () => {
  assert.deepEqual(directionalSequence([[6, 1]], r(3, 2)), ["↗1", "↗1", "↘1", "↗1", "↘1", "↘1"]);
  assert.deepEqual(
    directionalSequence(applyCoefficients([1, 3], r(3, 2)), [1, 1, 1, 1, 1, 1]),
    ["↗1", "↘1", "↗3", "↘1", "↗3", "↘3"],
  );
  assert.deepEqual(
    directionalSequence(applyCoefficients([1, 3, 5, 7, 3, 1], r(4, 3)), [1, 1, 2, 2, 2, 2, 1, 1]),
    ["↗1", "↘1", "↗1", "↗3", "↘5", "↘5", "↗7", "↗7", "↘3", "↘1", "↗1", "↘1"],
  );
});

test("the order of the parts: 24 permutations of SATB, from which the book's sequences are drawn (p.589)", () => {
  const orders = generalPermutationsOf(["S", "A", "T", "B"]).map((p) => p.join(""));
  assert.equal(orders.length, 24);
  for (const o of ["SATB", "ATBS", "TBAS", "BSAT", "BTAS", "TSAB", "ABTS"]) assert.ok(orders.includes(o), o);
  // SATB, ATBS and BSAT are rotations; TBAS (not the rotation TBSA) is the book's own choice.
  const rotations = circularPermutations([0, 1, 2, 3]).map((p) => p.map((i) => "SATB"[i]).join(""));
  assert.deepEqual(rotations, ["SATB", "ATBS", "TBSA", "BSAT"]);
  // "2 SATB + BTAS + SATB + 2 BTAS": r3÷2 over SATB and its reverse.
  assert.deepEqual(applyCoefficients(["SATB", "BTAS"], r(3, 2)), [[2, "SATB"], [1, "BTAS"], [1, "SATB"], [2, "BTAS"]]);
});

// Ch.23.
test("two readings of any scale: c-e-g-b or d-f-a-c (p.598)", async () => {
  const { chordalReadings } = await import("../src/core/melodicFiguration.ts");
  const names = "cdefgab";
  const [first, second] = chordalReadings();
  assert.equal(first.map((i) => names[i]).join("-"), "c-e-g-b");
  assert.equal(second.map((i) => names[i]).join("-"), "d-f-a-c");
});

test("Figure 357: g#-a-c-e-f-e over a, c, e -- g# the lower auxiliary to a, f the upper auxiliary to e (p.599)", async () => {
  const { analyzeMotif } = await import("../src/core/melodicFiguration.ts");
  assert.deepEqual(analyzeMotif([68, 69, 72, 76, 77, 76], [9, 0, 4]), ["lower auxiliary", "chordal", "chordal", "chordal", "upper auxiliary", "chordal"]);
  assert.deepEqual(analyzeMotif([72, 74, 76], [0, 4, 7]), ["chordal", "passing", "chordal"]);
});

test("Figure 358's seven systems; e as the ninth starts on the fifth and needs S(9); e as the seventh starts on the third (p.599)", async () => {
  const { FUNCTION_SYSTEMS, assignSystem } = await import("../src/core/melodicFiguration.ts");
  assert.equal(FUNCTION_SYSTEMS.length, 7);
  assert.deepEqual(assignSystem(2, 9), { system: [5, 7, 9], startingFunction: 5, minimumTension: "S(9)" });
  assert.equal(assignSystem(2, 7).startingFunction, 3);
  assert.equal(assignSystem(2, 5).minimumTension, "S(5)"); // (a) 1, 3, 5, "operation from the root"
});

test("neutral figuration through the parts: TABS + ABST + BSTA + STAB, the rotations of TABS (p.598)", () => {
  const rotations = circularPermutations([0, 1, 2, 3]).map((p) => p.map((i) => "TABS"[i]).join(""));
  assert.deepEqual(rotations, ["TABS", "ABST", "BSTA", "STAB"]);
});
