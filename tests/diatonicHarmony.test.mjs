import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diatonicCycle,
  binomialCycle,
  trinomialCycle,
  stackedTriad,
  chordProgression,
} from "../src/core/diatonicHarmony.ts";
import { compositionCount } from "../src/core/symmetricScales.ts";
import { intervalCellScale } from "../src/core/scales.ts";

// Book V Ch.1 (p.206): "the total number of seven-unit scales equals 462" --
// a cross-book confirmation of Book II Ch.7's compositionCount, not a new formula.
test("the book's own 'total number of seven-unit scales equals 462' matches compositionCount(12, 7) exactly (p.206)", () => {
  assert.equal(compositionCount(12, 7), 462);
});

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]); // C major

test("diatonicCycle(3) (cycle of the third) matches the classic 'cycle of thirds' root sequence C-E-G-B-D-F-A", () => {
  const cycle = diatonicCycle(3, 0);
  assert.deepEqual(cycle, [0, 2, 4, 6, 1, 3, 5]);
  const rootNames = ["c", "d", "e", "f", "g", "a", "b"];
  assert.deepEqual(
    cycle.map((d) => rootNames[d]),
    ["c", "e", "g", "b", "d", "f", "a"],
  );
});

test("diatonicCycle(5) (cycle of the fifth) matches the circle of fifths exactly: C-G-D-A-E-B-F", () => {
  const cycle = diatonicCycle(5, 0);
  const rootNames = ["c", "d", "e", "f", "g", "a", "b"];
  assert.deepEqual(
    cycle.map((d) => rootNames[d]),
    ["c", "g", "d", "a", "e", "b", "f"],
  );
});

test("diatonicCycle(7) (cycle of the seventh) is purely descending stepwise motion: C-B-A-G-F-E-D, matching its 'contrapuntal derivation' (p.369)", () => {
  const cycle = diatonicCycle(7, 0);
  const rootNames = ["c", "d", "e", "f", "g", "a", "b"];
  assert.deepEqual(
    cycle.map((d) => rootNames[d]),
    ["c", "b", "a", "g", "f", "e", "d"],
  );
});

test("every diatonic cycle visits all 7 scale degrees exactly once, matching the book's own 'each appearing once and none repeating' (p.363)", () => {
  for (const cycleType of [3, 5, 7]) {
    const cycle = diatonicCycle(cycleType, 0);
    assert.equal(new Set(cycle).size, 7);
    assert.deepEqual([...cycle].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  }
});

test("diatonicCycle respects a non-zero starting degree, still visiting all 7 degrees", () => {
  const cycle = diatonicCycle(5, 2);
  assert.equal(cycle[0], 2);
  assert.equal(new Set(cycle).size, 7);
});

test("binomialCycle concatenates two full cycles into 14 chords, matching the book's own '(2x7=)14 chords' exactly (p.363)", () => {
  const cycle = binomialCycle(3, 5);
  assert.equal(cycle.length, 14);
  assert.deepEqual(cycle.slice(0, 7), diatonicCycle(3, 0));
  assert.deepEqual(cycle.slice(7, 14), diatonicCycle(5, 0));
});

test("trinomialCycle concatenates three full cycles into 21 chords", () => {
  const cycle = trinomialCycle(3, 5, 7);
  assert.equal(cycle.length, 21);
});

test("stackedTriad on a C major scale at degree 0 gives the C major triad: C,E,G", () => {
  const triad = stackedTriad(MAJOR, 60, 0);
  assert.deepEqual(triad, [60, 64, 67]); // C4, E4, G4
});

test("stackedTriad on a C major scale at degree 1 gives the D minor triad: D,F,A", () => {
  const triad = stackedTriad(MAJOR, 60, 1);
  assert.deepEqual(triad, [62, 65, 69]); // D4, F4, A4
});

test("stackedTriad wraps octaves correctly for a root degree near the top of the scale (degree 6 = B)", () => {
  const triad = stackedTriad(MAJOR, 60, 6);
  // B,D,F -- D and F wrap into the next octave
  assert.deepEqual(triad, [71, 74, 77]);
});

test("chordProgression builds one triad per root-degree, matching diatonicCycle's own output length", () => {
  const cycle = diatonicCycle(5, 0);
  const progression = chordProgression(MAJOR, 60, cycle);
  assert.equal(progression.length, 7);
  assert.deepEqual(progression[0], [60, 64, 67]); // C major triad, first chord of the circle of fifths
});
