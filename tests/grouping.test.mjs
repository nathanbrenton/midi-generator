import { test } from "node:test";
import assert from "node:assert/strict";
import { computeGroupings } from "../src/core/grouping.ts";

test("3:2 groups into the three expected bar layouts", () => {
  const groupings = computeGroupings(3, 2);
  assert.deepEqual(groupings, [
    { label: "By common product (c.p.)", bars: 1, unitsPerBar: 6 },
    { label: "By major generator (a)", bars: 2, unitsPerBar: 3 },
    { label: "By minor generator (b)", bars: 3, unitsPerBar: 2 },
  ]);
});

test("every grouping's bars * unitsPerBar equals the common product", () => {
  for (const [a, b] of [[3, 2], [5, 3], [9, 8], [7, 4]]) {
    for (const grouping of computeGroupings(a, b)) {
      assert.equal(grouping.bars * grouping.unitsPerBar, a * b);
    }
  }
});
