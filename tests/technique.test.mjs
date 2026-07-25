import { test } from "node:test";
import assert from "node:assert/strict";
import { buildResultantForTechnique, ALL_TECHNIQUES } from "../src/core/technique.ts";
import { generateResultant } from "../src/core/resultant.ts";
import { generateFractionedResultant } from "../src/core/fractioning.ts";
import { buildExpansion, buildContraction, buildBalance } from "../src/core/groupsByPairs.ts";

test("buildResultantForTechnique matches each dedicated builder", () => {
  const a = 4, b = 3;
  assert.deepEqual(buildResultantForTechnique("plain", a, b), generateResultant([a, b]));
  assert.deepEqual(buildResultantForTechnique("fractioned", a, b), generateFractionedResultant(a, b));
  assert.deepEqual(buildResultantForTechnique("expansion", a, b), buildExpansion(a, b));
  assert.deepEqual(buildResultantForTechnique("contraction", a, b), buildContraction(a, b));
  assert.deepEqual(buildResultantForTechnique("balance", a, b), buildBalance(a, b));
});

test("ALL_TECHNIQUES lists exactly the five techniques", () => {
  assert.deepEqual([...ALL_TECHNIQUES].sort(), ["balance", "contraction", "expansion", "fractioned", "plain"].sort());
});
