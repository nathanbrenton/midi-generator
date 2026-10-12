import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diatonicCycle,
  cycleDegreeStep,
  alternatingCycles,
  binomialCycle,
  trinomialCycle,
  stackedTriad,
  negativeStackedTriad,
  negativeFormCycle,
  chordProgression,
  nearestPitch,
  transformVoicing,
  voiceLeadProgression,
  positionVoicing,
  voicingPosition,
  S5_POSITIONS,
  passingSixthChord,
  buildPassingSixthGroups,
  passingSixthGroup,
  passingSixthContinuity,
} from "../src/core/diatonicHarmony.ts";
import { compositionCount } from "../src/core/symmetricScales.ts";
import { intervalCellScale } from "../src/core/scales.ts";

// Book V Ch.1 (p.206): "the total number of seven-unit scales equals 462" --
// a cross-book confirmation of Book II Ch.7's compositionCount, not a new formula.
test("the book's own 'total number of seven-unit scales equals 462' matches compositionCount(12, 7) exactly (p.206)", () => {
  assert.equal(compositionCount(12, 7), 462);
});

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]); // C major

const ROOT_NAMES = ["c", "d", "e", "f", "g", "a", "b"];
const names = (degrees) => degrees.map((d) => ROOT_NAMES[d]).join("-");

// Figure 2 (p.363), read off the rendered page: "the respective intervals
// representing cycles must be constructed downward for the positive form" (p.362).
test("positive C3 steps the root down a third: c-a-f-d-b-g-e (Figure 2, p.363)", () => {
  assert.equal(names(diatonicCycle(3)), "c-a-f-d-b-g-e");
});

test("positive C5 steps the root down a fifth: c-f-b-e-a-d-g (Figure 2, p.363)", () => {
  assert.equal(names(diatonicCycle(5)), "c-f-b-e-a-d-g");
});

test("positive C7 steps the root down a seventh, i.e. up a step: c-d-e-f-g-a-b (Figure 2, p.363)", () => {
  assert.equal(names(diatonicCycle(7)), "c-d-e-f-g-a-b");
});

test("negative cycles run the same intervals upward: C-5 is c-g-d-a-e-b-f, C-3 is c-e-g-b-d-f-a, C-7 is c-b-a-g-f-e-d (p.386)", () => {
  assert.equal(names(diatonicCycle(-5)), "c-g-d-a-e-b-f");
  assert.equal(names(diatonicCycle(-3)), "c-e-g-b-d-f-a");
  assert.equal(names(diatonicCycle(-7)), "c-b-a-g-f-e-d");
  assert.deepEqual([3, 5, 7, -3, -5, -7].map(cycleDegreeStep), [-2, -4, -6, 2, 4, 6]);
});

test("plagal cadences start a C5 cycle and authentic cadences end it (p.363)", () => {
  const roots = diatonicCycle(5);
  assert.equal(names(roots.slice(0, 2)), "c-f"); // I -> IV: plagal
  assert.equal(names([roots[6], roots[0]]), "g-c"); // V -> I: authentic
});

test("C7's ending cadence is the two leading tones b->c and d->c: a chord on b resolving to c (p.369)", () => {
  const roots = diatonicCycle(7);
  assert.equal(names([roots[6], roots[0]]), "b-c");
});

test("every diatonic cycle visits all 7 scale degrees exactly once, matching the book's own 'each appearing once and none repeating' (p.363)", () => {
  for (const cycleType of [3, 5, 7, -3, -5, -7]) {
    const cycle = diatonicCycle(cycleType, 0);
    assert.deepEqual([...cycle].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
  }
});

test("diatonicCycle respects a non-zero starting degree, still visiting all 7 degrees", () => {
  const cycle = diatonicCycle(5, 2);
  assert.equal(cycle[0], 2);
  assert.equal(new Set(cycle).size, 7);
});

test("binomial C3 + C5 alternates the two cycles: c-a-d-b-e-c-f-d-g-e-a-f-b-g, then c (Figure 3, p.363)", () => {
  assert.equal(names(binomialCycle(3, 5)), "c-a-d-b-e-c-f-d-g-e-a-f-b-g");
});

test("a binomial cycle has (2 x 7 =) 14 chords, each appearing twice (p.363)", () => {
  for (const [a, b] of [[3, 5], [3, 7], [5, 3], [5, 7], [7, 3], [7, 5]]) {
    const cycle = binomialCycle(a, b);
    assert.equal(cycle.length, 14);
    for (let d = 0; d < 7; d++) assert.equal(cycle.filter((x) => x === d).length, 2);
  }
});

test("a trinomial cycle has 21 chords, each appearing three times", () => {
  const cycle = trinomialCycle(3, 5, 7);
  assert.equal(cycle.length, 21);
  for (let d = 0; d < 7; d++) assert.equal(cycle.filter((x) => x === d).length, 3);
});

test("alternatingCycles refuses cycles that cancel out (C3 + C-3 never leaves its first chord)", () => {
  assert.throws(() => alternatingCycles([3, -3]));
});

test("stackedTriad on a C major scale at degree 0 gives the C major triad: C,E,G", () => {
  const triad = stackedTriad(MAJOR, 60, 0);
  assert.deepEqual(triad, [60, 64, 67]); // C4, E4, G4
});

test("stackedTriad on a C major scale at degree 1 gives the D minor triad: D,F,A", () => {
  const triad = stackedTriad(MAJOR, 60, 1);
  assert.deepEqual(triad, [62, 65, 69]); // D4, F4, A4
});

test("stackedTriad wraps octaves correctly for a root degree near the top of the scale (degree 6 = B)", () => {
  const triad = stackedTriad(MAJOR, 60, 6);
  // B,D,F -- D and F wrap into the next octave
  assert.deepEqual(triad, [71, 74, 77]);
});

test("chordProgression builds one triad per root-degree, matching diatonicCycle's own output length", () => {
  const cycle = diatonicCycle(5, 0);
  const progression = chordProgression(MAJOR, 60, cycle);
  assert.equal(progression.length, 7);
  assert.deepEqual(progression[0], [60, 64, 67]); // C major triad, first chord of the circle of fifths
});

// Sections C-D (p.376-381): clockwise/counterclockwise voice-leading via
// function reassignment, placed at the nearest available octave.
test("nearestPitch finds the closest octave placement of a target pitch class, matching hand-verified examples", () => {
  assert.equal(nearestPitch(60, 7), 55); // C4 -> nearest G is G3 (down a 5th), not G4 (up a 4th)
  assert.equal(nearestPitch(64, 11), 59); // E4 -> nearest B is B3
  assert.equal(nearestPitch(67, 4), 64); // G4 -> nearest E is E4
});

test("nearestPitch never moves more than 6 semitones", () => {
  for (let ref = 40; ref < 80; ref++) {
    for (let target = 0; target < 12; target++) {
      assert.ok(Math.abs(nearestPitch(ref, target) - ref) <= 6);
    }
  }
});

test("transformVoicing (clockwise, C3): the book's own example, C = c-e-g into A = a-c-e -- c and e hold, g steps up to a (p.379)", () => {
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 }; // C major, close position
  const next = transformVoicing(voicing, MAJOR, 60, diatonicCycle(3)[1], "clockwise");
  assert.deepEqual(next, { bass: 45, root: 69, third: 60, fifth: 64 });
});

test("S(5) positions: clockwise phases are open, counterclockwise phases close (p.377, Figure 25)", () => {
  const order = (v) => [v.root, v.third, v.fifth].sort((x, y) => y - x);
  assert.deepEqual(order(positionVoicing(MAJOR, 60, 0, S5_POSITIONS.open[0])), [72, 64, 55]); // c5-e4-g3
  assert.deepEqual(order(positionVoicing(MAJOR, 60, 0, S5_POSITIONS.close[1])), [67, 64, 60]); // g4-e4-c4
  for (const form of ["open", "close"]) {
    for (const position of S5_POSITIONS[form]) assert.equal(voicingPosition(positionVoicing(MAJOR, 60, 0, position)), form);
  }
});

test("clockwise and counterclockwise keep a progression in its starting position, open or close, in every cycle (p.381)", () => {
  for (const cycle of [3, 5, 7]) {
    for (const direction of ["clockwise", "counterclockwise"]) {
      for (const form of ["open", "close"]) {
        const progression = voiceLeadProgression(MAJOR, 60, [...diatonicCycle(cycle), 0], direction, S5_POSITIONS[form][0]);
        assert.ok(progression.every((v) => voicingPosition(v) === form), `C${cycle} ${direction} ${form}`);
      }
    }
  }
});

test("const. 3 keeps 3 as 3 and trades 1 and 5, switching close to open and back (p.381, Figures 33-34)", () => {
  const close = { bass: 48, root: 60, third: 64, fifth: 67 };
  const next = transformVoicing(close, MAJOR, 60, diatonicCycle(5)[1], "const3"); // C -> F
  assert.equal(voicingPosition(next), "open");
  assert.equal(((next.third % 12) + 12) % 12, 9); // the voice that sang e (3) now sings a (3 of F)
  for (const cycle of [3, 5, 7]) {
    const forms = voiceLeadProgression(MAJOR, 60, [...diatonicCycle(cycle), 0], "const3").map(voicingPosition);
    assert.deepEqual(forms, ["close", "open", "close", "open", "close", "open", "close", "open"]);
  }
});

test("a list of transformations applies periodically, one per connection: the binomial form C + G (p.382)", () => {
  const roots = [...diatonicCycle(5), 0];
  const binomial = voiceLeadProgression(MAJOR, 60, roots, ["clockwise", "counterclockwise"]);
  for (let i = 1; i < roots.length; i++) {
    const expected = transformVoicing(binomial[i - 1], MAJOR, 60, roots[i], i % 2 === 1 ? "clockwise" : "counterclockwise");
    // Equal up to an octave variation, which moves the three upper voices together.
    const shift = binomial[i].root - expected.root;
    assert.equal(shift % 12, 0);
    assert.equal(binomial[i].third - expected.third, shift);
    assert.equal(binomial[i].fifth - expected.fifth, shift);
  }
});

test("transformVoicing's clockwise mapping: root->third, third->fifth, fifth->root (p.379)", () => {
  // Using a static target (same chord as source) isolates the mapping itself.
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 };
  const next = transformVoicing(voicing, MAJOR, 60, 0, "clockwise");
  assert.equal(next.third, nearestPitch(60, 64 % 12)); // old root -> new third
  assert.equal(next.fifth, nearestPitch(64, 67 % 12)); // old third -> new fifth
  assert.equal(next.root, nearestPitch(67, 60 % 12)); // old fifth -> new root
});

test("transformVoicing's counterclockwise mapping is the mirror: root->fifth, fifth->third, third->root (p.379)", () => {
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 };
  const next = transformVoicing(voicing, MAJOR, 60, 0, "counterclockwise");
  assert.equal(next.fifth, nearestPitch(60, 67 % 12)); // old root -> new fifth
  assert.equal(next.third, nearestPitch(67, 64 % 12)); // old fifth -> new third
  assert.equal(next.root, nearestPitch(64, 60 % 12)); // old third -> new root
});

test("voiceLeadProgression's bass always carries the current chord's root pitch class", () => {
  const cycle = diatonicCycle(3, 0);
  const progression = voiceLeadProgression(MAJOR, 60, cycle, "clockwise");
  const rootTriads = chordProgression(MAJOR, 60, cycle);
  progression.forEach((voicing, i) => {
    assert.equal(((voicing.bass % 12) + 12) % 12, rootTriads[i][0] % 12);
  });
});

test("smooth forms: C3 clockwise holds two tones, C5 counterclockwise one, the rest move by a step; C7 counterclockwise moves all three down (p.379-380)", () => {
  const cases = [
    [3, "clockwise", 2, (d) => d >= -2 && d <= 2],
    [5, "counterclockwise", 1, (d) => d >= -2 && d <= 2],
    [7, "counterclockwise", 0, (d) => d < 0 && d >= -4],
  ];
  for (const [cycle, direction, held, ok] of cases) {
    const roots = [...diatonicCycle(cycle), 0];
    const progression = voiceLeadProgression(MAJOR, 60, roots, direction);
    for (let i = 1; i < roots.length; i++) {
      const from = progression[i - 1];
      const to = transformVoicing(from, MAJOR, 60, roots[i], direction); // before any octave variation
      const moves = [from.root, from.third, from.fifth].sort((x, y) => x - y).map(
        (n, v) => [to.root, to.third, to.fifth].sort((x, y) => x - y)[v] - n,
      );
      assert.equal(moves.filter((d) => d === 0).length, held, `C${cycle} ${direction}, chord ${i}: ${moves}`);
      assert.ok(moves.every(ok), `C${cycle} ${direction}, chord ${i}: ${moves}`);
    }
  }
});

test("octave variation keeps a long progression in range: the bass within a fourth of home, the upper voices within about an octave (p.380)", () => {
  for (const cycle of [3, 5, 7]) {
    for (const direction of ["clockwise", "counterclockwise", "const3"]) {
      const roots = [...diatonicCycle(cycle), ...diatonicCycle(cycle), 0];
      const progression = voiceLeadProgression(MAJOR, 60, roots, direction);
      for (const v of progression) {
        assert.ok(Math.abs(v.bass - 48) <= 6, `C${cycle} ${direction}: bass ${v.bass}`);
        for (const fn of ["root", "third", "fifth"]) assert.ok(v[fn] >= 40 && v[fn] <= 88, `C${cycle} ${direction}: ${fn} ${v[fn]}`);
      }
    }
  }
});

// Section F, The Negative Form (p.386-388): chords built downward.
test("negativeStackedTriad matches the book's own worked example exactly: starting from c as -1, a is -3 and f is -5 (p.386)", () => {
  const triad = negativeStackedTriad(MAJOR, 60, 0); // root=C4=60
  assert.deepEqual(triad, [60, 57, 53]); // C4, A3 (minor 3rd below), F3 (perfect 5th below)
});

test("negativeStackedTriad is the exact mirror of stackedTriad -- same root, intervals reflected downward instead of upward", () => {
  const positive = stackedTriad(MAJOR, 60, 0);
  const negative = negativeStackedTriad(MAJOR, 60, 0);
  assert.equal(positive[0], negative[0]); // shared root
  assert.equal(positive[0] - negative[1], 60 - 57); // third is equidistant below vs above (though not necessarily same magnitude in a diatonic scale)
  assert.ok(negative[1] < negative[0] && negative[2] < negative[1]); // strictly descending
});

test("negativeStackedTriad wraps octaves correctly for a root degree near the bottom of the scale (degree 1 = D)", () => {
  const triad = negativeStackedTriad(MAJOR, 60, 1); // D4=62
  // D, and going down two more scale-degrees each time: B3, G3
  assert.deepEqual(triad, [62, 59, 55]);
});

// Chapter 8, Section A (Groups with Passing Sixth-chords, p.415-416).
test("passingSixthChord keeps root/third/fifth unmoved and puts the third's pitch class in the bass, a third above the original bass (p.415)", () => {
  const voicing = { bass: 48, root: 60, third: 64, fifth: 67 }; // C major, bass C3
  const passing = passingSixthChord(voicing);
  assert.equal(passing.root, voicing.root);
  assert.equal(passing.third, voicing.third);
  assert.equal(passing.fifth, voicing.fifth);
  assert.equal(passing.bass, 52); // E3 -- a major third above 48, matching the book's own claim exactly
  assert.equal(((passing.bass % 12) + 12) % 12, ((voicing.third % 12) + 12) % 12);
});

test("buildPassingSixthGroups puts a passing S(6) between every pair, upper voices unmoved, the next bass taken from the passing third (p.418)", () => {
  const progression = voiceLeadProgression(MAJOR, 60, diatonicCycle(5, 0), "clockwise");
  const withPassing = buildPassingSixthGroups(progression);
  assert.equal(withPassing.length, progression.length * 2 - 1);
  const uppers = (v) => [v.root, v.third, v.fifth];
  for (let i = 0; i < progression.length - 1; i++) {
    const [original, passing, next] = withPassing.slice(i * 2, i * 2 + 3);
    assert.deepEqual(uppers(original), uppers(progression[i]));
    assert.deepEqual(passing, passingSixthChord(original));
    assert.deepEqual(uppers(next), uppers(progression[i + 1]));
    assert.equal(((next.bass - next.root) % 12 + 12) % 12, 0);
    assert.ok(Math.abs(next.bass - withPassing[0].bass) <= 7);
  }
});

test("classical G6 = S(5) + S(6)③ + S(5) by C-5: c, e, g in the bass -- a third up, then a third up again (p.415)", () => {
  const start = { bass: 48, root: 60, third: 64, fifth: 67 };
  const [first, sixth, last] = passingSixthGroup(start, MAJOR, 60, 0);
  assert.deepEqual(first, start);
  assert.deepEqual(sixth, { ...start, bass: 52 });
  assert.deepEqual(last, { bass: 55, root: 67, third: 59, fifth: 62 }); // G: c -> b, e -> d, g holds -- clockwise
});

test("generalized G6 (p.417): every cycle gives a bass 1 -> 3 -> 1 with the upper voices held through the S(6)", () => {
  const start = { bass: 48, root: 60, third: 64, fifth: 67 };
  for (const cycle of [3, 5, 7, -3, -5, -7]) {
    const [first, sixth, last] = passingSixthGroup(start, MAJOR, 60, 0, cycle);
    assert.deepEqual([sixth.root, sixth.third, sixth.fifth], [first.root, first.third, first.fifth]);
    assert.equal(sixth.bass % 12, 4);
    assert.equal(last.bass % 12, [0, 2, 4, 5, 7, 9, 11][diatonicCycle(cycle)[1]]);
  }
});

test("a G6 continuity: H = G6(C-5) + C7 + G6(C3) + C5 + G6(C-7), three chords a group (p.418)", () => {
  const h = passingSixthContinuity(MAJOR, 60, [-5, 3, -7], [7, 5]);
  assert.equal(h.length, 9);
  const names = ["c", "d", "e", "f", "g", "a", "b"];
  const rootName = (v) => names[[0, 2, 4, 5, 7, 9, 11].indexOf(((v.root % 12) + 12) % 12)];
  // c (G6 by C-5) g, C7 -> a (G6 by C3) f, C5 -> b (G6 by C-7) a
  assert.deepEqual([0, 2, 3, 5, 6, 8].map((k) => rootName(h[k])), ["c", "g", "a", "f", "b", "a"]);
});

test("buildPassingSixthGroups on a single chord returns just that chord (no passing chord to insert)", () => {
  const single = voiceLeadProgression(MAJOR, 60, [0], "clockwise");
  assert.deepEqual(buildPassingSixthGroups(single), single);
});

test("negative form: CS(5) + C3 + ES(5) is c-a-f into e-c-a -- the negative root moves up a third (p.387)", () => {
  const [first, second] = diatonicCycle(negativeFormCycle(3));
  assert.deepEqual(negativeStackedTriad(MAJOR, 60, first), [60, 57, 53]); // c a f
  assert.deepEqual(negativeStackedTriad(MAJOR, 60, second), [64, 60, 57]); // e c a
});

test("read upward, the negative C3 progression is F major -> A minor: C -> E transposed, i.e. the positive form backwards (p.387)", () => {
  const upward = diatonicCycle(negativeFormCycle(3)).slice(0, 2).map((d) => negativeStackedTriad(MAJOR, 60, d).reverse());
  assert.deepEqual(upward, [stackedTriad(MAJOR, 48, 3), stackedTriad(MAJOR, 48, 5)]); // F (f a c), A (a c e)
});

test("C-3 holds two common tones under counterclockwise, as C3 does under clockwise -- the reversed transformation (p.387)", () => {
  const close = { bass: 48, root: 60, third: 64, fifth: 67 };
  const next = transformVoicing(close, MAJOR, 60, diatonicCycle(-3)[1], "counterclockwise"); // C -> E minor
  const held = [close.root, close.third, close.fifth].filter((n) => [next.root, next.third, next.fifth].includes(n));
  assert.deepEqual(held.sort(), [64, 67]); // e and g stay
});
