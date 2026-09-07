import { test } from "node:test";
import assert from "node:assert/strict";
import { availableSeventhQualities, symmetricPassingSeventhProgression } from "../src/core/passingSeventh.ts";

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
