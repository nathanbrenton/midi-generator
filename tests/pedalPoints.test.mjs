import { test } from "node:test";
import assert from "node:assert/strict";
import {
  axisOfMotion,
  triadMotion,
  seventhMotion,
  AXIS_TECHNIQUES,
  classicalPedalPoint,
  CLASSICAL_CADENCES,
  PEDAL_POINT_LOCATIONS,
  DIATONIC_PEDAL_FORMS,
  keyTendencies,
  pedalAcceptsKey,
  keysOverPedal,
  modulatingPedalPoint,
  symmetricPedalPoint,
} from "../src/core/pedalPoints.ts";
import { voiceLeadProgression, diatonicCycle } from "../src/core/diatonicHarmony.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const pcName = (n) => ["c", "db", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"][((n % 12) + 12) % 12];

// Introduction (p.559-560).
test("a-axis in three parts: C3 ↻ and C5 ↺ ascend gradually, C3 ↺ ascends in leaps (p.559)", () => {
  const motion = (cycle, t) => axisOfMotion(triadMotion(MAJOR, 60, cycle, t));
  assert.deepEqual(motion(3, "clockwise"), { axis: "a", largestMove: 2 });
  assert.deepEqual(motion(5, "counterclockwise"), { axis: "a", largestMove: 2 });
  const leaps = motion(3, "counterclockwise");
  assert.equal(leaps.axis, "a");
  assert.ok(leaps.largestMove > 2);
});

test("all the negative forms of continuous S(7) produce the a-axis; the positive ones, C7 ↺ among them, the extended descent (p.559-560)", () => {
  for (const c of [-3, -5, -7]) assert.equal(axisOfMotion(seventhMotion(MAJOR, 60, c)).axis, "a", `C${c}`);
  for (const c of [3, 5, 7]) assert.equal(axisOfMotion(seventhMotion(MAJOR, 60, c)).axis, "b", `C${c}`);
});

test("↻ C5 in three parts descends (p.560)", () => {
  assert.equal(axisOfMotion(triadMotion(MAJOR, 60, 5, "clockwise")).axis, "b");
});

test("C7 ↻ in three parts: every voice leaps a fourth or fifth -- 'vigorous' -- and, kept in range, the motion alternates (p.560)", () => {
  const raw = triadMotion(MAJOR, 60, 7, "clockwise");
  for (let i = 1; i < raw.length; i++) {
    const before = [...raw[i - 1]].sort((x, y) => x - y);
    const after = [...raw[i]].sort((x, y) => x - y);
    assert.ok(after.every((p, k) => Math.abs(p - before[k]) >= 5), `chord ${i}`);
  }
  const ranged = voiceLeadProgression(MAJOR, 60, Array.from({ length: 15 }, (_, k) => diatonicCycle(7)[k % 7]), "clockwise");
  assert.equal(axisOfMotion(ranged.map((v) => [v.root, v.third, v.fifth])).axis, "alternating");
});

test("the axis table is internally consistent: every three-part entry measures as stated", () => {
  for (const entry of AXIS_TECHNIQUES.filter((e) => e.parts === 3 && e.axis !== "alternating")) {
    assert.equal(axisOfMotion(triadMotion(MAJOR, 60, entry.cycle, entry.transformation)).axis, entry.axis, entry.technique);
  }
});

// Section A.
test("P.P.T. is the plagal cadence held over the tonic: I + IV 6/4 + I over c (p.561, Figure 309)", () => {
  const ppt = classicalPedalPoint("PPT", MAJOR, 60);
  assert.deepEqual(ppt.map((c) => pcName(c.bass)), ["c", "c", "c"]);
  assert.deepEqual(ppt.map((c) => c.upper.map(pcName).sort().join("")), ["ceg", "acf", "ceg"]);
  assert.equal(CLASSICAL_CADENCES.PPT.formula, "T + S_T + T");
});

test("P.P.D.: prepared by IV, starting on I 6/4 over the dominant, ending with the authentic cadence (p.562)", () => {
  const ppd = classicalPedalPoint("PPD", MAJOR, 60);
  assert.deepEqual(ppd.map((c) => c.label), ["IV", "I 6/4 (T_D)", "V", "I"]);
  assert.deepEqual(ppd.map((c) => pcName(c.bass)), ["f", "g", "g", "c"]);
  assert.deepEqual(ppd.map((c) => c.onPedal), [false, true, true, false]);
  assert.deepEqual(ppd[1].upper.map(pcName).sort().join(""), "ceg");
  assert.equal(CLASSICAL_CADENCES.PPD.formula, "T + S + T_D + D + T");
});

test("Figure 311: seven traditional placements; in the last two P.P.D. is followed by P.P.T. (p.563)", () => {
  assert.equal(PEDAL_POINT_LOCATIONS.length, 7);
  for (const row of PEDAL_POINT_LOCATIONS.slice(5)) assert.deepEqual(row.slice(2), ["P.P.D.", "P.P.T."]);
  assert.ok(PEDAL_POINT_LOCATIONS.every((row) => !row.includes("P.P.D.") || row.indexOf("P.P.D.") === 2)); // P.P.D. "before the recapitulation"
});

test("Figure 313: the forms of the upper three parts over the pedal", () => {
  assert.deepEqual(DIATONIC_PEDAL_FORMS.map((f) => `${f.upper.join("")} ${f.tension}`), ["531 S(5)", "311 S(5)", "731 S(7)", "751 S(7)", "971 S(9)"]);
});

// Section C.
test("Figure 315: the natural key tendencies with their minor mediants, upper and lower (p.565)", () => {
  const row = (kind, field) => keyTendencies(kind).map((k) => k[field]).join(" ");
  assert.equal(row("PPT", "upperMediant"), "e a d g c f bb eb");
  assert.equal(row("PPT", "major"), "C F Bb Eb Ab Db Gb Cb");
  assert.equal(row("PPT", "lowerMediant"), "a d g c f bb eb ab");
  assert.equal(row("PPD", "upperMediant"), "e b f# c# g# d# a# e#");
  assert.equal(row("PPD", "major"), "C G D A E B F# C#");
  assert.equal(row("PPD", "lowerMediant"), "a e b f# c# g# d# a#");
});

test("over a pedal on c the structural requirement excludes exactly F# minor, G major, G minor, G# minor, A major -- and F# major, the 'allowance' (p.566)", () => {
  const excluded = keysOverPedal(0).filter((k) => !k.accepted).map((k) => k.key).sort();
  assert.deepEqual(excluded, ["A major", "Ab minor", "F# major", "F# minor", "G major", "G minor"].sort());
});

test("D minor over g is not accepted (1, 5, 7, 9); F minor over g is an accepted S(11), 1, 7, 9, 11 (p.565)", () => {
  assert.equal(pedalAcceptsKey(7, 2, "minor").accepted, false);
  assert.deepEqual(pedalAcceptsKey(7, 5, "minor"), { accepted: true, form: "S(11): 1, 7, 9, 11" });
  assert.equal(pedalAcceptsKey(0, 2, "major").form, "S(2), the seventh in the bass"); // D major over c: D7 in third inversion
  assert.equal(pedalAcceptsKey(0, 4, "minor").form, "S(7)"); // E minor over c: c-e-g-b
});

test("a modulating P.P.T. on c follows the flats, skipping the keys the pedal rejects; P.P.D. on g the sharps", () => {
  const ppt = modulatingPedalPoint("PPT", 48, 7);
  assert.deepEqual(ppt.keys, ["C", "F", "Bb", "Eb", "Ab", "Db", "Cb"]); // Gb (F# major) is the allowance, not taken
  assert.ok(ppt.chords.every((c) => pcName(c.bass) === "c"));
  const ppd = modulatingPedalPoint("PPD", 43, 3);
  assert.deepEqual(ppd.keys.slice(0, 1), ["C"]);
  assert.ok(ppd.keys.every((k) => k !== "D")); // D minor's rejection has a major counterpart: D major over g is 5, 7, 9 too
});

// Section D.
test("symmetric pedal point: the pedal is the original tonic; extended, each tonic becomes the pedal in turn (p.566-567)", () => {
  const simple = symmetricPedalPoint(48, 2, [[1, 1]], "clockwise");
  assert.ok(simple.every((c) => c.bass === 48));
  const extended = symmetricPedalPoint(48, 2, [[1, 1]], "clockwise", true);
  assert.deepEqual([...new Set(extended.map((c) => pcName(c.bass)))], ["c", "f#"]);
  assert.ok(extended.every((c) => c.upper.every((p) => p > c.bass)));
});

test("each key reached by its VII (the default) or V: over c, VII of F is e-g-bb, so the pedal sounds C7; V of F would repeat C", () => {
  const vii = modulatingPedalPoint("PPT", 48, 2);
  assert.deepEqual(vii.chords[2].upper.map(pcName).sort().join(" "), "bb e g");
  const v = modulatingPedalPoint("PPT", 48, 2, "V");
  assert.deepEqual(v.chords[2].upper.map(pcName).sort(), v.chords[1].upper.map(pcName).sort());
});
