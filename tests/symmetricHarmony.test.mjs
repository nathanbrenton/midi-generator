import { test } from "node:test";
import assert from "node:assert/strict";
import { S5_STRUCTURES, symmetricTriad, symmetricStructureProgression } from "../src/core/symmetricHarmony.ts";
import { generalPermutations, generalPermutationsOf } from "../src/core/permutations.ts";
import { compositionCount } from "../src/core/symmetricScales.ts";

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
