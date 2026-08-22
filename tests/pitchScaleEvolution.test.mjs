import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intervalInterferenceResultant,
  circularIntervalInterference,
  intervalInterferenceChain,
  slidingWindowMerge,
  slidingWindowSelect,
  intervalsToMidiNotes,
} from "../src/core/pitchScaleEvolution.ts";
import { generalPermutations, circularPermutations } from "../src/core/permutations.ts";
import { interferenceGroupSizes } from "../src/core/rhythmStyleEvolution.ts";

test("intervalInterferenceResultant(3,2) matches the book's own example exactly: 2,1,2 (p.115)", () => {
  assert.deepEqual(intervalInterferenceResultant(3, 2), [2, 1, 2]);
});

test("intervalInterferenceResultant(4,1) matches the book's own example exactly: 1,3,1 (p.115)", () => {
  assert.deepEqual(intervalInterferenceResultant(4, 1), [1, 3, 1]);
});

test("intervalInterferenceResultant is symmetric -- (a,b) and (b,a) give the same resultant", () => {
  assert.deepEqual(intervalInterferenceResultant(3, 2), intervalInterferenceResultant(2, 3));
});

test("intervalInterferenceResultant always sums to a+b", () => {
  for (const [a, b] of [[3, 2], [4, 1], [5, 3], [7, 2]]) {
    assert.equal(
      intervalInterferenceResultant(a, b).reduce((x, y) => x + y, 0),
      a + b,
    );
  }
});

test("generalPermutations of the book's own resultant trinomial (2,1,2) gives exactly the 3 forms the book lists (p.115)", () => {
  const rows = generalPermutations([2, 1, 2]).map((r) => r.join(","));
  assert.deepEqual(new Set(rows), new Set(["2,1,2", "2,2,1", "1,2,2"]));
});

test("circularPermutations of the c-d-e-g-a scale's own 5-interval sequence matches the book's own d1 exactly (p.117)", () => {
  const d0 = [2, 2, 3, 2, 3]; // c-d-e-g-a, wrapping to the octave
  const rotations = circularPermutations(d0);
  assert.deepEqual(rotations[1], [2, 3, 2, 3, 2]); // d1: d-e-g-a-c
});

test("slidingWindowMerge with window 2 on the book's own 6-interval example matches all 5 listed rows exactly (p.119)", () => {
  const intervals = [2, 2, 1, 2, 2, 1];
  assert.deepEqual(slidingWindowMerge(intervals, 2), [
    [4, 1, 2, 2, 1],
    [2, 3, 2, 2, 1],
    [2, 2, 3, 2, 1],
    [2, 2, 1, 4, 1],
    [2, 2, 1, 2, 3],
  ]);
});

test("slidingWindowMerge always preserves the total sum", () => {
  const intervals = [2, 2, 1, 2, 2, 1];
  const total = intervals.reduce((a, b) => a + b, 0);
  for (const merged of slidingWindowMerge(intervals, 3)) {
    assert.equal(merged.reduce((a, b) => a + b, 0), total);
  }
});

test("slidingWindowSelect with window 5 on the book's own 6-interval example matches both listed 'partial six-unit scales' (p.120)", () => {
  const intervals = [2, 2, 1, 2, 2, 1];
  assert.deepEqual(slidingWindowSelect(intervals, 5), [
    [2, 2, 1, 2, 2],
    [2, 1, 2, 2, 1],
  ]);
});

test("slidingWindowSelect and slidingWindowMerge both throw for an out-of-range window size", () => {
  assert.throws(() => slidingWindowSelect([1, 2, 3], 0));
  assert.throws(() => slidingWindowSelect([1, 2, 3], 4));
  assert.throws(() => slidingWindowMerge([1, 2, 3], 4));
});

test("intervalsToMidiNotes produces intervals.length + 1 notes via cumulative sum from root", () => {
  assert.deepEqual(intervalsToMidiNotes(60, [2, 1, 2]), [60, 62, 63, 65]);
});

// Section A's interference chain (p.114-117), missed on first read: the
// book recursively re-interferes each stage's own output using CIRCULAR
// permutations (not every general permutation -- general permutations
// overshoot to full uniformity one stage early).
test("circularIntervalInterference generalizes intervalInterferenceResultant -- N=2 matches exactly", () => {
  assert.deepEqual(circularIntervalInterference([3, 2]), intervalInterferenceResultant(3, 2));
  assert.deepEqual(circularIntervalInterference([4, 1]), intervalInterferenceResultant(4, 1));
});

test("circularIntervalInterference of the book's own trinomial (4,4,3) matches its own listed quintinomial row as a multiset: 1,3,3,1,3 (p.116)", () => {
  const result = circularIntervalInterference([4, 4, 3]);
  assert.deepEqual([...result].sort(), [1, 1, 3, 3, 3]);
  assert.equal(
    result.reduce((a, b) => a + b, 0),
    11,
  );
});

test("circularIntervalInterference of the quintinomial gives exactly a 9-term resultant, matching the book's own 'ten units and nine intervals' exactly (p.114)", () => {
  const quintinomial = circularIntervalInterference([4, 4, 3]);
  const nineTerm = circularIntervalInterference(quintinomial);
  assert.equal(nineTerm.length, 9);
  assert.equal(
    nineTerm.reduce((a, b) => a + b, 0),
    11,
  );
});

test("using general permutations instead of circular ones overshoots to full uniformity one stage early -- confirming circular is the book's own rule, not general", () => {
  const quintinomial = circularIntervalInterference([4, 4, 3]);
  // Recompute the next stage using ALL general permutations instead of just circular rotations.
  const total = quintinomial.reduce((a, b) => a + b, 0);
  const points = new Set([0]);
  for (const perm of generalPermutations(quintinomial)) {
    let cursor = 0;
    for (const v of perm) {
      cursor += v;
      points.add(cursor);
    }
  }
  const overshot = [...points].sort((a, b) => a - b);
  assert.equal(overshot.length - 1, total); // every integer position filled = full uniformity, 11 terms not 9
});

test("intervalInterferenceChain reproduces the book's own trinomial->quintinomial->9-term progression in one call", () => {
  const chain = intervalInterferenceChain([4, 4, 3], 2);
  assert.equal(chain.length, 3);
  assert.deepEqual(chain[0], [4, 4, 3]);
  assert.deepEqual([...chain[1]].sort(), [1, 1, 3, 3, 3]);
  assert.equal(chain[2].length, 9);
});

test("the interference chain's term-count growth (3->5->9) follows the same recurrence as Book I Ch.13's i_n=2*i_(n-1)-1 (interferenceGroupSizes), just starting from 3 instead of 2", () => {
  const chain = intervalInterferenceChain([4, 4, 3], 2);
  const counts = chain.map((stage) => stage.length);
  assert.deepEqual(counts, [3, 5, 9]);
  for (let i = 1; i < counts.length; i++) {
    assert.equal(counts[i], 2 * counts[i - 1] - 1);
  }
  // Cross-check against Book I's own recurrence starting from its own base case (2), for a different chain length.
  assert.deepEqual(interferenceGroupSizes(5), [2, 3, 5, 9, 17]);
});

test("intervalInterferenceChain eventually reaches uniformity (all-1s) for a small/dense starting binomial, and stays there -- the book's own 'neutral, terminal' case", () => {
  const chain = intervalInterferenceChain([3, 2], 3);
  assert.deepEqual(chain[2], [1, 1, 1, 1, 1]);
  assert.deepEqual(chain[3], [1, 1, 1, 1, 1]); // uniformity is a fixed point
});
