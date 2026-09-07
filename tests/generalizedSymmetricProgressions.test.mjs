import { test } from "node:test";
import assert from "node:assert/strict";
import {
  descendingInterval,
  symmetricProgressionCycleLength,
  chordRootProgression,
  modulationInterval,
} from "../src/core/generalizedSymmetricProgressions.ts";
import { generateCompositions } from "../src/core/symmetricScales.ts";

test("descendingInterval matches the book's own table exactly (p.489)", () => {
  const C = 0;
  assert.equal(descendingInterval(C, 0), 0); // c -> c
  assert.equal(descendingInterval(C, 11), 1); // c -> b
  assert.equal(descendingInterval(C, 10), 2); // c -> bb
  assert.equal(descendingInterval(C, 9), 3); // c -> a
  assert.equal(descendingInterval(C, 8), 4); // c -> ab
  assert.equal(descendingInterval(C, 7), 5); // c -> g
  assert.equal(descendingInterval(C, 6), 6); // c -> f#
  assert.equal(descendingInterval(C, 5), 7); // c -> f
  assert.equal(descendingInterval(C, 4), 8); // c -> e
  assert.equal(descendingInterval(C, 3), 9); // c -> eb
  assert.equal(descendingInterval(C, 2), 10); // c -> d
  assert.equal(descendingInterval(C, 1), 11); // c -> db
});

test("symmetricProgressionCycleLength matches the book's own worked examples exactly (p.490)", () => {
  assert.equal(symmetricProgressionCycleLength(5), 12); // binomial 3+2: 12 recurrences
  assert.equal(symmetricProgressionCycleLength(12), 1); // r4-3: 3+1+2+2+1+3=12, closes after 1 cycle
  assert.equal(symmetricProgressionCycleLength(20), 3); // r5-5-4: 4+1+3+2+2+3+1+4=20, closes after 3 cycles
});

test("chordRootProgression turns a rhythm group directly into a descending chord-root sequence", () => {
  const roots = chordRootProgression(60, [3, 2]); // C4, then down a minor 3rd, then down a whole step
  assert.deepEqual(roots, [60, 57, 55]);
});

test("modulationInterval finds the interval for the book's own C->Eb modulation example (p.492): 9", () => {
  const interval = modulationInterval(0, 3); // C to Eb, descending
  assert.equal(interval, 9);
  // "breaking up number 9 into binomials: 8+1, 7+2, 6+3, 5+4, and their reciprocals" -- generateCompositions reuse, no new function needed
  const binomials = generateCompositions(interval, 2);
  assert.deepEqual(binomials, [
    [1, 8],
    [2, 7],
    [3, 6],
    [4, 5],
    [5, 4],
    [6, 3],
    [7, 2],
    [8, 1],
  ]);
});

test("modulationInterval adds the invariant 12 for the book's own C->Bb example (p.493): 2 -> 14", () => {
  assert.equal(modulationInterval(0, 10), 2);
  assert.equal(modulationInterval(0, 10, true), 14);
});
