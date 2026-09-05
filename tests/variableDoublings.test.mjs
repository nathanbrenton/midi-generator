import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VARIABLE_DOUBLING_FORMS,
  INVERSION_DOUBLING_FORMS,
  upperVoiceFunctions,
  doublingPositions,
  positionCount,
  buildDoublingVoicing,
} from "../src/core/variableDoublings.ts";

test("VARIABLE_DOUBLING_FORMS (Ch.6, S(5)) matches the book's own comparative table exactly (p.401)", () => {
  assert.deepEqual(VARIABLE_DOUBLING_FORMS[1].upperVoiceFunctions, [1, 3, 5]);
  assert.deepEqual(VARIABLE_DOUBLING_FORMS[3].upperVoiceFunctions, [3, 3, 5]);
  assert.deepEqual(VARIABLE_DOUBLING_FORMS[5].upperVoiceFunctions, [3, 5, 5]);
});

test("S(5)③ and S(5)⑤ each have exactly 3 positions, matching the book's own explicit claim (p.401)", () => {
  assert.equal(positionCount(VARIABLE_DOUBLING_FORMS[3]), 3);
  assert.equal(positionCount(VARIABLE_DOUBLING_FORMS[5]), 3);
});

test("S(5)① has 6 positions -- unstated in prose, but the general-permutations count of 3 distinct values, matching Figure 57's own six columns", () => {
  assert.equal(positionCount(VARIABLE_DOUBLING_FORMS[1]), 6);
});

test("doublingPositions never produces a duplicate ordering", () => {
  for (const form of Object.values(VARIABLE_DOUBLING_FORMS)) {
    const positions = doublingPositions(form);
    const unique = new Set(positions.map((p) => p.join(",")));
    assert.equal(unique.size, positions.length);
  }
});

test("every position keeps the same multiset of functions as its doubling form", () => {
  for (const form of Object.values(VARIABLE_DOUBLING_FORMS)) {
    const expected = [...form.upperVoiceFunctions].sort();
    for (const position of doublingPositions(form)) {
      assert.deepEqual([...position].sort(), expected);
    }
  }
});

test("buildDoublingVoicing keeps the root in the bass for S(5) forms and stacks the upper voices strictly ascending", () => {
  const voicing = buildDoublingVoicing(VARIABLE_DOUBLING_FORMS[3], [3, 3, 5], 60, { third: 4, fifth: 7 });
  assert.equal(voicing.bass, 60);
  assert.equal(voicing.upper.length, 3);
  for (let i = 1; i < voicing.upper.length; i++) {
    assert.ok(voicing.upper[i] > voicing.upper[i - 1]);
  }
  assert.ok(voicing.upper.every((note) => note > voicing.bass));
});

test("buildDoublingVoicing reproduces the correct pitch classes for a C major S(5)① voicing", () => {
  const voicing = buildDoublingVoicing(VARIABLE_DOUBLING_FORMS[1], [1, 3, 5], 60, { third: 4, fifth: 7 });
  const pitchClasses = voicing.upper.map((n) => n % 12);
  assert.deepEqual(pitchClasses, [0, 4, 7]); // C, E, G
});

// Book V Ch.7 (Inversions of the S(5) Chord, p.406-407): S(6) fixes the
// third in the bass instead of the root -- confirmed by rendering the
// page and hand-deriving upperVoiceFunctions for every (doubled, bass)
// combination before writing any of this.
test("INVERSION_DOUBLING_FORMS (Ch.7, S(6)) fixes the third in the bass for every doubling choice (p.406)", () => {
  assert.equal(INVERSION_DOUBLING_FORMS[1].bassFunction, 3);
  assert.equal(INVERSION_DOUBLING_FORMS[3].bassFunction, 3);
  assert.equal(INVERSION_DOUBLING_FORMS[5].bassFunction, 3);
});

test("S(6)① is literally S(5)①'s own four pitches with a 3 in the bass instead of a 1 (p.407, 'identical with S(5) positions, except bass has constant 3')", () => {
  const s5Full = [VARIABLE_DOUBLING_FORMS[1].bassFunction, ...VARIABLE_DOUBLING_FORMS[1].upperVoiceFunctions].sort();
  const s6Full = [INVERSION_DOUBLING_FORMS[1].bassFunction, ...INVERSION_DOUBLING_FORMS[1].upperVoiceFunctions].sort();
  assert.deepEqual(s5Full, s6Full);
  assert.deepEqual(s5Full, [1, 1, 3, 5]);
});

test("the doubling-form <-> position-count pairing flips between Ch.6 and Ch.7: S(6)① and S(6)⑤ get 3 positions, S(6)③ gets 6 (p.406-407)", () => {
  assert.equal(positionCount(INVERSION_DOUBLING_FORMS[1]), 3);
  assert.equal(positionCount(INVERSION_DOUBLING_FORMS[5]), 3);
  assert.equal(positionCount(INVERSION_DOUBLING_FORMS[3]), 6);
});

test("upperVoiceFunctions always omits exactly one instance of the bass function from the full 4-voice chord", () => {
  for (const bass of [1, 3]) {
    for (const doubled of [1, 3, 5]) {
      const upper = upperVoiceFunctions(doubled, bass);
      assert.equal(upper.length, 3);
      const full = [...upper, bass].sort();
      assert.deepEqual(full, [1, 3, 5, doubled].sort());
    }
  }
});

test("buildDoublingVoicing puts the third in the bass for an S(6) voicing -- a real first-inversion triad", () => {
  const voicing = buildDoublingVoicing(INVERSION_DOUBLING_FORMS[3], [1, 3, 5], 60, { third: 4, fifth: 7 });
  assert.equal(voicing.bass, 64); // C major's third, E4
});
