import { test } from "node:test";
import assert from "node:assert/strict";
import { generateResultant } from "../src/core/resultant.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";
import {
  segmentsForSource,
  buildPercussionVoices,
  emptyPercussionAssignments,
  GM_DRUM_CHANNEL,
  PERCUSSION_VOICE_OPTIONS,
} from "../src/core/percussion.ts";

const resultant32 = generateResultant([3, 2]); // durations 2,1,1,2 -- cycle length 6

test("segmentsForSource: c.d. is the finest grid -- one unit per attack, cycleLength attacks total", () => {
  const segments = segmentsForSource("cd", resultant32, 3, 2);
  assert.equal(segments.length, 6);
  assert.ok(segments.every((s) => s.duration === 1));
});

test("segmentsForSource: generator A/B are each generator's own even pulse", () => {
  const a = segmentsForSource("generatorA", resultant32, 3, 2);
  assert.deepEqual(a.map((s) => s.duration), [2, 2, 2]); // 3 attacks, 2 units apart
  const b = segmentsForSource("generatorB", resultant32, 3, 2);
  assert.deepEqual(b.map((s) => s.duration), [3, 3]); // 2 attacks, 3 units apart
});

test("segmentsForSource: resultant is the resultant's own segments", () => {
  const segments = segmentsForSource("resultant", resultant32, 3, 2);
  assert.deepEqual(segments.map((s) => s.duration), [2, 1, 1, 2]);
});

test("segmentsForSource: c.p. is a single hit spanning the whole cycle", () => {
  const segments = segmentsForSource("cp", resultant32, 3, 2);
  assert.deepEqual(segments, [{ duration: 6 }]);
});

test("segmentsForSource: generator B returns null when it doesn't divide the cycle evenly (fractioned/pairs)", () => {
  const fractioned43 = generateFractionedResultant(4, 3); // cycle length 16, b=3 doesn't divide 16
  assert.equal(segmentsForSource("generatorB", fractioned43, 4, 3), null);
  // generator A (4) does divide 16 evenly, and c.d./resultant/c.p. are always computable regardless.
  assert.ok(segmentsForSource("generatorA", fractioned43, 4, 3) !== null);
  assert.ok(segmentsForSource("cd", fractioned43, 4, 3) !== null);
});

test("buildPercussionVoices skips unassigned (null) sources entirely", () => {
  const notes = buildPercussionVoices(emptyPercussionAssignments(), resultant32, 3, 2, 10);
  assert.deepEqual(notes, []);
});

test("buildPercussionVoices assigns each mapped source its own voice, pinned to the GM drum channel", () => {
  const assignments = { ...emptyPercussionAssignments(), generatorA: 36, resultant: 38 };
  const notes = buildPercussionVoices(assignments, resultant32, 3, 2, 10);

  assert.ok(notes.every((n) => n.channel === GM_DRUM_CHANNEL));
  const kickNotes = notes.filter((n) => n.midiNote === 36);
  const snareNotes = notes.filter((n) => n.midiNote === 38);
  assert.equal(kickNotes.length, 3); // generator A: 3 attacks
  assert.equal(snareNotes.length, 4); // resultant: 4 segments
  assert.equal(new Set(kickNotes.map((n) => n.voice)).size, 1);
  assert.equal(new Set(snareNotes.map((n) => n.voice)).size, 1);
  assert.notEqual(kickNotes[0].voice, snareNotes[0].voice);
  assert.ok(kickNotes.every((n) => n.voice >= 10));
});

test("buildPercussionVoices silently skips a source that isn't computable (generator B on a non-exact cycle)", () => {
  const fractioned43 = generateFractionedResultant(4, 3);
  const assignments = { ...emptyPercussionAssignments(), generatorB: 42 };
  const notes = buildPercussionVoices(assignments, fractioned43, 4, 3, 10);
  assert.deepEqual(notes, []);
});

test("PERCUSSION_VOICE_OPTIONS covers the standard General MIDI drum notes this app offers", () => {
  const labels = PERCUSSION_VOICE_OPTIONS.map((o) => o.label);
  assert.ok(labels.includes("Kick"));
  assert.ok(labels.includes("Snare"));
  assert.ok(labels.includes("Closed hi-hat"));
  assert.ok(labels.includes("Ride"));
  const kick = PERCUSSION_VOICE_OPTIONS.find((o) => o.label === "Kick");
  assert.equal(kick.midiNote, 36); // General MIDI: Bass Drum 1
});
