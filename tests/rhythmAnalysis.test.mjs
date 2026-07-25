import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reduceToUnits,
  notesToRhythmPattern,
  findPatternOccurrences,
  findMatchingCases,
  findMatchingResultants,
} from "../src/core/rhythmAnalysis.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";

test("reduceToUnits divides out the greatest common divisor", () => {
  assert.deepEqual(reduceToUnits([480, 240, 240]), [2, 1, 1]);
  assert.deepEqual(reduceToUnits([2, 1, 1]), [2, 1, 1]); // already reduced
  assert.deepEqual(reduceToUnits([100]), [1]);
});

test("notesToRhythmPattern measures gaps to the next attack, not each note's own duration", () => {
  // Sousta: quarter (480 ticks) then two eighths (240 each), played legato
  // back-to-back at 480ppq -- but the first note's own note-off is cut
  // short (staccato) to 200 ticks. The pattern should still read 2,1,1
  // because it's measured start-to-start, not by note-off.
  const notes = [
    { midiNote: 60, startTicks: 0, durationTicks: 200, velocity: 90 },
    { midiNote: 67, startTicks: 480, durationTicks: 240, velocity: 100 },
    { midiNote: 67, startTicks: 720, durationTicks: 240, velocity: 100 },
  ];
  assert.deepEqual(notesToRhythmPattern(notes), [2, 1, 1]);
});

test("findPatternOccurrences matches cyclically, including wraparound past the end", () => {
  // sequence [2,1,1,2]: wraparound match starting at the last element (2,2,1 wraps to 2,2,1... )
  assert.deepEqual(findPatternOccurrences([2, 1, 1], [2, 1, 1, 2]), [0]);
  assert.deepEqual(findPatternOccurrences([1, 2, 2], [2, 1, 1, 2]), [2]); // wraps: idx2,3,0 = 1,2,2
});

test("findPatternOccurrences returns nothing for a pattern longer than the sequence", () => {
  assert.deepEqual(findPatternOccurrences([1, 1, 1, 1, 1], [2, 1, 1]), []);
});

test("sousta (2,1,1) occurs in exactly 3:2, 5:2, 7:2, and 9:2 among the 19 canonical cases", () => {
  const matches = findMatchingCases([2, 1, 1]);
  const labels = matches.map((m) => m.case.label).sort();
  assert.deepEqual(labels, ["3 : 2", "5 : 2", "7 : 2", "9 : 2"]);
});

test("an unreduced but proportional sousta pattern (4,2,2) finds the same cases as (2,1,1)", () => {
  const matches = findMatchingCases(reduceToUnits([4, 2, 2]));
  const labels = matches.map((m) => m.case.label).sort();
  assert.deepEqual(labels, ["3 : 2", "5 : 2", "7 : 2", "9 : 2"]);
});

test("findMatchingResultants finds [2,1,1] in 4:3 fractioned at index 2, matching the user's own worked example", () => {
  // 4:3 fractioned is 3,1,2,1,1,1,1,2,1,3 -- "3 1 [2 1 1] 1 1 2 1 3"
  const fractioned = generateFractionedResultant(4, 3).segments.map((s) => s.duration);
  assert.deepEqual(fractioned, [3, 1, 2, 1, 1, 1, 1, 2, 1, 3]);

  const matches = findMatchingResultants([2, 1, 1]);
  const hit = matches.find((m) => m.case.label === "4 : 3" && m.technique === "fractioned");
  assert.ok(hit, "expected a 4:3 fractioned match");
  assert.deepEqual(hit.occurrences, [2]);
});

test("findMatchingResultants also finds [2,1,1] in 5:2 plain, matching the user's cross-resultant example", () => {
  // 5:2 plain is 2,2,1,1,2,2 -- "2 [2 1 1] 2 2"
  const matches = findMatchingResultants([2, 1, 1]);
  const hit = matches.find((m) => m.case.label === "5 : 2" && m.technique === "plain");
  assert.ok(hit, "expected a 5:2 plain match");
  assert.deepEqual(hit.occurrences, [1]);
});

test("findMatchingResultants can be restricted to a subset of techniques", () => {
  const matches = findMatchingResultants([2, 1, 1], ["fractioned"]);
  assert.ok(matches.every((m) => m.technique === "fractioned"));
  assert.ok(matches.some((m) => m.case.label === "4 : 3"));
});

test("findMatchingResultants covers strictly more ground than the plain-only findMatchingCases", () => {
  const plainOnly = findMatchingCases([2, 1, 1]).length;
  const allTechniques = findMatchingResultants([2, 1, 1]).length;
  assert.ok(allTechniques > plainOnly);
});
