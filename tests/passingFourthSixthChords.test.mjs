import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFourSixGroup, orderForDirection } from "../src/core/passingFourthSixthChords.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const C_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const START = { bass: 48, root: 60, third: 64, fifth: 67 }; // C major, root position

function pc(n) {
  return ((n % 12) + 12) % 12;
}

test("S(5) (first chord) is the starting voicing unchanged", () => {
  const [s5] = buildFourSixGroup(START, C_MAJOR, 60, 0, "third");
  assert.equal(pc(s5.bass), 0); // C
  assert.deepEqual(s5.upper.map(pc).sort((a, b) => a - b), [0, 4, 7]); // C,E,G
});

test("S(4/6) (passing chord) has the fifth in the bass, borrowed from the C-5-related chord (p.427, 429)", () => {
  const [, fourSix] = buildFourSixGroup(START, C_MAJOR, 60, 0, "third");
  assert.equal(pc(fourSix.bass), 0); // C -- the fifth of the C-5 chord (F major), matching S(5)'s own root by coincidence
  assert.deepEqual(fourSix.upper.map(pc).sort((a, b) => a - b), [0, 5, 9]); // F,A,C (F major -- a fifth below C)
});

test("S(6)③ (doubled third) is identical in shape to Ch.8-A's plain S(6): bass=third, upper={root,third,fifth} (p.427)", () => {
  const [, , sixth] = buildFourSixGroup(START, C_MAJOR, 60, 0, "third");
  assert.equal(pc(sixth.bass), 4); // E (the third)
  assert.deepEqual(sixth.upper.map(pc).sort((a, b) => a - b), [0, 4, 7]); // C,E,G -- back to the ORIGINAL chord, not a new one
});

test("S(6)① (doubled root): bass=third, upper={root,root,fifth} -- third is absent from the upper voices (p.427, matching upperVoiceFunctions(1,3)={1,1,5})", () => {
  const [, , sixth] = buildFourSixGroup(START, C_MAJOR, 60, 0, "root");
  assert.equal(pc(sixth.bass), 4); // E (the third)
  assert.deepEqual(sixth.upper.map(pc).sort((a, b) => a - b), [0, 0, 7]); // C,C,G -- root doubled, no E anywhere in the uppers
});

test("the doubled root in S(6)① sits above the rest of the chord, not in unison with the plain root", () => {
  const [, , sixth] = buildFourSixGroup(START, C_MAJOR, 60, 0, "root");
  const roots = sixth.upper.filter((n) => pc(n) === 0);
  assert.equal(roots.length, 2);
  assert.notEqual(roots[0], roots[1], "the two root-pitch-class voices must be genuinely distinct notes");
});

test("the group is reversible: descending is exactly the same three chords in reverse order (p.428)", () => {
  const group = buildFourSixGroup(START, C_MAJOR, 60, 0, "third");
  const ascending = orderForDirection(group, "ascending");
  const descending = orderForDirection(group, "descending");
  assert.deepEqual(ascending, [group[0], group[1], group[2]]);
  assert.deepEqual(descending, [group[2], group[1], group[0]]);
});

test("the C-5-then-C5 round trip returns to the exact original chord, not a different one, for a non-C-root starting chord too", () => {
  // G major, root position: bass 55(G3), root 67(G4), third 71(B4), fifth 74(D5).
  const startG = { bass: 55, root: 67, third: 71, fifth: 74 };
  const [s5, , sixth] = buildFourSixGroup(startG, C_MAJOR, 60, 4, "third"); // rootMidiNote anchors degree 0 to C; degree 4 = G
  assert.deepEqual(s5.upper.map(pc).sort((a, b) => a - b), [2, 7, 11]); // G,B,D
  assert.deepEqual(sixth.upper.map(pc).sort((a, b) => a - b), [2, 7, 11]); // back to G,B,D, not a new chord
});
