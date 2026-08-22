import { test } from "node:test";
import assert from "node:assert/strict";
import { expandPitch, expandTime, geometricalExpansion } from "../src/core/geometricalExpansions.ts";
import { geometricalPosition } from "../src/core/geometricalInversions.ts";

// c-d-e-f-g -> c-e-g#-a#-d under a 2p expansion around axis c (p.208 footnote).
const CDEFG = [
  { midiNote: 60, startUnits: 0, durationUnits: 1 }, // c
  { midiNote: 62, startUnits: 1, durationUnits: 1 }, // d
  { midiNote: 64, startUnits: 2, durationUnits: 1 }, // e
  { midiNote: 65, startUnits: 3, durationUnits: 1 }, // f
  { midiNote: 67, startUnits: 4, durationUnits: 1 }, // g
];

test("expandPitch matches the book's own worked example exactly: c-d-e-f-g becomes c-e-g#-a#-d under 2p (p.208)", () => {
  const expanded = expandPitch(CDEFG, 60, 2);
  assert.deepEqual(
    expanded.map((n) => n.midiNote),
    [60, 64, 68, 70, 74], // c, e, g#, a#, d(+octave)
  );
});

test("expandPitch with coefficient 1 is the identity", () => {
  const expanded = expandPitch(CDEFG, 60, 1);
  assert.deepEqual(expanded.map((n) => n.midiNote), CDEFG.map((n) => n.midiNote));
});

test("expandPitch leaves the axis note itself unchanged, regardless of coefficient", () => {
  const expanded = expandPitch(CDEFG, 60, 5);
  assert.equal(expanded[0].midiNote, 60);
});

test("expandPitch with a fractional coefficient contracts rather than expands, and undoes a matching expansion", () => {
  const expanded = expandPitch(CDEFG, 60, 2);
  const contracted = expandPitch(expanded, 60, 0.5);
  assert.deepEqual(
    contracted.map((n) => n.midiNote),
    CDEFG.map((n) => n.midiNote),
  );
});

test("expandPitch leaves timing untouched", () => {
  const expanded = expandPitch(CDEFG, 60, 2);
  assert.deepEqual(
    expanded.map((n) => ({ startUnits: n.startUnits, durationUnits: n.durationUnits })),
    CDEFG.map((n) => ({ startUnits: n.startUnits, durationUnits: n.durationUnits })),
  );
});

test("expandTime scales both start position and duration by the coefficient -- 'pt, 2t, 3t' (p.213-214)", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1 },
    { midiNote: 62, startUnits: 1, durationUnits: 2 },
  ];
  const expanded = expandTime(notes, 3);
  assert.deepEqual(
    expanded.map((n) => ({ startUnits: n.startUnits, durationUnits: n.durationUnits })),
    [
      { startUnits: 0, durationUnits: 3 },
      { startUnits: 3, durationUnits: 6 },
    ],
  );
});

test("expandTime leaves pitch untouched", () => {
  const notes = [{ midiNote: 60, startUnits: 0, durationUnits: 1 }];
  assert.equal(expandTime(notes, 3)[0].midiNote, 60);
});

test("geometricalExpansion applies both pitch and time scaling at once -- 'merely magnifying' the melody (p.214)", () => {
  const result = geometricalExpansion(CDEFG, 60, 2, 2);
  assert.deepEqual(
    result.map((n) => n.midiNote),
    [60, 64, 68, 70, 74],
  );
  assert.deepEqual(
    result.map((n) => n.startUnits),
    [0, 2, 4, 6, 8],
  );
});

// "All geometrical expansions are subject to geometrical inversions as
// well" (p.220) -- the two Book III techniques compose freely.
test("geometrical expansion composes with a Ch.1 geometrical position (retrograde inversion) without conflict", () => {
  const expanded = expandPitch(CDEFG, 60, 2);
  const invertedAndReversed = geometricalPosition(expanded, 60, "c");
  // Same pitch-class content as inverting the expanded melody directly, just reordered in time.
  const pitchesOnly = new Set(invertedAndReversed.map((n) => n.midiNote));
  const directInvert = new Set(expanded.map((n) => 2 * 60 - n.midiNote));
  assert.deepEqual(pitchesOnly, directInvert);
});
