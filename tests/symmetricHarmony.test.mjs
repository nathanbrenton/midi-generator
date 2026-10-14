import { test } from "node:test";
import assert from "node:assert/strict";
import {
  S5_STRUCTURES,
  symmetricTriad,
  symmetricStructureProgression,
  symmetricHarmonyScale,
  SYMMETRIC_CYCLE_FOR_TONIC_COUNT,
  expandStructuralGroup,
  zeroCyclePositions,
  symmetricZeroCycle,
  diatonicSymmetricProgression,
  symmetricRoots,
  recurrenceCycles,
  symmetricProgression,
  G6_STRUCTURE_FORMS,
  S7_STRUCTURES,
  symmetricSeventhChord,
  S7_ZERO_CYCLE_CHORDS,
  applyCoefficients,
  seventhRecurrenceCycles,
} from "../src/core/symmetricHarmony.ts";
import { generalPermutations, generalPermutationsOf } from "../src/core/permutations.ts";
import { compositionCount, symmetricTonics } from "../src/core/symmetricScales.ts";
import { intervalCellScale } from "../src/core/scales.ts";

test("symmetricTriad matches the book's own table of S(5) structures exactly (p.389)", () => {
  assert.deepEqual(symmetricTriad(1, 60), [60, 64, 67]); // major: 4+3
  assert.deepEqual(symmetricTriad(2, 60), [60, 63, 67]); // minor: 3+4
  assert.deepEqual(symmetricTriad(3, 60), [60, 64, 68]); // augmented: 4+4
  assert.deepEqual(symmetricTriad(4, 60), [60, 63, 66]); // diminished: 3+3
});

test("all four structures are drawn from only 3-or-4-semitone intervals, matching the book's own stated restriction (p.388)", () => {
  for (const { intervals } of Object.values(S5_STRUCTURES)) {
    for (const interval of intervals) {
      assert.ok(interval === 3 || interval === 4);
    }
  }
});

test("symmetricStructureProgression shares the same root across all chords, matching Section B's 'common root-tone' (p.391)", () => {
  const progression = symmetricStructureProgression([1, 2, 3, 4], 60);
  for (const triad of progression) {
    assert.equal(triad[0], 60);
  }
});

// Section A's combinatorics table (p.389-390), badly garbled by OCR but
// verified exactly by hand against every one of its 8 (combinations,
// permutations-each) pairs -- pure reuse of generalPermutations/
// generalPermutationsOf (Book I Ch.9) on the 4-symbol structure alphabet.
test("trinomial with one repeated pair: 12 combinations x 3 permutations = 36 forms (p.390)", () => {
  let totalForms = 0;
  let combos = 0;
  for (let repeated = 1; repeated <= 4; repeated++) {
    for (let other = 1; other <= 4; other++) {
      if (other === repeated) continue;
      combos++;
      const perms = generalPermutations([repeated, repeated, other]);
      assert.equal(perms.length, 3);
      totalForms += perms.length;
    }
  }
  assert.equal(combos, 12);
  assert.equal(totalForms, 36);
});

test("trinomial with all different structures: 4 combinations x 6 permutations = 24 forms; total trinomials 36+24=60 (p.390)", () => {
  const structures = [1, 2, 3, 4];
  let combos = 0;
  let totalForms = 0;
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++)
      for (let k = j + 1; k < 4; k++) {
        combos++;
        const perms = generalPermutationsOf([structures[i], structures[j], structures[k]]);
        assert.equal(perms.length, 6);
        totalForms += perms.length;
      }
  assert.equal(combos, 4);
  assert.equal(totalForms, 24);
  assert.equal(36 + 24, 60); // the book's own stated trinomial total
});

test("quadrinomial 3-same+1-different: 12 combinations x 4 permutations = 48 forms (p.390)", () => {
  let combos = 0;
  let totalForms = 0;
  for (let repeated = 1; repeated <= 4; repeated++) {
    for (let other = 1; other <= 4; other++) {
      if (other === repeated) continue;
      combos++;
      const perms = generalPermutations([repeated, repeated, repeated, other]);
      assert.equal(perms.length, 4);
      totalForms += perms.length;
    }
  }
  assert.equal(combos, 12);
  assert.equal(totalForms, 48);
});

test("quadrinomial two pairs: 6 combinations x 6 permutations = 36 forms (p.390)", () => {
  const structures = [1, 2, 3, 4];
  let combos = 0;
  let totalForms = 0;
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
      combos++;
      const perms = generalPermutations([structures[i], structures[i], structures[j], structures[j]]);
      assert.equal(perms.length, 6);
      totalForms += perms.length;
    }
  assert.equal(combos, 6);
  assert.equal(totalForms, 36);
});

test("quadrinomial 1-pair+2-different-singles: 12 combinations x 12 permutations = 144 forms (p.390)", () => {
  let totalForms = 0;
  let combos = 0;
  const structures = [1, 2, 3, 4];
  for (const repeated of structures) {
    const rest = structures.filter((s) => s !== repeated);
    for (let i = 0; i < rest.length; i++)
      for (let j = i + 1; j < rest.length; j++) {
        combos++;
        const perms = generalPermutations([repeated, repeated, rest[i], rest[j]]);
        assert.equal(perms.length, 12);
        totalForms += perms.length;
      }
  }
  assert.equal(combos, 12);
  assert.equal(totalForms, 144);
});

test("quadrinomial all 4 different: 1 combination x 24 permutations = 24 forms; total quadrinomials 48+36+144+24=252 (p.390)", () => {
  const perms = generalPermutationsOf([1, 2, 3, 4]);
  assert.equal(perms.length, 24);
  assert.equal(48 + 36 + 144 + 24, 252); // the book's own stated quadrinomial total
});

test("the book's own 'the general number of three-unit scales from one axis' (55) matches compositionCount(12, 3) exactly (p.388)", () => {
  assert.equal(compositionCount(12, 3), 55);
});

// Book V Ch.5 Section A (Two Tonics, p.396-397), decoded by rendering the
// actual page since OCR mangled the formula notation.
test("symmetricHarmonyScale with S1 (major) on a 2-tonic system (C, F#) matches the book's own worked scale exactly: c-db-e-f#-g-a#(bb) (p.397)", () => {
  const tonics = symmetricTonics(2, 0); // pitch classes [0, 6] = C, F#
  const scale = symmetricHarmonyScale(tonics, 1);
  assert.deepEqual(scale, [0, 1, 4, 6, 7, 10]); // C, Db, E, F#, G, Bb/A#
});

test("symmetricHarmonyScale with S2 (minor) on a 2-tonic system matches the book's own second worked scale exactly: c-db-eb-f#-g-a (p.397)", () => {
  const tonics = symmetricTonics(2, 0);
  const scale = symmetricHarmonyScale(tonics, 2);
  assert.deepEqual(scale, [0, 1, 3, 6, 7, 9]); // C, Db, Eb, F#, G, A
});

test("symmetricHarmonyScale always belongs to the third group (its own tonics are among the scale's own pitch classes)", () => {
  const tonics = symmetricTonics(3, 0);
  for (const structure of [1, 2, 3, 4]) {
    const scale = symmetricHarmonyScale(tonics, structure);
    for (const tonic of tonics) {
      assert.ok(scale.includes(((tonic % 12) + 12) % 12));
    }
  }
});

test("symmetricHarmonyScale never has more than tonics.length * 3 pitch classes (triads may share tones across tonics)", () => {
  const tonics = symmetricTonics(4, 0);
  const scale = symmetricHarmonyScale(tonics, 3); // augmented triads are especially prone to overlap
  assert.ok(scale.length <= tonics.length * 3);
});

test("SYMMETRIC_CYCLE_FOR_TONIC_COUNT matches the book's own stated pairing exactly (p.464)", () => {
  assert.equal(SYMMETRIC_CYCLE_FOR_TONIC_COUNT[2], "C5");
  assert.equal(SYMMETRIC_CYCLE_FOR_TONIC_COUNT[3], "C3");
  assert.equal(SYMMETRIC_CYCLE_FOR_TONIC_COUNT[4], "C3");
  assert.equal(SYMMETRIC_CYCLE_FOR_TONIC_COUNT[6], "C7");
  assert.equal(SYMMETRIC_CYCLE_FOR_TONIC_COUNT[12], "C7");
});

// Ch.3 B: the symmetric zero cycle C0 (p.391, Figure 46).
const topDown = (v) => ["root", "third", "fifth"].sort((x, y) => v[y] - v[x]);
const pcsTopDown = (v) => [v.root, v.third, v.fifth].sort((x, y) => y - x).map((n) => ((n % 12) + 12) % 12);

test("C0: 3S1 + S3 + 2S2 = S1 + S1 + S1 + S3 + S2 + S2, positions var. var. const. const. var. (p.391)", () => {
  const structures = expandStructuralGroup([[3, 1], [1, 3], [2, 2]]);
  assert.deepEqual(structures, [1, 1, 1, 3, 2, 2]);
  assert.deepEqual(zeroCyclePositions(structures), ["var", "var", "const", "const", "var"]);
});

test("C0: a repeated structure changes position, a new structure keeps it; the root stays in the bass (p.391)", () => {
  const structures = expandStructuralGroup([[3, 1], [1, 3], [2, 2]]);
  const voicings = symmetricZeroCycle(structures, 60);
  zeroCyclePositions(structures).forEach((change, k) => {
    const same = topDown(voicings[k]).join() === topDown(voicings[k + 1]).join();
    assert.equal(same, change === "const", `connection ${k + 1}`);
  });
  assert.ok(voicings.every((v) => v.bass === 48));
});

test("C0: Figure 46 opens c-g-e (from the top) and moves to g-e-c; a change of structure moves only the altered tones, by a semitone", () => {
  const voicings = symmetricZeroCycle([1, 1, 2], 60);
  assert.deepEqual(pcsTopDown(voicings[0]), [0, 7, 4]);
  assert.deepEqual(pcsTopDown(voicings[1]), [7, 4, 0]);
  const moves = ["root", "third", "fifth"].map((fn) => voicings[2][fn] - voicings[1][fn]);
  assert.deepEqual(moves, [0, -1, 0]); // e -> e-flat
});

// Ch.4: the diatonic-symmetric system, Type II (p.393, Figure 47).
test("Type II: in c-d-e-f-g-a-bb, 2C7 + C3 + C5 moves the roots exactly as Figure 47 notates them, 28 roots back to c", () => {
  const scale = intervalCellScale([2, 2, 1, 2, 2, 1, 2]); // c d e f g a bb
  const { rootDegrees, chords } = diatonicSymmetricProgression(scale, 48, [[2, 7], [1, 3], [1, 5]], [[1, 1]]);
  const names = ["c", "d", "e", "f", "g", "a", "bb"];
  assert.equal(
    rootDegrees.map((d) => names[d]).join(" "),
    "c d e c f g a f bb c d bb e f g e a bb c a d e f d g a bb g",
  );
  // S1 const.: a major triad on every root, whatever the scale says -- e major brings in g#.
  assert.ok(chords.every(([r, t, f]) => t - r === 4 && f - t === 3));
  assert.deepEqual(chords[2].map((n) => n % 12), [4, 8, 11]);
});

test("Type II: a structural group repeats over the roots independently of the cycle group", () => {
  const scale = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
  const { structures } = diatonicSymmetricProgression(scale, 48, [[1, 5]], [[1, 1], [1, 2], [2, 4]]);
  assert.deepEqual(structures, [1, 2, 4, 4, 1, 2, 4]);
});

// Ch.5: the symmetric system, Type III (p.396-400).
test("Type III roots and their cycles, as tabulated on p.396: C3 runs down, C7 up a step", () => {
  const names = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const line = (n, form) => symmetricRoots(n, form).tonics.map((t) => names[t]).join("-");
  assert.equal(line(2), "C-F#");
  assert.deepEqual(symmetricRoots(2).cycles, ["C5", "C-5"]);
  assert.equal(line(3), "C-Ab-E");
  assert.equal(line(3, "negative"), "C-E-Ab");
  assert.equal(line(4), "C-A-F#-Eb");
  assert.equal(line(6), "C-D-E-F#-Ab-Bb");
  assert.equal(line(6, "negative"), "C-Bb-Ab-F#-E-D");
  assert.deepEqual(symmetricRoots(4).cycles, ["C3", "C3", "C3", "C3"]);
  assert.deepEqual(symmetricRoots(12, "negative").cycles.slice(0, 2), ["C-7", "C-7"]);
});

test("recurrence-cycles: two tonics triple for clockwise/counterclockwise and closed for const. 3; three closed and 2; four 3 and closed (p.397-399)", () => {
  const table = (n) => ["clockwise", "counterclockwise", "const3"].map((t) => recurrenceCycles(n, t));
  assert.deepEqual(table(2), [3, 3, 1]);
  assert.deepEqual(table(3), [1, 1, 2]);
  assert.deepEqual(table(4), [3, 3, 1]);
});

test("recurrence-cycles are what the voicings actually do: the original position returns on the first tonic after that many rounds", () => {
  const order = (v) => ["root", "third", "fifth"].sort((x, y) => v[y] - v[x]).join();
  for (const n of [2, 3, 4, 6, 12]) {
    for (const t of ["clockwise", "counterclockwise", "const3"]) {
      const { voicings } = symmetricProgression(60, n, [[1, 1]], t, { chords: 7 * n });
      let rounds = 1;
      while (order(voicings[rounds * n]) !== order(voicings[0])) rounds++;
      assert.equal(rounds, recurrenceCycles(n, t), `${n} tonics, ${t}`);
    }
  }
});

test("two tonics, S1 const.: the upper voice runs c-db-e-f#-g-a#, (1+3) + 2 + (1+3) + 2, and so does every other voice (p.397)", () => {
  const { voicings } = symmetricProgression(60, 2, [[1, 1]], "clockwise", { chords: 6 });
  const scale = [0, 1, 4, 6, 7, 10];
  const voice = (pick) => [...new Set(voicings.map(pick).map((n) => ((n % 12) + 12) % 12))].sort((a, b) => a - b);
  assert.deepEqual(voice((v) => Math.max(v.root, v.third, v.fifth)), scale);
  assert.deepEqual(voice((v) => Math.min(v.root, v.third, v.fifth)), scale);
});

test("a structural group interferes with the tonics: 9 structures over 2 tonics run 18 chords (p.398)", () => {
  const { tonics, structures } = symmetricProgression(60, 2, [[2, 1], [1, 2], [1, 1], [1, 2], [1, 1], [1, 2], [2, 2]], "clockwise");
  assert.equal(structures.length, 18);
  assert.deepEqual(tonics.slice(0, 3), [60, 66, 60]);
});

test("Ch.8 F: G6 in Types II/III -- S(5) and its passing S(6) share a structure, the last S(5) is free: 4² = 16 forms (p.419)", () => {
  assert.equal(G6_STRUCTURE_FORMS.length, 16);
  assert.ok(G6_STRUCTURE_FORMS.every(([first, passing]) => first === passing));
  assert.equal(new Set(G6_STRUCTURE_FORMS.map((f) => f.join())).size, 16);
});

// Ch.9 D: S(7) in the symmetric zero cycle (p.446-447).
test("the S(7) Table of Structures, as Figure 141 notates them on c", () => {
  const names = ["c", "db", "d", "eb", "e", "f", "gb", "g", "ab", "a", "bb", "b"];
  const spell = (id) => symmetricSeventhChord(id, 60).map((n) => names[n % 12]).join("-");
  assert.equal(spell(1), "c-e-g-b"); // major
  assert.equal(spell(2), "c-eb-g-bb"); // minor
  assert.equal(spell(3), "c-e-g-bb"); // large: "c-e-g-bb (4+3+3) as the most common form"
  assert.equal(spell(4), "c-eb-gb-bb"); // small
  assert.equal(spell(5), "c-eb-gb-a"); // diminished, c-eb-gb-bbb
  assert.equal(spell(6), "c-e-ab-b"); // augmented I, c-e-g#-b
  assert.equal(spell(7), "c-eb-g-b"); // augmented II
  assert.equal(S7_STRUCTURES[3].name, "large");
});

test("seven structures in C0: 5,040 permutations, 5,040 x 7 = 35,280 chords (p.446)", () => {
  assert.equal(generalPermutations([1, 2, 3, 4, 5, 6, 7]).length * 7, S7_ZERO_CYCLE_CHORDS);
  assert.equal(S7_ZERO_CYCLE_CHORDS, 35280);
});

test("Figure 142: structures S3 + S7 + S4 + S1 under the coefficients r(5÷4) give 4S3 + S7 + 3S4 + 2S1 + 2S3 + 3S7 + S4 + 4S1", async () => {
  const { generateResultant } = await import("../src/core/resultant.ts");
  const coefficients = generateResultant([5, 4]).segments.map((s) => s.duration);
  assert.deepEqual(coefficients, [4, 1, 3, 2, 2, 3, 1, 4]);
  assert.deepEqual(applyCoefficients([3, 7, 4, 1], coefficients), [
    [4, 3], [1, 7], [3, 4], [2, 1], [2, 3], [3, 7], [1, 4], [4, 1],
  ]);
});

test("S(7) in Type III: two tonics closed, three move four times, four closed, six move two times, twelve closed (p.449-451)", () => {
  assert.deepEqual([2, 3, 4, 6, 12].map(seventhRecurrenceCycles), [1, 4, 1, 2, 1]);
});
