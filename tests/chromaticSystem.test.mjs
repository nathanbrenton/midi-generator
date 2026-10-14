import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAJOR_BASIS_OPERATIONS,
  MINOR_BASIS_OPERATIONS,
  chromaticPitchPath,
  chromaticGroupFunctionTriples,
  chromaticGroupFormCount,
  chromaticGroupRoots,
  basisOperations,
  canLowerSeventh,
  PARALLEL_DOUBLE_CHROMATICS,
  parallelChromatics,
  coincidingChromaticGroup,
} from "../src/core/chromaticSystem.ts";

test("MAJOR_BASIS_OPERATIONS / MINOR_BASIS_OPERATIONS match the book's own table exactly -- opposite directions (p.498)", () => {
  assert.deepEqual(MAJOR_BASIS_OPERATIONS, [
    { function: "root", direction: "raise" },
    { function: "third", direction: "lower" },
    { function: "fifth", direction: "raise" },
  ]);
  assert.deepEqual(MINOR_BASIS_OPERATIONS, [
    { function: "root", direction: "lower" },
    { function: "third", direction: "raise" },
    { function: "fifth", direction: "lower" },
  ]);
});

test("chromaticPitchPath matches the book's own g-g#-a and g-gb-f examples (p.495)", () => {
  assert.deepEqual(chromaticPitchPath(7, "raise"), [7, 8, 9]); // g -> g# -> a
  assert.deepEqual(chromaticPitchPath(7, "lower"), [7, 6, 5]); // g -> gb -> f
});

test("chromaticGroupFunctionTriples generates all 64 ordered triples from {1,3,5,7} (p.497, Figure 211)", () => {
  const triples = chromaticGroupFunctionTriples();
  assert.equal(triples.length, 64);
  const unique = new Set(triples.map((t) => t.join(",")));
  assert.equal(unique.size, 64);
  for (const [a, b, c] of triples) {
    for (const fn of [a, b, c]) assert.ok([1, 3, 5, 7].includes(fn));
  }
  // "16 different versions for each starting function"
  for (const start of [1, 3, 5, 7]) {
    assert.equal(triples.filter(([a]) => a === start).length, 16);
  }
});

test("chromaticGroupFormCount matches the book's own stated total exactly: 4,928 (p.498)", () => {
  const { perStartingFunction, total } = chromaticGroupFormCount();
  assert.equal(perStartingFunction, 1232); // 16 x (28 + 49)
  assert.equal(total, 4928); // 4 x 1232, matching "4(784+448) = 4,928"
});

test("chromaticGroupRoots reproduces the book's own fully worked example (p.497, editor's note): C major triad, root raised, function triple 1-3-5 -- chord1's root is C", () => {
  const [root1] = chromaticGroupRoots(
    { root: 0, structure: 1 }, // C major
    { function: "root", direction: "raise" },
    [1, 3, 5],
    1, // chord2: major
    1, // chord3: major
  );
  assert.equal(root1, 0); // C -- the pitch path's first pitch IS chord1's root when function[0] is "root"
});

test("chromaticGroupRoots's pitch path matches the book's own C-C#-D worked example (p.497) regardless of chord2/3 structure", () => {
  const startChord = { root: 0, structure: 1 }; // C major
  const operation = { function: "root", direction: "raise" };
  // The moving voice's own pitches: C(0) -> C#(1) -> D(2). Recover them by re-deriving each
  // chord's root plus that chord's own function offset for the triple's label.
  const [root1, root2, root3] = chromaticGroupRoots(startChord, operation, [1, 3, 5], 1, 1);
  assert.equal(root1 + 0, 0); // chord1 root + "root" offset = C
  assert.equal(root2 + 4, 1); // chord2 root + "third" offset (major) = C#
  assert.equal(root3 + 7, 2); // chord3 root + "fifth" offset = D
});

const op = (o) => `${o.function}:${o.direction}`;

test("Section A: the augmented basis takes the major's operations without the fifth; the diminished takes the minor's (p.501)", () => {
  assert.deepEqual(basisOperations(3).map(op), ["root:raise", "third:lower"]);
  assert.deepEqual(basisOperations(4).map(op), ["root:lower", "third:raise"]);
  assert.deepEqual(basisOperations(1), MAJOR_BASIS_OPERATIONS);
  assert.deepEqual(basisOperations(2), MINOR_BASIS_OPERATIONS);
});

test("Section B: the seventh is lowered from every S(7) except the diminished (p.503)", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].filter((s) => !canLowerSeventh(s)), [5]);
});

test("Section C: c-cb-bb takes e-eb along; c-c#-d takes eb-e (p.504)", () => {
  const [lowerRoot] = PARALLEL_DOUBLE_CHROMATICS[1];
  assert.deepEqual(chromaticPitchPath(60, lowerRoot.fundamental.direction), [60, 59, 58]); // c, cb, bb
  assert.deepEqual(chromaticPitchPath(64, lowerRoot.complementary.direction).slice(0, 2), [64, 63]); // e, eb
  const [raiseRoot] = PARALLEL_DOUBLE_CHROMATICS[2];
  assert.deepEqual(chromaticPitchPath(60, raiseRoot.fundamental.direction), [60, 61, 62]); // c, c#, d
  assert.deepEqual(chromaticPitchPath(63, raiseRoot.complementary.direction).slice(0, 2), [63, 64]); // eb, e
  // The fundamental operation always comes from the opposite basis.
  for (const { fundamental } of PARALLEL_DOUBLE_CHROMATICS[1]) assert.ok(!MAJOR_BASIS_OPERATIONS.some((o) => op(o) === op(fundamental)));
  for (const { fundamental } of PARALLEL_DOUBLE_CHROMATICS[2]) assert.ok(!MINOR_BASIS_OPERATIONS.some((o) => op(o) === op(fundamental)));
});

test("Section D: triple and quadruple parallel chromatics keep the diminished structures, every function raised (p.507)", async () => {
  const { symmetricTriad, symmetricSeventhChord } = await import("../src/core/symmetricHarmony.ts");
  assert.deepEqual(parallelChromatics(symmetricTriad(4, 59)), symmetricTriad(4, 60));
  assert.deepEqual(parallelChromatics(symmetricSeventhChord(5, 59)), symmetricSeventhChord(5, 60));
});

test("Section G: coinciding groups outward from a unison end a major third apart, inward from an octave a minor sixth (p.516)", () => {
  const [up, down] = coincidingChromaticGroup(60, "outward");
  assert.equal(up[2] - down[2], 4);
  const [low, high] = coincidingChromaticGroup(60, "inward");
  assert.equal(high[2] - low[2], 8);
});
