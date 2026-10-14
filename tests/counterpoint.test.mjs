import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHROMATIC_INTERVALS,
  bySonority,
  tendencyOf,
  resolutions,
  resolutionOrders,
  correlationType,
  rootsConsonant,
  harmonicPatterns,
  expositionVariants,
  positionRelation,
  balanceOf,
  axialCombinationCounts,
  balanceForms,
  axesForBalance,
} from "../src/core/counterpoint.ts";

// Ch.1.
test("chromatic intervals by sonority, as p.702 lists them", () => {
  const sounds = Object.fromEntries(CHROMATIC_INTERVALS.map((c) => [c.name, bySonority(c.semitones)?.name ?? "none"]));
  assert.deepEqual(sounds, {
    "augmented unison": "minor 2nd",
    "augmented 2nd": "minor 3rd",
    "augmented 3rd": "perfect 4th",
    "augmented 4th": "none",
    "augmented 5th": "minor 6th",
    "augmented 6th": "minor 7th",
    "diminished octave": "major 7th",
    "diminished 7th": "major 6th",
    "diminished 6th": "perfect 5th",
    "diminished 5th": "none",
    "diminished 4th": "major 3rd",
    "diminished 3rd": "major 2nd",
  });
});

test("'actually consonances by sonority: the augmented 2nd, 3rd, 5th; the diminished 7th, 6th, 4th' (p.702)", () => {
  const consonant = CHROMATIC_INTERVALS.filter((c) => bySonority(c.semitones)?.consonant).map((c) => c.name);
  assert.deepEqual(consonant, ["augmented 2nd", "augmented 3rd", "augmented 5th", "diminished 7th", "diminished 6th", "diminished 4th"]);
});

test("2nds expand, 7ths and 9ths contract, 4ths and 5ths are neutral (p.703)", () => {
  assert.deepEqual([1, 2, 10, 11, 13, 14, 5, 7].map(tendencyOf), ["expand", "expand", "contract", "contract", "contract", "contract", "neutral", "neutral"]);
});

test("a major 2nd has twelve resolutions -- not the usual four: 24 orders against 479,001,600 (p.702)", () => {
  const r = resolutions(2);
  assert.equal(r.length, 12);
  assert.equal(r.filter((x) => x.leap).length, 4);
  assert.ok(r.every((x) => x.result > 2)); // all expand
  assert.ok(r.filter((x) => !x.leap).every((x) => Math.abs(x.lower) <= 2 && Math.abs(x.upper) <= 2));
  assert.deepEqual([resolutionOrders(4), resolutionOrders(12)], [24, 479001600]);
});

test("sevenths are 2nds inverted: a minor 7th contracts as a major 2nd expands (p.703)", () => {
  assert.equal(resolutions(10).length, 12);
  assert.ok(resolutions(10).every((x) => x.result < 10));
});

// Ch.2.
test("four types of harmonic correlation: c Ionian with a Aeolian is unitonal-polymodal (p.709-711)", () => {
  const ionian = [0, 2, 4, 5, 7, 9, 11];
  const aeolian = [0, 2, 3, 5, 7, 8, 10];
  assert.equal(correlationType(0, ionian, 0, ionian), "unitonal-unimodal");
  assert.equal(correlationType(0, ionian, 9, aeolian), "unitonal-polymodal");
  assert.equal(correlationType(0, ionian, 8, ionian), "polytonal-unimodal"); // c and a♭
  assert.equal(correlationType(0, ionian, 8, aeolian), "polytonal-polymodal");
  assert.ok(rootsConsonant(0, 8) && rootsConsonant(0, 9) && !rootsConsonant(0, 2));
});

test("c/d patterns: the book's lists for 2, 3 and 4 attacks are those with at most two dissonances -- 4, 7, 11 (p.711-716)", () => {
  assert.deepEqual(harmonicPatterns(2), ["cc", "cd", "dc", "dd"]);
  assert.deepEqual(new Set(harmonicPatterns(3)), new Set(["ccc", "cdc", "dcc", "ccd", "dcd", "ddc", "cdd"]));
  assert.deepEqual(
    new Set(harmonicPatterns(4)),
    new Set(["cccc", "cccd", "ccdc", "cdcc", "dccc", "ccdd", "cddc", "ddcc", "dccd", "cdcd", "dcdc"]),
  );
});

// Ch.4.
test("eight variants of a two-part exposition; the six relations of positions as p.749 states them", () => {
  assert.equal(expositionVariants().length, 8);
  const rel = (x, y) => Object.values(positionRelation(x, y)).join("/");
  assert.equal(rel("a", "b"), "identical/converse");
  assert.equal(rel("c", "d"), "identical/converse");
  assert.equal(rel("a", "d"), "converse/identical");
  assert.equal(rel("a", "c"), "converse/converse");
  assert.equal(rel("b", "c"), "converse/identical");
  assert.equal(rel("b", "d"), "converse/converse");
});

test("a symmetric scale keeps its structure in every position: c-e♭-f-g-b♭, 3+2+2+3 (p.749)", async () => {
  const { invertPitch } = await import("../src/core/geometricalInversions.ts");
  const scale = [60, 63, 65, 67, 70];
  const steps = (s) => s.slice(1).map((p, i) => Math.abs(p - s[i]));
  const d = scale.map((p) => invertPitch(p, 60));
  assert.deepEqual(d.map((p) => ((p % 12) + 12) % 12), [0, 9, 7, 5, 2]); // c a g f d
  assert.deepEqual(steps(d), [3, 2, 2, 3]);
  assert.deepEqual(steps([...scale].reverse()), [3, 2, 2, 3]);
});

// Ch.5.
test("axial combinations against a monomial: 200 binomial, 600 trinomial (p.754-756)", () => {
  assert.deepEqual(axialCombinationCounts(), { binomial: 200, trinomial: 600 });
  assert.deepEqual(["0", "a", "b", "c", "d"].map(balanceOf), ["0", "U", "B", "B", "U"]);
});

test("forms of balance: 12 + 15 for a binomial against a monomial, 54 + 18 = 72 for a trinomial (p.755-756)", () => {
  const two = balanceForms(2);
  assert.equal(two.withoutZero, 12);
  assert.equal(two.withZero, 15);
  const three = balanceForms(3);
  assert.equal(three.forms.length, 72);
  const allDifferent = three.forms.filter((f) => new Set(f.slice(0, 3)).size === 3).length;
  assert.deepEqual([three.forms.length - allDifferent, allDifferent], [54, 18]);
});

test("U + 0 + B against U: a or d, 0, b or c, against a or d -- eight solutions (p.756-757)", () => {
  const cp = axesForBalance(["U", "0", "B"]);
  const cf = axesForBalance(["U"]);
  assert.equal(cp.length * cf.length, 8);
  assert.deepEqual(cp.map((x) => x.join("+")), ["a+0+b", "a+0+c", "d+0+b", "d+0+c"]);
});

// Ch.9-12.
test("seven forms of exposition: every non-empty combination of M_I, M_II and H (p.824, 843)", async () => {
  const { expositionCombinations } = await import("../src/core/counterpoint.ts");
  const forms = expositionCombinations().map((f) => f.join("+"));
  assert.equal(forms.length, 7);
  assert.ok(forms.includes("MI") && forms.includes("H") && forms.includes("MI+MII+H"));
});

test("35 modal relations (7C3) and 21 two-part melodizations (7C2) (p.825)", async () => {
  const { modalRelations } = await import("../src/core/counterpoint.ts");
  assert.deepEqual(modalRelations(), { threeParts: 35, twoMelodies: 21 });
});

test("three synchronized powers of 2 + 1 + 1: 27, 9 and 3 attacks; M_I's groups sum to M_II, M_II's to H (p.841-842)", async () => {
  const { threePowerSynchronization } = await import("../src/core/counterpoint.ts");
  const { mI, mII, h } = threePowerSynchronization([2, 1, 1]);
  assert.deepEqual([mI.length, mII.length, h.length], [27, 9, 3]);
  assert.deepEqual(mI.slice(0, 9), [8, 4, 4, 4, 2, 2, 4, 2, 2]);
  assert.deepEqual(mII.slice(0, 3), [16, 8, 8]);
  assert.deepEqual(h, [32, 16, 16]);
  const groupSums = (xs) => Array.from({ length: xs.length / 3 }, (_, k) => xs[3 * k] + xs[3 * k + 1] + xs[3 * k + 2]);
  assert.deepEqual(groupSums(mI), mII);
  assert.deepEqual(groupSums(mII), h);
});

test("Figure 127: r5÷4 attacks of M_I per M_II, two M_II per chord, durations r̲4÷3 -- M_II 7t, t, 4t ..., every chord 8t (p.840-841)", async () => {
  const { chordDurations } = await import("../src/core/melodicAttackGroups.ts");
  const { generateResultant } = await import("../src/core/resultant.ts");
  const { generateFractionedResultant } = await import("../src/core/fractioning.ts");
  const mII = chordDurations(generateResultant([5, 4]).segments.map((s) => s.duration), generateFractionedResultant(4, 3).segments.map((s) => s.duration)).perChord;
  assert.deepEqual(mII, [7, 1, 4, 4, 4, 4, 1, 7]);
  assert.deepEqual(chordDurations([2, 2, 2, 2], mII).perChord, [8, 8, 8, 8]);
});

test("an ostinato against a counterpart of another length meets it again after lcm bars: 4 against 3 is 12 (p.878)", async () => {
  const { ostinatoCycle } = await import("../src/core/counterpoint.ts");
  assert.deepEqual(ostinatoCycle(4, 3), { bars: 12, ostinatoRepeats: 3, counterpartRepeats: 4 });
});
