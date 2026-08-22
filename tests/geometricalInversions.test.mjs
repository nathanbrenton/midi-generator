import { test } from "node:test";
import assert from "node:assert/strict";
import {
  invertPitch,
  reverseTime,
  invertPitches,
  geometricalPosition,
  allFourPositions,
} from "../src/core/geometricalInversions.ts";
import { symmetricDivisionScale, intervalCellScale } from "../src/core/scales.ts";

test("invertPitch matches the book's own worked example exactly: axis g, note d(+octave) inverts to c (p.199)", () => {
  const g = 67; // G4
  const dOctaveUp = 74; // D5, seven semitones above g
  assert.equal(invertPitch(dOctaveUp, g), 60); // C4, seven semitones below g
});

test("invertPitch is its own inverse (inverting twice returns the original pitch)", () => {
  assert.equal(invertPitch(invertPitch(74, 67), 67), 74);
});

test("invertPitch of the axis itself is the axis (a fixed point)", () => {
  assert.equal(invertPitch(67, 67), 67);
});

test("reverseTime mirrors a 3-note melody exactly: last note (longest) now starts first, no gaps introduced", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 2 },
    { midiNote: 62, startUnits: 2, durationUnits: 1 },
    { midiNote: 64, startUnits: 3, durationUnits: 3 },
  ];
  const reversed = reverseTime(notes);
  assert.deepEqual(reversed, [
    { midiNote: 64, startUnits: 0, durationUnits: 3 },
    { midiNote: 62, startUnits: 3, durationUnits: 1 },
    { midiNote: 60, startUnits: 4, durationUnits: 2 },
  ]);
});

test("reverseTime applied twice returns the original melody exactly", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 2 },
    { midiNote: 65, startUnits: 3, durationUnits: 1 },
    { midiNote: 67, startUnits: 5, durationUnits: 4 },
  ];
  assert.deepEqual(reverseTime(reverseTime(notes)), notes);
});

test("reverseTime preserves rests (gaps between notes stay the same total width, just mirrored)", () => {
  // A gap of 1 unit between the first two notes, none between the last two.
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1 },
    { midiNote: 62, startUnits: 2, durationUnits: 1 }, // 1-unit rest before this note
    { midiNote: 64, startUnits: 3, durationUnits: 1 },
  ];
  const reversed = reverseTime(notes);
  // total length 4; reversed notes at [1,2] (64), [2,3]... let's just check start positions.
  assert.deepEqual(
    reversed.map((n) => n.startUnits),
    [0, 1, 3],
  );
});

test("reverseTime on an empty melody returns an empty array", () => {
  assert.deepEqual(reverseTime([]), []);
});

test("invertPitches reflects every note's pitch, leaving timing untouched", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 2 },
    { midiNote: 64, startUnits: 2, durationUnits: 2 },
  ];
  const inverted = invertPitches(notes, 60);
  assert.deepEqual(
    inverted.map((n) => n.midiNote),
    [60, 56],
  );
  assert.deepEqual(
    inverted.map((n) => ({ startUnits: n.startUnits, durationUnits: n.durationUnits })),
    [
      { startUnits: 0, durationUnits: 2 },
      { startUnits: 2, durationUnits: 2 },
    ],
  );
});

// Position (a) = original; (b) = "the same thing backwards"; (c) = "backwards
// and upside down"; (d) = "forwards and upside down" (p.185-186).
test("geometricalPosition 'a' is the identity (unchanged)", () => {
  const notes = [{ midiNote: 60, startUnits: 0, durationUnits: 2 }];
  assert.deepEqual(geometricalPosition(notes, 67, "a"), notes);
});

test("geometricalPosition 'b' reverses time only, pitches unchanged", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1 },
    { midiNote: 62, startUnits: 1, durationUnits: 1 },
  ];
  const b = geometricalPosition(notes, 67, "b");
  assert.deepEqual(
    b.map((n) => n.midiNote),
    [62, 60],
  );
});

test("geometricalPosition 'd' inverts pitch only, timing unchanged", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1 },
    { midiNote: 62, startUnits: 1, durationUnits: 1 },
  ];
  const d = geometricalPosition(notes, 60, "d");
  assert.deepEqual(
    d.map((n) => n.startUnits),
    [0, 1],
  );
  assert.deepEqual(
    d.map((n) => n.midiNote),
    [60, 58],
  );
});

test("geometricalPosition 'c' combines both: reversed time AND inverted pitch", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1 },
    { midiNote: 62, startUnits: 1, durationUnits: 1 },
  ];
  const c = geometricalPosition(notes, 60, "c");
  assert.deepEqual(c, [
    { midiNote: 58, startUnits: 0, durationUnits: 1 },
    { midiNote: 60, startUnits: 1, durationUnits: 1 },
  ]);
});

test("allFourPositions returns all four positions consistently, matching individual geometricalPosition calls", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1 },
    { midiNote: 64, startUnits: 1, durationUnits: 2 },
  ];
  const positions = allFourPositions(notes, 60);
  for (const key of ["a", "b", "c", "d"]) {
    assert.deepEqual(positions[key], geometricalPosition(notes, 60, key));
  }
});

// The book's own claim (p.199, Figure 21): some scales, inverted around one
// of their own pitch-units, reproduce their own interval structure -- "their
// compensating scales are identical in structure with the original scale."
// The whole-tone scale (Book II Ch.1-2's symmetricDivisionScale(6)) is the
// clearest case.
test("inverting the whole-tone scale around its own root reproduces the identical pitch-class set (p.199)", () => {
  const scale = symmetricDivisionScale(6); // whole tone: intervals all 2
  const root = 60;
  const original = scale.degrees.map((d) => root + d); // [60,62,64,66,68,70]
  const inverted = original.map((p) => invertPitch(p, root));
  const originalClasses = new Set(original.map((p) => ((p % 12) + 12) % 12));
  const invertedClasses = new Set(inverted.map((p) => ((p % 12) + 12) % 12));
  assert.deepEqual(invertedClasses, originalClasses);
});

test("inverting a non-symmetric scale (major) around its root does NOT generally reproduce the same pitch-class set", () => {
  const scale = intervalCellScale([2, 2, 1, 2, 2, 2, 1]); // natural major
  const root = 60;
  const original = scale.degrees.map((d) => root + d);
  const inverted = original.map((p) => invertPitch(p, root));
  const originalClasses = new Set(original.map((p) => ((p % 12) + 12) % 12));
  const invertedClasses = new Set(inverted.map((p) => ((p % 12) + 12) % 12));
  assert.notDeepEqual(invertedClasses, originalClasses);
});
