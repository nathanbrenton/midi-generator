import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accidentalInKey,
  majorTonic,
  minorTonic,
  spell,
  pitchClass,
  triadOnLetter,
  commonNameChord,
  allCommonNameChords,
  KEY_SIGNATURE_SCALE,
  scalewiseModulation,
} from "../src/core/chromaticModulation.ts";

const chord = (notes) => notes.map(spell).join("-");

test("key signatures name their keys: 0 C, -3 Eb, +6 F#, -7 Cb, +8 G# (with f##)", () => {
  assert.deepEqual([0, -3, 6, -7, 8].map((s) => spell(majorTonic(s))), ["C", "Eb", "F#", "Cb", "G#"]);
  assert.deepEqual([0, -3, 4].map((s) => spell(minorTonic(s))), ["A", "C", "C#"]);
  assert.equal(accidentalInKey("F", 8), 2);
});

test("Figure 247: the scale of key signatures, seven flats through zero to seven sharps", () => {
  assert.equal(KEY_SIGNATURE_SCALE.length, 15);
  assert.deepEqual(KEY_SIGNATURE_SCALE[0], { signature: -7, major: "Cb", minor: "ab" });
  assert.deepEqual(KEY_SIGNATURE_SCALE[7], { signature: 0, major: "C", minor: "a" });
  assert.deepEqual(KEY_SIGNATURE_SCALE[14], { signature: 7, major: "C#", minor: "a#" });
});

test("C to Eb: seven modulations, one per name; the C chord is I in C and vi in Eb, respelled c-eb-g (Figure 246)", () => {
  const all = allCommonNameChords(0, -3);
  assert.equal(all.length, 7);
  const c = commonNameChord("C", 0, -3);
  assert.equal(chord(c.from), "C-E-G");
  assert.equal(chord(c.to), "C-Eb-G");
  assert.deepEqual(c.degrees, [1, 6]);
  assert.deepEqual(c.altered, ["E"]);
  // "A common chord may be established on any degree of the preceding key -- which, in turn,
  // corresponds to a certain degree of the following key": the shift is the same for every name.
  assert.ok(all.every(({ degrees: [a, b] }) => (a - b + 7) % 7 === 2));
});

test("when every name of the common chord keeps its pitch, the modulation is diatonic -- a special case (p.520)", () => {
  const g = commonNameChord("G", 0, -3); // g-b-d in C, g-bb-d in Eb: not diatonic
  assert.equal(g.diatonic, false);
  const f = commonNameChord("F", 0, -3); // f-a-c in C, f-ab-c in Eb
  assert.equal(f.diatonic, false);
  const cInG = commonNameChord("C", 0, 1); // c-e-g in both C and G: diatonic
  assert.equal(cInG.diatonic, true);
  assert.deepEqual(cInG.degrees, [1, 4]);
});

test("an extended modulation, C to G# with common chord A: every name altered, a-c-e to a#-c#-e# (p.522)", () => {
  const a = commonNameChord("A", 0, 8);
  assert.equal(chord(a.to), "A#-C#-E#");
  assert.deepEqual(a.altered, ["A", "C", "E"]);
  assert.deepEqual(triadOnLetter("A", 8).map(pitchClass), [10, 1, 5]);
  assert.equal(chord(triadOnLetter("F", 8)), "F##-A#-C#"); // the eighth sharp doubles f
});

test("Figure 248: the academic Db major to E major runs scalewise through the signatures, majors and minors alternating", () => {
  assert.deepEqual(scalewiseModulation(-5, 4), ["Db", "f", "Eb", "g", "F", "a", "G", "b", "A", "E"]);
});
