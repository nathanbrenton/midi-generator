import { test } from "node:test";
import assert from "node:assert/strict";
import { SIGMA_13, sigmaScale, sigmaStyles, sigmaSubstructure } from "../src/core/masterStructures.ts";

const byRoman = (r) => SIGMA_13.find((s) => s.roman === r);

test("Figure 27: 36 master-structures -- six thirds of 3 or 4 semitones, seven different pitch classes (p.654)", () => {
  assert.equal(SIGMA_13.length, 36);
  assert.equal(SIGMA_13[35].roman, "XXXVI");
  assert.ok(SIGMA_13.every((s) => s.thirds.every((t) => t === 3 || t === 4)));
});

test("the accidentals of Figure 27 as printed, row by row", () => {
  const acc = (r) => byRoman(r).spelled.split(" ").filter((n) => n.length > 1).join(" ");
  // Row 1: lower major S(7).
  assert.deepEqual(["I", "II", "III", "IV", "V", "VI"].map(acc), ["f♯", "", "f♯ a♯", "a♭", "d♯ f♯ a♯", "d♯ f♯"]);
  // Row 2: lower minor.
  assert.deepEqual(["VII", "VIII", "IX", "X", "XI", "XII"].map(acc), ["e♭ b♭ f♯", "e♭ b♭", "e♭ b♭ a♭", "e♭ b♭ d♭ a♭", "e♭ b♭ d♭ f♭ a♭", "e♭ b♭ d♭"]);
  // Row 3: large (XIII-XVII), small begins.
  assert.deepEqual(["XIII", "XIV", "XV", "XVI", "XVII", "XVIII"].map(acc), ["b♭ f♯", "b♭", "b♭ a♭", "b♭ d♭ a♭", "b♭ d♭", "e♭ g♭ b♭"]);
  assert.equal(acc("XXIII"), "e♭ g♭ b♭ d♭ f♭ a♭♭"); // the double flat of the figure
  assert.equal(acc("XXX"), "g♯ d♯ f♯♯ a♯"); // and its double sharp
  assert.deepEqual(["XXXIII", "XXXIV", "XXXV", "XXXVI"].map(acc), ["e♭ f♯", "e♭", "e♭ f♯ a♯", "e♭ a♭"]);
});

test("XIII is 'a large S(7) and a major S(5)', the Σ c-d-e-f♯-g-a-b♭ of p.585; II is the natural major (p.657)", () => {
  const xiii = byRoman("XIII");
  assert.equal(xiii.spelled, "c e g b♭ d f♯ a");
  assert.deepEqual([xiii.lower, xiii.upper], ["large", "major"]);
  assert.deepEqual(sigmaScale(xiii), [0, 2, 4, 6, 7, 9, 10]);
  assert.deepEqual(sigmaScale(byRoman("II")), [0, 2, 4, 5, 7, 9, 11]);
});

test("the 36 scales of Book V Ch.1 and Ch.14: all different, 36 x 7 = 252 with their modes (p.359, 521)", () => {
  assert.equal(new Set(SIGMA_13.map((s) => sigmaScale(s).join())).size, 36);
  assert.equal(SIGMA_13.length * 7, 252);
});

test("36, 36² = 1,296 and 36³ = 46,656 styles (p.655)", () => {
  assert.deepEqual([1, 2, 3].map(sigmaStyles), [36, 1296, 46656]);
});

test("substructures of XIII on c: S(7) the large c-e-g-b♭, S(11) c-b♭-d-f♯ (p.655)", () => {
  const xiii = byRoman("XIII");
  assert.deepEqual(sigmaSubstructure(xiii, 7, 60), [60, 64, 67, 70]);
  assert.deepEqual(sigmaSubstructure(xiii, 11, 60), [60, 70, 74, 78]);
});
