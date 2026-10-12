import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tonalExpansion,
  allTonalExpansions,
  ascendingRealization,
  expandedScale,
  unitNumber,
  translateMelodyToExpansion,
} from "../src/core/scalesInExpansion.ts";

const NAMES_ODD = ["c", "d", "e", "f", "g"]; // book's own odd-count example (p.132)
const NAMES_EVEN = ["c", "d", "e", "f", "g", "b"]; // book's own even-count example (p.133)

test("tonalExpansion E1 of an odd-count scale (N=5) matches the book's own worked example exactly: c-e-g-d-f (p.132)", () => {
  assert.deepEqual(tonalExpansion(NAMES_ODD, 1), ["c", "e", "g", "d", "f"]);
});

test("tonalExpansion E1 of an even-count scale (N=6) matches the book's own worked example exactly: c-e-g-d-f-b (p.133), confirming the 'recurring unit omitted, restart at next unvisited' rule", () => {
  assert.deepEqual(tonalExpansion(NAMES_EVEN, 1), ["c", "e", "g", "d", "f", "b"]);
});

test("tonalExpansion E0 (k=0, step=1) is always the original scale, unchanged -- 'this includes the original scale' (p.133)", () => {
  assert.deepEqual(tonalExpansion(NAMES_ODD, 0), NAMES_ODD);
  assert.deepEqual(tonalExpansion(NAMES_EVEN, 0), NAMES_EVEN);
});

test("tonalExpansion rejects an out-of-range k", () => {
  assert.throws(() => tonalExpansion(NAMES_ODD, -1));
  assert.throws(() => tonalExpansion(NAMES_ODD, NAMES_ODD.length - 1)); // max valid k is length-2
});

test("tonalExpansion is always a permutation of the input (same multiset, just reordered)", () => {
  for (const names of [NAMES_ODD, NAMES_EVEN]) {
    for (let k = 0; k <= names.length - 2; k++) {
      const result = tonalExpansion(names, k);
      assert.deepEqual([...result].sort(), [...names].sort());
    }
  }
});

test("allTonalExpansions returns exactly N-1 expansions, 'the total number of tonal expansions... equals the number of units therein minus one' (p.133)", () => {
  assert.equal(allTonalExpansions(NAMES_ODD).length, NAMES_ODD.length - 1);
  assert.equal(allTonalExpansions(NAMES_EVEN).length, NAMES_EVEN.length - 1);
});

test("allTonalExpansions' first entry (E0) is the original scale", () => {
  assert.deepEqual(allTonalExpansions(NAMES_EVEN)[0], NAMES_EVEN);
});

test("allTonalExpansions' second entry (E1) matches tonalExpansion(units, 1) directly", () => {
  assert.deepEqual(allTonalExpansions(NAMES_EVEN)[1], tonalExpansion(NAMES_EVEN, 1));
});

test("tonalExpansion works over plain MIDI note numbers, not just letter names (the actual UI use case)", () => {
  const midiNotes = [60, 62, 64, 67, 69]; // c-d-e-g-a, 5 units, odd
  const e1 = tonalExpansion(midiNotes, 1);
  assert.deepEqual(e1, [60, 64, 69, 62, 67]); // same 0,2,4,1,3 index walk as the odd-count book example
});

test("edge case: a 1-unit scale has zero possible expansions beyond E0 itself", () => {
  assert.deepEqual(allTonalExpansions([60]), [[60]]);
});

test("edge case: an empty scale returns no expansions", () => {
  assert.deepEqual(allTonalExpansions([]), []);
});

const NATURAL_MAJOR = [60, 62, 64, 65, 67, 69, 71]; // c4 major

test("Figure 24: natural major E1 is written ascending, c-e-g-b-d-f-a climbing past the octave (p.135)", () => {
  assert.deepEqual(expandedScale(NATURAL_MAJOR, 1), [60, 64, 67, 71, 74, 77, 81]); // c4 e4 g4 b4 d5 f5 a5
});

test("Figure 24: natural major E2 is c-f-b-e-a-d-g, still ascending (p.135)", () => {
  assert.deepEqual(expandedScale(NATURAL_MAJOR, 2), [60, 65, 71, 76, 81, 86, 91]);
});

test("every expansion is a valid scale in the book's sense -- strictly ascending -- and E0 is the original", () => {
  for (let k = 0; k <= NATURAL_MAJOR.length - 2; k++) {
    const scale = expandedScale(NATURAL_MAJOR, k);
    for (let i = 1; i < scale.length; i++) assert.ok(scale[i] > scale[i - 1], `E${k} is not ascending`);
  }
  assert.deepEqual(expandedScale(NATURAL_MAJOR, 0), NATURAL_MAJOR);
});

test("ascendingRealization raises only what's needed: c4-e4-a4-d4-g4 -> c4-e4-a4-d5-g5", () => {
  assert.deepEqual(ascendingRealization([60, 64, 69, 62, 67]), [60, 64, 69, 74, 79]);
});

test("unitNumber counts units from the root in consecutive order, continuing past the octave", () => {
  assert.equal(unitNumber(60, NATURAL_MAJOR), 0); // I
  assert.equal(unitNumber(71, NATURAL_MAJOR), 6); // VII
  assert.equal(unitNumber(72, NATURAL_MAJOR), 7); // I an octave up
  assert.equal(unitNumber(59, NATURAL_MAJOR), -1); // VII an octave down
  assert.throws(() => unitNumber(61, NATURAL_MAJOR)); // c# isn't a unit of c major
});

test("Section B: translating a melody into E1 maps unit n to unit n, root-tone on the same pitch level (p.134)", () => {
  const melody = [60, 62, 64, 60]; // I II III I
  assert.deepEqual(translateMelodyToExpansion(melody, NATURAL_MAJOR, 0), melody); // E0 is the identity
  assert.deepEqual(translateMelodyToExpansion(melody, NATURAL_MAJOR, 1), [60, 64, 67, 60]); // c e g c
});

test("Section B: units outside the first cycle continue into the expansion's own neighboring cycles", () => {
  // E1 spans c4..a5; its next cycle starts on the root above a5, c6, so one cycle is 24 semitones.
  assert.deepEqual(translateMelodyToExpansion([59, 72], NATURAL_MAJOR, 1), [57, 84]); // VII below -> a3; I above -> c6
});
