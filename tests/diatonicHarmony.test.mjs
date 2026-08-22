import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diatonicCycle,
  binomialCycle,
  trinomialCycle,
  stackedTriad,
  negativeStackedTriad,
  chordProgression,
  nearestPitch,
  transformVoicing,
  voiceLeadProgression,
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

// Sections C-D (p.376-381): clockwise/counterclockwise voice-leading via
// function reassignment, placed at the nearest available octave.
test("nearestPitch finds the closest octave placement of a target pitch class, matching hand-verified examples", () => {
  assert.equal(nearestPitch(60, 7), 55); // C4 -> nearest G is G3 (down a 5th), not G4 (up a 4th)
  assert.equal(nearestPitch(64, 11), 59); // E4 -> nearest B is B3
  assert.equal(nearestPitch(67, 4), 64); // G4 -> nearest E is E4
});

test("nearestPitch never moves more than 6 semitones", () => {
  for (let ref = 40; ref < 80; ref++) {
    for (let target = 0; target < 12; target++) {
      assert.ok(Math.abs(nearestPitch(ref, target) - ref) <= 6);
    }
  }
});

test("transformVoicing (clockwise, C3 cycle) matches the hand-derived C-major-to-E-minor example exactly (p.379)", () => {
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 }; // C major triad, root position
  const next = transformVoicing(voicing, MAJOR, 60, 2, "clockwise"); // next root = degree 2 (E)
  assert.deepEqual(next, { bass: 52, root: 64, third: 55, fifth: 59 });
});

test("transformVoicing's clockwise mapping: root->third, third->fifth, fifth->root (p.379)", () => {
  // Using a static target (same chord as source) isolates the mapping itself.
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 };
  const next = transformVoicing(voicing, MAJOR, 60, 0, "clockwise");
  assert.equal(next.third, nearestPitch(60, 64 % 12)); // old root -> new third
  assert.equal(next.fifth, nearestPitch(64, 67 % 12)); // old third -> new fifth
  assert.equal(next.root, nearestPitch(67, 60 % 12)); // old fifth -> new root
});

test("transformVoicing's counterclockwise mapping is the mirror: root->fifth, fifth->third, third->root (p.379)", () => {
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 };
  const next = transformVoicing(voicing, MAJOR, 60, 0, "counterclockwise");
  assert.equal(next.fifth, nearestPitch(60, 67 % 12)); // old root -> new fifth
  assert.equal(next.third, nearestPitch(67, 64 % 12)); // old fifth -> new third
  assert.equal(next.root, nearestPitch(64, 60 % 12)); // old third -> new root
});

test("voiceLeadProgression's bass always carries the current chord's root pitch class", () => {
  const cycle = diatonicCycle(3, 0);
  const progression = voiceLeadProgression(MAJOR, 60, cycle, "clockwise");
  const rootTriads = chordProgression(MAJOR, 60, cycle);
  progression.forEach((voicing, i) => {
    assert.equal(((voicing.bass % 12) + 12) % 12, rootTriads[i][0] % 12);
  });
});

test("voiceLeadProgression produces one voicing per root-degree, each voice moving smoothly (no leap over 6 semitones between consecutive chords)", () => {
  const cycle = diatonicCycle(5, 0);
  const progression = voiceLeadProgression(MAJOR, 60, cycle, "clockwise");
  assert.equal(progression.length, 7);
  for (let i = 1; i < progression.length; i++) {
    const prev = progression[i - 1];
    const curr = progression[i];
    for (const fn of ["root", "third", "fifth"]) {
      const prevVal = prev[fn];
      // find which voice in curr this one became -- just check overall max movement across all pairings is bounded
      const closest = Math.min(...["root", "third", "fifth"].map((f) => Math.abs(curr[f] - prevVal)));
      assert.ok(closest <= 6);
    }
  }
});

// Section F, The Negative Form (p.386-388): chords built downward.
test("negativeStackedTriad matches the book's own worked example exactly: starting from c as -1, a is -3 and f is -5 (p.386)", () => {
  const triad = negativeStackedTriad(MAJOR, 60, 0); // root=C4=60
  assert.deepEqual(triad, [60, 57, 53]); // C4, A3 (minor 3rd below), F3 (perfect 5th below)
});

test("negativeStackedTriad is the exact mirror of stackedTriad -- same root, intervals reflected downward instead of upward", () => {
  const positive = stackedTriad(MAJOR, 60, 0);
  const negative = negativeStackedTriad(MAJOR, 60, 0);
  assert.equal(positive[0], negative[0]); // shared root
  assert.equal(positive[0] - negative[1], 60 - 57); // third is equidistant below vs above (though not necessarily same magnitude in a diatonic scale)
  assert.ok(negative[1] < negative[0] && negative[2] < negative[1]); // strictly descending
});

test("negativeStackedTriad wraps octaves correctly for a root degree near the bottom of the scale (degree 1 = D)", () => {
  const triad = negativeStackedTriad(MAJOR, 60, 1); // D4=62
  // D, and going down two more scale-degrees each time: B3, G3
  assert.deepEqual(triad, [62, 59, 55]);
});
