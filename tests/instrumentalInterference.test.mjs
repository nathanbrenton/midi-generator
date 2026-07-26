import { test } from "node:test";
import assert from "node:assert/strict";
import {
  synchronizeInstrumentalGroup,
  assignPlaces,
  segmentsFromAttackTimes,
  ACCOMPANIMENT_FIGURES,
} from "../src/core/instrumentalInterference.ts";

test("4 attacks against 2 places: resultant appears once, instrumental group appears twice (book's own example, p.27)", () => {
  const sync = synchronizeInstrumentalGroup(4, 2);
  assert.equal(sync.resultantRepeats, 1);
  assert.equal(sync.instrumentRepeats, 2);
  assert.equal(sync.totalAttacks, 4);
});

test("7 attacks against 2 places: resultant appears twice, instrumental group (kettle drums) appears 7 times (book's own example, p.28)", () => {
  const sync = synchronizeInstrumentalGroup(7, 2);
  assert.equal(sync.resultantRepeats, 2);
  assert.equal(sync.instrumentRepeats, 7);
  assert.equal(sync.totalAttacks, 14);
});

test("totalAttacks is always attackCount*resultantRepeats and also placeCount*instrumentRepeats", () => {
  for (const [attackCount, placeCount] of [
    [4, 2],
    [7, 2],
    [6, 4],
    [9, 6],
    [5, 5],
    [3, 7],
  ]) {
    const sync = synchronizeInstrumentalGroup(attackCount, placeCount);
    assert.equal(sync.totalAttacks, attackCount * sync.resultantRepeats);
    assert.equal(sync.totalAttacks, placeCount * sync.instrumentRepeats);
  }
});

test("assignPlaces cycles through every place index in round-robin order, for the full realigned length", () => {
  const assigned = assignPlaces(4, 2);
  assert.deepEqual(assigned, [0, 1, 0, 1]);
  const longer = assignPlaces(7, 2);
  assert.equal(longer.length, 14);
  assert.deepEqual(longer, [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
});

test("assignPlaces gives every place index exactly instrumentRepeats occurrences", () => {
  const sync = synchronizeInstrumentalGroup(9, 6);
  const assigned = assignPlaces(9, 6);
  for (let place = 0; place < 6; place++) {
    assert.equal(assigned.filter((p) => p === place).length, sync.instrumentRepeats);
  }
});

test("segmentsFromAttackTimes reduces to generatorPulse-style {duration} segments, wrapping the last gap back to the first", () => {
  const segments = segmentsFromAttackTimes([0, 3, 5], 8);
  assert.deepEqual(segments.map((s) => s.duration), [3, 2, 3]);
  assert.equal(segments.reduce((sum, s) => sum + s.duration, 0), 8);
});

test("segmentsFromAttackTimes on a single attack produces one segment spanning the whole cycle", () => {
  const segments = segmentsFromAttackTimes([2], 10);
  assert.deepEqual(segments, [{ duration: 10 }]);
});

test("ACCOMPANIMENT_FIGURES matches the book's three named figures exactly (polka/fox-trot/rhumba)", () => {
  assert.deepEqual(
    ACCOMPANIMENT_FIGURES.map((f) => f.roles.length),
    [2, 4, 6],
  );
  assert.deepEqual(ACCOMPANIMENT_FIGURES[0].roles, ["bass", "chord"]);
  assert.deepEqual(ACCOMPANIMENT_FIGURES[1].roles, ["bass", "chord", "bass", "chord"]);
  assert.deepEqual(ACCOMPANIMENT_FIGURES[2].roles, ["bass", "chord", "bass", "chord", "bass", "chord"]);
});
