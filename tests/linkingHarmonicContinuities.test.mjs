import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LINKING_FORMS,
  linkingForm,
  linkThroughGroup,
  symmetricSectionStarts,
  tonicSystemOfInterval,
  isDistinctSymmetricConnection,
  chromaticConnectionAvoidsSteps,
  keysContaining,
  diatonicCycleConnection,
} from "../src/core/linkingHarmonicContinuities.ts";
import { voiceLeadProgression, passingSixthChord, transformVoicing, diatonicCycle } from "../src/core/diatonicHarmony.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const C_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const pcs = (notes) => notes.map((n) => ((n % 12) + 12) % 12);

test("LINKING_FORMS: exactly the 9 progression x connection pairings, each once (p.554)", () => {
  assert.equal(LINKING_FORMS.length, 9);
  const pairs = new Set(LINKING_FORMS.map((f) => `${f.progression}/${f.connection}`));
  assert.equal(pairs.size, 9);
  assert.deepEqual(LINKING_FORMS.map((f) => f.number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("LINKING_FORMS: extra-chord answers match the book form by form (p.555-558)", () => {
  assert.equal(linkingForm("diatonic", "diatonic").extraChord, true);
  assert.equal(linkingForm("diatonic", "symmetric").extraChord, false); // "not an extra chord, but rather an interval"
  assert.equal(linkingForm("diatonic", "chromatic").extraChord, true);
  assert.equal(linkingForm("symmetric", "diatonic").extraChord, false);
  assert.equal(linkingForm("symmetric", "symmetric").extraChord, null); // the book doesn't say
  assert.equal(linkingForm("symmetric", "chromatic").extraChord, true);
  assert.equal(linkingForm("chromatic", "diatonic").extraChord, false);
  assert.equal(linkingForm("chromatic", "symmetric").extraChord, false);
  assert.equal(linkingForm("chromatic", "chromatic").extraChord, true);
});

test("linkThroughGroup: the group's ends ARE the progressions' boundary chords; only its middle chord is added (p.555)", () => {
  const linked = linkThroughGroup([1, 2, 3], [3, 99, 4], [4, 5], (a, b) => a === b);
  assert.deepEqual(linked, [1, 2, 3, 99, 4, 5]);
});

test("linkThroughGroup refuses a group whose ends don't coincide with the progressions it claims to join", () => {
  const same = (a, b) => a === b;
  assert.throws(() => linkThroughGroup([1, 2, 3], [7, 99, 4], [4, 5], same));
  assert.throws(() => linkThroughGroup([1, 2, 3], [3, 99, 7], [4, 5], same));
});

test("linkThroughGroup joins two real C5 progressions through Ch.8's own G6 group, gaining exactly one chord", () => {
  const degrees = diatonicCycle(5).slice(0, 4); // C, G, D, A
  const first = voiceLeadProgression(C_MAJOR, 60, degrees.slice(0, 2), "clockwise");
  const last = first[first.length - 1];
  const next = transformVoicing(last, C_MAJOR, 60, degrees[2], "clockwise");
  const succeeding = [next, transformVoicing(next, C_MAJOR, 60, degrees[3], "clockwise")];

  const group = [last, passingSixthChord(last), next];
  const linked = linkThroughGroup(first, group, succeeding, (a, b) => JSON.stringify(a) === JSON.stringify(b));
  assert.equal(linked.length, first.length + succeeding.length + 1);
  assert.deepEqual(linked[first.length], passingSixthChord(last)); // the extra chord is the passing S(6)
});

test("symmetricSectionStarts: each section starts one tonic-gap from the last (p.556)", () => {
  assert.deepEqual(symmetricSectionStarts(60, 3, 4), [60, 64, 68, 72]); // cube-root-2: steps of 4
  assert.deepEqual(symmetricSectionStarts(60, 2, 3), [60, 66, 72]); // root-2: steps of 6
});

test("tonicSystemOfInterval: an interval's own form of symmetry is 12/gcd(interval,12) tonics", () => {
  assert.equal(tonicSystemOfInterval(6), 2);
  assert.equal(tonicSystemOfInterval(4), 3);
  assert.equal(tonicSystemOfInterval(8), 3); // same form as 4
  assert.equal(tonicSystemOfInterval(3), 4);
  assert.equal(tonicSystemOfInterval(9), 4);
  assert.equal(tonicSystemOfInterval(2), 6);
  assert.equal(tonicSystemOfInterval(1), 12);
  assert.equal(tonicSystemOfInterval(5), 12); // coprime to 12 -- walks all twelve
  assert.equal(tonicSystemOfInterval(0), 1); // the zero cycle
  assert.equal(tonicSystemOfInterval(-4), 3); // direction doesn't change the form
});

test("isDistinctSymmetricConnection: the connection's form of symmetry must not appear in the progression (p.556)", () => {
  assert.equal(isDistinctSymmetricConnection([4, 4, 4], 6), true); // 3-tonic progression, 2-tonic connection
  assert.equal(isDistinctSymmetricConnection([4, 4, 4], 8), false); // 8 is the same 3-tonic form
  assert.equal(isDistinctSymmetricConnection([3, 6, 3], 6), false); // 6 already appears as a step
});

test("chromaticConnectionAvoidsSteps compares pitch-class intervals, so +4 and -8 are the same step (p.557)", () => {
  assert.equal(chromaticConnectionAvoidsSteps([4, 4, 4], 1), true);
  assert.equal(chromaticConnectionAvoidsSteps([4, 4, 4], 4), false);
  assert.equal(chromaticConnectionAvoidsSteps([4, 4, 4], -8), false);
  assert.equal(chromaticConnectionAvoidsSteps([4, 4, 4], 8), true); // +8 is a different directed pitch-class step
});

test("keysContaining matches standard theory for every triad quality in major keys", () => {
  assert.deepEqual(keysContaining([0, 4, 7]), [0, 5, 7]); // C major: I of C, V of F, IV of G
  assert.deepEqual(keysContaining([9, 0, 4]), [0, 5, 7]); // A minor: vi of C, iii of F, ii of G
  assert.deepEqual(keysContaining([2, 5, 9]), [0, 5, 10]); // D minor: ii of C, vi of F, iii of Bb
  assert.deepEqual(keysContaining([11, 2, 5]), [0]); // B diminished: only vii of C
  assert.deepEqual(keysContaining([0, 4, 8]), []); // augmented: in no major key
});

test("diatonicCycleConnection: C major, C5, lands on G -- major in C and G, minor in F (the key decides the quality)", () => {
  assert.deepEqual(pcs(diatonicCycleConnection(0, 0, 5).triad), [7, 11, 2]); // C is I in C -> V, G major
  assert.deepEqual(pcs(diatonicCycleConnection(0, 7, 5).triad), [7, 11, 2]); // C is IV in G -> I, G major
  assert.deepEqual(pcs(diatonicCycleConnection(0, 5, 5).triad), [7, 10, 2]); // C is V in F -> ii, G minor
});

test("diatonicCycleConnection: negative cycles step backward -- C-5 from C in C major lands on F", () => {
  assert.deepEqual(pcs(diatonicCycleConnection(0, 0, -5).triad), [5, 9, 0]);
  assert.deepEqual(pcs(diatonicCycleConnection(0, 0, 3).triad), [4, 7, 11]); // C3: C -> E minor
});

test("diatonicCycleConnection refuses a root that isn't a degree of the chosen key", () => {
  assert.throws(() => diatonicCycleConnection(1, 0, 5)); // C# is not in C major
});
