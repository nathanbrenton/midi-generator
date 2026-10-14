import { test } from "node:test";
import assert from "node:assert/strict";
import { availableSeventhQualities, symmetricPassingSeventhProgression, passingSeventhContinuity, chromaticUnitsPerChord } from "../src/core/passingSeventh.ts";
import { intervalCellScale } from "../src/core/scales.ts";

function pc(n) {
  return ((n % 12) + 12) % 12;
}

test("availableSeventhQualities: 3 tonics offers major/minor/diminished, 4 tonics offers major/minor only (p.534-535)", () => {
  assert.deepEqual(availableSeventhQualities(3), ["major", "minor", "diminished"]);
  assert.deepEqual(availableSeventhQualities(4), ["major", "minor"]);
});

test("symmetricPassingSeventhProgression's root sequence matches the book's own 3-tonic worked example exactly: C-E-Ab (p.535)", () => {
  const progression = symmetricPassingSeventhProgression(3, 1, "major", 60);
  assert.deepEqual(progression.map((c) => pc(c.root)), [0, 4, 8]); // C, E, Ab
});

test("symmetricPassingSeventhProgression's root sequence matches the book's own 4-tonic worked example exactly: C-Eb-F#-A (p.535)", () => {
  const progression = symmetricPassingSeventhProgression(4, 1, "major", 60);
  assert.deepEqual(progression.map((c) => pc(c.root)), [0, 3, 6, 9]); // C, Eb, F#, A
});

test("each passing-seventh chord's own seventh sits the chosen interval above its root", () => {
  const major = symmetricPassingSeventhProgression(3, 1, "major", 60);
  const minor = symmetricPassingSeventhProgression(3, 1, "minor", 60);
  const diminished = symmetricPassingSeventhProgression(3, 1, "diminished", 60);
  assert.equal(major[0].seventh - major[0].root, 11);
  assert.equal(minor[0].seventh - minor[0].root, 10);
  assert.equal(diminished[0].seventh - diminished[0].root, 9);
});

// Figures 254-255 (p.531).
const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const NAMES = ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const name = (n) => NAMES[((n % 12) + 12) % 12];

test("Figure 254: C3 constant -- C Am F Dm B° G Em C over a bass walking down two octaves, c b a g f e d c b a g f e d c", () => {
  const { chords, rootDegrees, bass } = passingSeventhContinuity(MAJOR, 60);
  assert.deepEqual(rootDegrees.map((d) => "cdefgab"[d]).join(""), "cafdbgec");
  assert.equal(bass.map(name).join(" "), "c b a g f e d c b a g f e d c");
  assert.equal(bass[0] - bass[14], 24);
  // Two beats a chord: the root, then the passing seventh, which is the next chord's... root a step lower.
  rootDegrees.forEach((_, j) => {
    assert.equal(name(bass[2 * j]), name(chords[j].root), `chord ${j}: root in the bass`);
    if (j < rootDegrees.length - 1) {
      const seventh = MAJOR.degrees[(rootDegrees[j] + 6) % 7];
      assert.equal(name(bass[2 * j + 1]), name(seventh), `chord ${j}: the passing note is the chord's own seventh`);
      assert.equal(name(bass[2 * j + 2]), name(chords[j + 1].root), `chord ${j}: and it resolves to the next root`);
    }
  });
});

test("Figure 255: read backwards, the bass ascends, the cycle is C-3 and the transformation counterclockwise", () => {
  const { rootDegrees, bass, chords } = passingSeventhContinuity(MAJOR, 60, "ascending");
  assert.deepEqual(rootDegrees.map((d) => "cdefgab"[d]).join(""), "cegbdfac");
  assert.equal(bass.map(name).join(" "), "c d e f g a b c d e f g a b c");
  rootDegrees.forEach((_, j) => assert.equal(name(bass[2 * j]), name(chords[j].root)));
  // C-3 under counterclockwise holds two tones at every step, as Ch.2 F says.
  for (let j = 1; j < chords.length; j++) {
    const before = [chords[j - 1].root, chords[j - 1].third, chords[j - 1].fifth];
    const held = [chords[j].root, chords[j].third, chords[j].fifth].filter((n) => before.includes(n));
    assert.ok(held.length >= 2, `chord ${j}`);
  }
});

test("Figure 276: chromatic units per chord -- 12, 6, 4, 3, 2, 1 for one to twelve tonics (p.539)", () => {
  assert.deepEqual([1, 2, 3, 4, 6, 12].map(chromaticUnitsPerChord), [12, 6, 4, 3, 2, 1]);
});

test("Section C: every structure classified so far is built of 3s and 4s, so an altered chord with a 2 is new (p.543)", async () => {
  const { S5_STRUCTURES, S7_STRUCTURES } = await import("../src/core/symmetricHarmony.ts");
  for (const { intervals } of [...Object.values(S5_STRUCTURES), ...Object.values(S7_STRUCTURES)]) {
    assert.ok(intervals.every((i) => i === 3 || i === 4));
  }
});
