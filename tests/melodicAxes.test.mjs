import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAxialMelody } from "../src/core/melodicAxes.ts";
import { generalPermutations } from "../src/core/permutations.ts";
import { findPrimaryAxis } from "../src/core/melodicModulation.ts";

// Figure 16 (Monomial Axial Combination, p.262): "a2T+aT" -- confirmed by
// zooming into the rendered page image: rises 2 units, then an
// instantaneous reset back to the axis, then rises 1 unit (a shorter
// second peak than the first).
test("buildAxialMelody matches Figure 16's 'a2T+aT' exactly: rise 2, reset, rise 1", () => {
  const melody = buildAxialMelody(
    [
      { axis: "a", timeUnits: 2 },
      { axis: "a", timeUnits: 1 },
    ],
    60,
    1,
  );
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [61, 62, 61],
  );
  assert.deepEqual(
    melody.map((n) => n.startUnits),
    [0, 1, 2],
  );
});

test("buildAxialMelody matches Figure 16's 'a3T+aT': rise 3, reset, rise 1", () => {
  const melody = buildAxialMelody(
    [
      { axis: "a", timeUnits: 3 },
      { axis: "a", timeUnits: 1 },
    ],
    60,
    1,
  );
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [61, 62, 63, 61],
  );
});

// Figure 19 (Binomial Axial Combination, p.263): "a2T+bT", "a3T+bT",
// confirmed by zooming into the page image -- 'b' always returns FULLY to
// the axis within its own stated time, regardless of how far the climb
// went, not by some independently-chosen distance of its own.
test("buildAxialMelody matches Figure 19's 'a2T+bT' exactly: climbs 2, then returns fully to the axis in 1 unit", () => {
  const melody = buildAxialMelody(
    [
      { axis: "a", timeUnits: 2 },
      { axis: "b", timeUnits: 1 },
    ],
    60,
    1,
  );
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [61, 62, 60],
  );
});

test("buildAxialMelody matches Figure 19's 'a3T+bT' exactly: climbs 3, then returns fully to the axis in 1 unit", () => {
  const melody = buildAxialMelody(
    [
      { axis: "a", timeUnits: 3 },
      { axis: "b", timeUnits: 1 },
    ],
    60,
    1,
  );
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [61, 62, 63, 60],
  );
});

test("buildAxialMelody's 'b' return still reaches the axis exactly even when stretched over more time units (a5T+b2T)", () => {
  const melody = buildAxialMelody(
    [
      { axis: "a", timeUnits: 5 },
      { axis: "b", timeUnits: 2 },
    ],
    60,
    1,
  );
  assert.equal(melody.at(-1).midiNote, 60); // always lands exactly back on the axis
  assert.equal(melody.length, 7);
});

test("buildAxialMelody's 'd' is the mirror of 'a': starts at axis, descends away", () => {
  const melody = buildAxialMelody([{ axis: "d", timeUnits: 2 }], 60, 1);
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [59, 58],
  );
});

test("buildAxialMelody's 'c' is the mirror of 'b': ascends fully back to the axis from below", () => {
  const melody = buildAxialMelody(
    [
      { axis: "d", timeUnits: 3 }, // descend to 57
      { axis: "c", timeUnits: 1 }, // ascend fully back to axis
    ],
    60,
    1,
  );
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [59, 58, 57, 60],
  );
});

test("buildAxialMelody's '0' axis holds at the primary axis pitch", () => {
  const melody = buildAxialMelody([{ axis: "0", timeUnits: 3 }], 60, 1);
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [60, 60, 60],
  );
});

test("buildAxialMelody's 'b'/'c' as the very first term (nothing to return from) stay flat at the axis", () => {
  const melody = buildAxialMelody([{ axis: "b", timeUnits: 2 }], 60, 1);
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [60, 60],
  );
});

test("buildAxialMelody honors an explicit pitchUnits on 'a', independent of timeUnits (Section H's general correlation notation, p.275)", () => {
  const melody = buildAxialMelody([{ axis: "a", timeUnits: 1, pitchUnits: 4 }], 60, 1);
  assert.deepEqual(
    melody.map((n) => n.midiNote),
    [64],
  );
});

test("buildAxialMelody respects timeUnit scaling for note start/duration", () => {
  const melody = buildAxialMelody([{ axis: "a", timeUnits: 2 }], 60, 480);
  assert.deepEqual(
    melody.map((n) => ({ startUnits: n.startUnits, durationUnits: n.durationUnits })),
    [
      { startUnits: 0, durationUnits: 480 },
      { startUnits: 480, durationUnits: 480 },
    ],
  );
});

// Section A (p.246): "Primary axis is a pitch-time maximum" -- exactly
// findPrimaryAxis from Book II Ch.4, reused rather than reimplemented.
test("Section A's Primary Axis is exactly Book II Ch.4's findPrimaryAxis, applied to an axial melody", () => {
  const melody = buildAxialMelody(
    [
      { axis: "a", timeUnits: 2 },
      { axis: "b", timeUnits: 1 },
    ],
    60,
    1,
  );
  const axis = findPrimaryAxis(melody.map((n) => ({ midiNote: n.midiNote, durationUnits: n.durationUnits })));
  // notes are 61,62,60 each duration 1 -- three distinct pitches, so the "maximum" is just whichever appears (all tied at 1); assert it picks one of the actual notes.
  assert.ok([60, 61, 62].includes(axis.midiNote));
});

// Section D (p.253-258): the book's own massive worked enumeration of
// axial combinations turns out to be nothing more than generalPermutations
// (Book I Ch.9) applied to the 5-symbol alphabet -- verified against
// several of the book's own stated counts directly.
test("Section D's trinomial '3 identical terms' pattern (e.g. 0+0+a) has exactly 3 permutations, matching the book's own stated count (p.254)", () => {
  const AXIS_0 = 0;
  const AXIS_A = 1;
  assert.equal(generalPermutations([AXIS_0, AXIS_0, AXIS_A]).length, 3);
});

test("Section D's trinomial '3 different terms' pattern (e.g. 0+a+b) has exactly 6 permutations, matching the book's own stated count (p.254)", () => {
  assert.equal(generalPermutations([0, 1, 2]).length, 6);
});

test("Section D's binomial pattern (e.g. 0+a) has exactly 2 permutations, matching '10 combinations, 2 permutations each' (p.253)", () => {
  assert.equal(generalPermutations([0, 1]).length, 2);
});

test("Section D's quadrinomial '4 places with 3 identical terms' pattern has exactly 4 permutations, matching the book's own stated count (p.255)", () => {
  assert.equal(generalPermutations([0, 0, 0, 1]).length, 4);
});
