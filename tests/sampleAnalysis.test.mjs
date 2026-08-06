import { test } from "node:test";
import assert from "node:assert/strict";
import {
  notesToSignedSegments,
  findSmallestPeriod,
  buildNoteEventsFromSignedSegments,
  restCombinations,
} from "../src/core/sampleAnalysis.ts";
import { findMatchingCases } from "../src/core/rhythmAnalysis.ts";

/**
 * Hand-transcribed from ~/Desktop/schillinger-midi-artifacts/midi-library/Bass_Driving_01.mid
 * (a real 1-bar bass loop, 480 ticks/quarter, 8 notes on midiNote 57) rather
 * than read from that file directly, since it lives outside this repo and
 * a test suite shouldn't depend on files git doesn't track. Values
 * confirmed by parsing the actual file with midiImport.ts during
 * development: notes at ticks 0,240,600,720,960,1200,1560,1680 (relative
 * to the first note-on), durations 240,240,120,240,240,240,120,240.
 */
const SAMPLE_NOTES = [
  { midiNote: 57, startTicks: 0, durationTicks: 240, velocity: 96 },
  { midiNote: 57, startTicks: 240, durationTicks: 240, velocity: 96 },
  { midiNote: 57, startTicks: 600, durationTicks: 120, velocity: 96 },
  { midiNote: 57, startTicks: 720, durationTicks: 240, velocity: 96 },
  { midiNote: 57, startTicks: 960, durationTicks: 240, velocity: 96 },
  { midiNote: 57, startTicks: 1200, durationTicks: 240, velocity: 96 },
  { midiNote: 57, startTicks: 1560, durationTicks: 120, velocity: 96 },
  { midiNote: 57, startTicks: 1680, durationTicks: 240, velocity: 96 },
];
const SAMPLE_TICKS_PER_QUARTER = 480;

test("notesToSignedSegments on the real sample file's notes decomposes exactly: 2,2,-1,1,2 repeated twice", () => {
  const result = notesToSignedSegments(SAMPLE_NOTES, SAMPLE_TICKS_PER_QUARTER);
  assert.equal(result.divisionsPerQuarter, 4); // sixteenth-note grid
  assert.deepEqual(result.segments, [2, 2, -1, 1, 2, 2, 2, -1, 1, 2]);
  assert.equal(result.errorRatio, 0);
});

test("findSmallestPeriod detects the real sample's 2-beat archetype (5 segments) out of its full 10-segment, 1-measure sequence", () => {
  const full = [2, 2, -1, 1, 2, 2, 2, -1, 1, 2];
  assert.equal(findSmallestPeriod(full), 5);
});

test("findSmallestPeriod falls back to the full length when nothing shorter repeats", () => {
  assert.equal(findSmallestPeriod([2, 1, 3, 1]), 4);
});

test("findSmallestPeriod handles a trivially uniform sequence (period 1)", () => {
  assert.equal(findSmallestPeriod([2, 2, 2, 2]), 1);
});

test("the real sample's archetype (2,2,-1,1,2 -> abs 2,2,1,1,2) matches exactly the three canonical cases hand-verified: 5:2, 7:2, 9:2", () => {
  const archetype = [2, 2, -1, 1, 2];
  const matches = findMatchingCases(archetype.map(Math.abs));
  const labels = matches.map((m) => m.case.label).sort();
  assert.deepEqual(labels, ["5 : 2", "7 : 2", "9 : 2"]);
});

test("buildNoteEventsFromSignedSegments skips rests entirely (true silence), only emitting notes for positive segments", () => {
  const events = buildNoteEventsFromSignedSegments([2, -1, 1, 2], 60);
  assert.equal(events.length, 3);
  assert.deepEqual(
    events.map((e) => e.startUnits),
    [0, 3, 4],
  );
  assert.deepEqual(
    events.map((e) => e.durationUnits),
    [1.8, 0.9, 1.8],
  );
});

test("buildNoteEventsFromSignedSegments on the real sample's archetype produces exactly 4 notes (the rest at index 2 is skipped)", () => {
  const events = buildNoteEventsFromSignedSegments([2, 2, -1, 1, 2], 57);
  assert.equal(events.length, 4);
  assert.deepEqual(
    events.map((e) => e.startUnits),
    [0, 2, 5, 6],
  );
});

test("restCombinations(durations, 1) gives exactly n rows, each with a different single position negated", () => {
  const rows = restCombinations([2, 2, 1, 1, 2], 1);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], [-2, 2, 1, 1, 2]);
  assert.deepEqual(rows[2], [2, 2, -1, 1, 2]); // matches the sample's own actual rest position
  assert.deepEqual(rows[4], [2, 2, 1, 1, -2]);
});

test("restCombinations(durations, 0) gives exactly one row -- the original, all-notes sequence", () => {
  assert.deepEqual(restCombinations([2, 2, 1, 1, 2], 0), [[2, 2, 1, 1, 2]]);
});

test("restCombinations count always matches the binomial coefficient C(n, restCount)", () => {
  // C(5,2) = 10
  assert.equal(restCombinations([2, 2, 1, 1, 2], 2).length, 10);
  // C(5,5) = 1 (all rests)
  assert.equal(restCombinations([2, 2, 1, 1, 2], 5).length, 1);
});

test("restCombinations throws for an out-of-range restCount", () => {
  assert.throws(() => restCombinations([1, 2, 3], -1));
  assert.throws(() => restCombinations([1, 2, 3], 4));
});
