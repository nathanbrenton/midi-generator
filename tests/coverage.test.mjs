// Direct tests for exported helpers that were only exercised indirectly (through panels or wrappers).
import { test } from "node:test";
import assert from "node:assert/strict";
import { degreeOf } from "../src/core/chromaticModulation.ts";
import { partPermutations } from "../src/core/counterpoint.ts";
import {
  transformChord,
  transformVoicing,
  positionVoicing,
  positionVoicingFrom,
  octaveVariation,
  S5_POSITIONS,
  stackedTriad,
} from "../src/core/diatonicHarmony.ts";
import { expandCycleGroup } from "../src/core/symmetricHarmony.ts";
import { formatStructure } from "../src/core/notation/harmony.ts";
import { interferenceChain } from "../src/core/notation/pitchScales.ts";
import { spiralDeveloped, spiralExtended } from "../src/core/notation/melody.ts";
import { spiralSequenceDeveloped, spiralSequenceExtended } from "../src/core/organicMelody.ts";
import { scaleOf, BALINESE } from "../src/core/pitchFamilies.ts";
import { spelledLine, chromaticAlterationGroups } from "../src/core/melodicModulation.ts";
import { intervalCellScale, midiNoteForDegree } from "../src/core/scales.ts";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

test("degreeOf: E is the 3rd of C major, C the 6th of Eb major, F# the 7th of G major", () => {
  assert.equal(degreeOf("E", 0), 3);
  assert.equal(degreeOf("C", -3), 6);
  assert.equal(degreeOf("F", 1), 7);
});

test("partPermutations: SATB has 24 orders", () => {
  const orders = partPermutations(["S", "A", "T", "B"]);
  assert.equal(orders.length, 24);
  assert.equal(new Set(orders.map((o) => o.join(""))).size, 24);
});

test("positionVoicingFrom agrees with positionVoicing for C major in every S(5) position", () => {
  const [root, third, fifth] = stackedTriad(MAJOR, 60, 0);
  for (const position of [...S5_POSITIONS.close, ...S5_POSITIONS.open]) {
    assert.deepEqual(positionVoicingFrom({ root, third, fifth }, root - 12, position), positionVoicing(MAJOR, 60, 0, position));
  }
});

test("transformChord agrees with the diatonic transformVoicing when given the diatonic target chord", () => {
  const start = positionVoicing(MAJOR, 60, 0, S5_POSITIONS.close[1]);
  for (const degree of [3, 4, 5]) {
    const [root, third, fifth] = stackedTriad(MAJOR, 60, degree);
    for (const direction of ["clockwise", "counterclockwise", "const3"]) {
      assert.deepEqual(
        transformChord(start, { root, third, fifth }, direction),
        transformVoicing(start, MAJOR, 60, degree, direction),
        `degree ${degree}, ${direction}`,
      );
    }
  }
});

test("octaveVariation (p.380): upper voices return by an octave once they drift past it; the bass stays within a fourth of home", () => {
  const home = { bass: 48, root: 60, third: 64, fifth: 67 };
  assert.deepEqual(octaveVariation(home, home), home);
  const drifted = { bass: 48, root: 72, third: 76, fifth: 79 };
  const back = octaveVariation(drifted, home);
  assert.deepEqual([back.root, back.third, back.fifth], [60, 64, 67]);
  const highBass = octaveVariation({ bass: 60, root: 64, third: 67, fifth: 72 }, home);
  assert.ok(highBass.bass - home.bass <= 6);
});

test("expandCycleGroup (p.393): 2C7 + C3 + C5 = C7 + C7 + C3 + C5", () => {
  assert.deepEqual(expandCycleGroup([[2, 7], [1, 3], [1, 5]]), [7, 7, 3, 5]);
});

test("formatStructure writes S with a subscript", () => {
  assert.equal(formatStructure(1), "S₁");
  assert.equal(formatStructure(12), "S₁₂");
});

test("interferenceChain (p.114-116): the book's trinomial 4+4+3 gives a quintinomial, then nine intervals, all within 11", () => {
  const chain = interferenceChain([4, 4, 3], 2);
  assert.deepEqual(chain.map((s) => s.length), [3, 5, 9]);
  for (const stage of chain) assert.equal(stage.reduce((a, b) => a + b, 0), 11);
});

test("the notation wrappers spiralDeveloped and spiralExtended are the organic-melody spirals", () => {
  const series = [1, 2, 3, 5, 8, 13, 21];
  assert.deepEqual(spiralDeveloped(series, 0), spiralSequenceDeveloped(series, 0));
  assert.deepEqual(spiralExtended(series, 0), spiralSequenceExtended(series, 0));
});

test("scaleOf: the Balinese scale as an interval cell reads c db eb g ab and back to c", () => {
  const scale = scaleOf(BALINESE);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((d) => midiNoteForDegree(scale, 60, d)), [60, 61, 63, 67, 68, 72]);
});

test("spelledLine keeps each spelled tone in the octave nearest the one before", () => {
  const line = spelledLine(chromaticAlterationGroups(0, -3).chained, 60);
  assert.equal(line.length, 7);
  for (let i = 1; i < line.length; i++) assert.ok(Math.abs(line[i] - line[i - 1]) <= 6, `step ${i}`);
  assert.equal(line[0] % 12, 11); // starts on b
});
