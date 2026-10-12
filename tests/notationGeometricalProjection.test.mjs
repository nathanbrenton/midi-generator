import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/core/notation/geometricalProjection.ts";

const note = (midiNote, startUnits, durationUnits) => ({ midiNote, startUnits, durationUnits });

test("Ch.1: the four positions carry the book's own marks ⓐ ⓑ ⓒ ⓓ (p.185-188)", () => {
  assert.deepEqual(
    Object.values(G.POSITIONS).map((p) => p.mark),
    ["ⓐ", "ⓑ", "ⓒ", "ⓓ"],
  );
});

test("Ch.1: with g as the axis of inversion, a theme entering on d starts on c in position ⓓ (p.199)", () => {
  assert.equal(G.invert(74, 67), 60);
  const theme = [note(74, 0, 1), note(72, 1, 1)];
  assert.equal(G.position("d", theme, 67)[0].midiNote, 60);
});

test("Ch.1: position ⓓ of a major triad (4+3) is a minor triad (3+4) -- the major/minor polarity the book describes (Ch.1)", () => {
  const major = [note(60, 0, 1), note(64, 0, 1), note(67, 0, 1)];
  const inverted = G.position("d", major, 67).map((n) => n.midiNote).sort((x, y) => x - y);
  assert.deepEqual([inverted[1] - inverted[0], inverted[2] - inverted[1]], [3, 4]);
});

test("Ch.2: 2p turns c-d-e-f-g into c-e-g#-a#-d (p.208)", () => {
  const melody = [60, 62, 64, 65, 67].map((m, i) => note(m, i, 1));
  assert.deepEqual(G.expand(melody, 60, 2).map((n) => n.midiNote), [60, 64, 68, 70, 74]);
});

test("Ch.2: 2t doubles every start and duration (p.213-214)", () => {
  assert.deepEqual(G.expandTime([note(60, 1, 2)], 2), [note(60, 2, 4)]);
});

test("Ch.2: coefficients as the book writes them, and the unit each produces (p.208-211)", () => {
  assert.equal(G.formatCoefficient(1, "t"), "t");
  assert.equal(G.formatCoefficient(2, "p"), "2p");
  assert.equal(G.formatUnit(2), "⁶√2"); // the semitone becomes a whole tone
  assert.equal(G.formatUnit(3), "∜2"); // "characteristic of any music based on" the diminished seventh
  assert.equal(G.formatUnit(4), "∛2");
  assert.equal(G.formatUnit(6), "√2");
  assert.equal(G.formatUnit(5), "¹²√2⁵"); // fourths: no simpler root
});
