import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HYBRID_FORMS,
  hybridFormsForTension,
  stackedHybridChord,
  transformHybridVoicing,
} from "../src/core/hybridFourPartHarmony.ts";
import { stackedNinthChord } from "../src/core/ninthChords.ts";
import { stackedEleventhChord } from "../src/core/eleventhChords.ts";
import { intervalCellScale } from "../src/core/scales.ts";
import { nearestPitch } from "../src/core/diatonicHarmony.ts";

const C_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

function pc(n) {
  return ((n % 12) + 12) % 12;
}

test("HYBRID_FORMS has exactly the book's own 9 forms (p.478, Figure 190)", () => {
  assert.equal(HYBRID_FORMS.length, 9);
  assert.equal(hybridFormsForTension(5).length, 2);
  assert.equal(hybridFormsForTension(7).length, 2);
  assert.equal(hybridFormsForTension(9).length, 2);
  assert.equal(hybridFormsForTension(11).length, 1); // only one form for S(11)
  assert.equal(hybridFormsForTension(13).length, 2);
});

test("stackedHybridChord for S(9) unmarked matches Ch.10's own stackedNinthChord exactly -- cross-chapter consistency", () => {
  const form = hybridFormsForTension(9).find((f) => !f.marked);
  const { bass, a, b, c } = stackedHybridChord(C_MAJOR, 60, 0, form);
  const ninth = stackedNinthChord(C_MAJOR, 60, 0);
  assert.equal(bass, ninth.bass);
  assert.deepEqual([a, b, c], ninth.upper);
});

test("stackedHybridChord for S(11) matches Ch.11's own stackedEleventhChord exactly -- cross-chapter consistency", () => {
  const form = hybridFormsForTension(11)[0];
  const { bass, a, b, c } = stackedHybridChord(C_MAJOR, 60, 0, form);
  const eleventh = stackedEleventhChord(C_MAJOR, 60, 0);
  assert.equal(bass, eleventh.bass);
  assert.deepEqual([a, b, c], eleventh.upper);
});

test("the a/b/c letter identification matches the book's own S(5)+S(9)+S(13) worked example exactly (p.479): a=lowest, b=middle, c=highest function", () => {
  const s5 = stackedHybridChord(C_MAJOR, 60, 0, hybridFormsForTension(5).find((f) => !f.marked));
  const s9 = stackedHybridChord(C_MAJOR, 60, 0, hybridFormsForTension(9).find((f) => !f.marked));
  const s13 = stackedHybridChord(C_MAJOR, 60, 0, hybridFormsForTension(13).find((f) => !f.marked));
  // S(5): "1 / 5, 3" -- a=1(root), b=3, c=5
  assert.equal(pc(s5.a), 0); // C = function 1
  assert.equal(pc(s5.b), 4); // E = function 3
  assert.equal(pc(s5.c), 7); // G = function 5
  // S(9): "3 / 9, 7" -- a=3, b=7, c=9
  assert.equal(pc(s9.a), 4); // E = function 3
  assert.equal(pc(s9.b), 11); // B = function 7
  assert.equal(pc(s9.c), 2); // D = function 9
  // S(13): "7 / 13, 9" -- a=7, b=9, c=13
  assert.equal(pc(s13.a), 11); // B = function 7
  assert.equal(pc(s13.b), 2); // D = function 9
  assert.equal(pc(s13.c), 9); // A = function 13
});

test("clockwise (a->b, b->c, c->a) lands the old a-voice nearest to the new chord's own b pitch class, generalizing Ch.2's root->third->fifth->root", () => {
  const s5Form = hybridFormsForTension(5).find((f) => !f.marked);
  const s9Form = hybridFormsForTension(9).find((f) => !f.marked);
  const s5 = stackedHybridChord(C_MAJOR, 60, 0, s5Form);
  const newStack = stackedHybridChord(C_MAJOR, 60, 2, s9Form); // next root a whole step up

  const next = transformHybridVoicing(s5, C_MAJOR, 60, 2, s9Form, "clockwise");
  assert.equal(next.b, nearestPitch(s5.a, newStack.b)); // old a -> new b
  assert.equal(next.c, nearestPitch(s5.b, newStack.c)); // old b -> new c
  assert.equal(next.a, nearestPitch(s5.c, newStack.a)); // old c -> new a
});

test("constantAbc is the identity transformation -- each slot keeps its own letter (\"complete parallelism\", p.478)", () => {
  const s9 = hybridFormsForTension(9).find((f) => !f.marked);
  const voicing = stackedHybridChord(C_MAJOR, 60, 0, s9);
  const next = transformHybridVoicing(voicing, C_MAJOR, 60, 0, s9, "constantAbc");
  assert.deepEqual(next, voicing);
});

test("constantA holds a fixed and swaps b/c; constantB holds b fixed and swaps a/c; constantC holds c fixed and swaps a/b (p.479, Figure 191)", () => {
  // Use a genuine chord change (S5 -> S9, a whole step up), and compare
  // against nearestPitch applied directly, to distinguish "which old
  // voice fed this new slot" (all transforms land on the same target
  // pitch CLASSES -- what differs is which old note's octave anchors
  // the nearest-pitch search for each slot).
  const s5Form = hybridFormsForTension(5).find((f) => !f.marked);
  const s9Form = hybridFormsForTension(9).find((f) => !f.marked);
  const voicing = stackedHybridChord(C_MAJOR, 60, 0, s5Form);
  const target = stackedHybridChord(C_MAJOR, 60, 2, s9Form);

  const nextA = transformHybridVoicing(voicing, C_MAJOR, 60, 2, s9Form, "constantA");
  assert.equal(nextA.a, nearestPitch(voicing.a, target.a)); // a -> a
  assert.equal(nextA.c, nearestPitch(voicing.b, target.c)); // old b -> new c
  assert.equal(nextA.b, nearestPitch(voicing.c, target.b)); // old c -> new b

  const nextB = transformHybridVoicing(voicing, C_MAJOR, 60, 2, s9Form, "constantB");
  assert.equal(nextB.b, nearestPitch(voicing.b, target.b)); // b -> b
  assert.equal(nextB.c, nearestPitch(voicing.a, target.c)); // old a -> new c
  assert.equal(nextB.a, nearestPitch(voicing.c, target.a)); // old c -> new a

  const nextC = transformHybridVoicing(voicing, C_MAJOR, 60, 2, s9Form, "constantC");
  assert.equal(nextC.c, nearestPitch(voicing.c, target.c)); // c -> c
  assert.equal(nextC.b, nearestPitch(voicing.a, target.b)); // old a -> new b
  assert.equal(nextC.a, nearestPitch(voicing.b, target.a)); // old b -> new a
});
