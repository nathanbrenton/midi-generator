import { test } from "node:test";
import assert from "node:assert/strict";
import { generateResultant } from "../src/core/resultant.ts";
import { symmetricDivisionScale } from "../src/core/scales.ts";
import { buildMelody, applyStrata } from "../src/core/melody.ts";

const resultant = generateResultant([3, 2]); // 4 segments: 2,1,1,2
const scale = symmetricDivisionScale(6); // whole tone: 0,2,4,6,8,10

test("buildMelody produces one note per resultant segment, in order, back to back", () => {
  const melody = buildMelody(resultant, {
    rootMidiNote: 60,
    scale,
    contour: "ascending",
    span: 2,
    baseVelocity: 80,
    accentVelocity: 110,
  });

  assert.equal(melody.length, resultant.segments.length);
  assert.deepEqual(melody.map((n) => n.startUnits), [0, 2, 3, 4]);
  assert.deepEqual(melody.map((n) => n.durationUnits), [2, 1, 1, 2]);
  assert.ok(melody.every((n) => n.voice === 0));
});

test("coincidence points (multiple generators firing together) get the accent velocity", () => {
  const melody = buildMelody(resultant, {
    rootMidiNote: 60,
    scale,
    contour: "ascending",
    span: 2,
    baseVelocity: 80,
    accentVelocity: 110,
  });

  // Position 0 is a coincidence point for generators 3 and 2.
  assert.equal(melody[0].velocity, 110);
});

test("ascending contour walks up the scale degree by degree", () => {
  const melody = buildMelody(resultant, {
    rootMidiNote: 60,
    scale,
    contour: "ascending",
    span: 2,
    baseVelocity: 80,
    accentVelocity: 110,
  });
  assert.deepEqual(melody.map((n) => n.midiNote), [60, 62, 64, 66]);
});

test("applyStrata adds one extra voice per interval, tracking the melody", () => {
  const melody = buildMelody(resultant, {
    rootMidiNote: 60,
    scale,
    contour: "ascending",
    span: 2,
    baseVelocity: 80,
    accentVelocity: 110,
  });
  const harmonized = applyStrata(melody, { intervals: [4, 7] });

  assert.equal(harmonized.length, melody.length * 3);
  const voice1 = harmonized.filter((n) => n.voice === 1);
  const voice2 = harmonized.filter((n) => n.voice === 2);
  assert.deepEqual(voice1.map((n) => n.midiNote), melody.map((n) => n.midiNote + 4));
  assert.deepEqual(voice2.map((n) => n.midiNote), melody.map((n) => n.midiNote + 7));
});
