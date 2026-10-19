import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INSTRUMENTS,
  instrument,
  sounding,
  pythagoreanStrings,
  positionOf,
  noteInPosition,
  harmonicNodes,
  harmonicPitch,
  contactDeviation,
  artificialHarmonic,
  harmonicsGlissando,
  valveCombinations,
  hornNaturalTones,
  tromboneNotes,
  tromboneSpan,
  harpPedals,
  footagePitch,
  HAMMOND_DRAWBARS,
  RANGE_TABLE,
  TIMBRAL_SIMILARITY,
} from "../src/core/orchestration.ts";
import { SIGMA_13, sigmaScale } from "../src/core/masterStructures.ts";

const NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const nm = (p) => `${NAMES[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}`;
const span = (name) => {
  const [lo, hi] = instrument(name).written;
  return hi - lo;
};

test("strings: violin g d a e in pure fifths from a -- e +2, d -2, g -4 cents off equal temperament; viola a fifth lower, 'cello an octave below the viola, bass in fourths an octave down", () => {
  const p = Object.fromEntries(pythagoreanStrings().map((s) => [s.name, s]));
  assert.deepEqual([p.e.ratio, p.d.ratio, p.g.ratio], [3 / 2, 2 / 3, 4 / 9]);
  assert.deepEqual(["e", "d", "g"].map((n) => Math.round(p[n].deviation)), [2, -2, -4]);
  const [violin, viola, cello, bass] = ["violin", "viola", "'cello", "double-bass"].map((n) => instrument(n).strings);
  assert.deepEqual(viola.map((s, i) => violin[i] - s), [7, 7, 7, 7]);
  assert.deepEqual(cello.map((s, i) => viola[i] - s), [12, 12, 12, 12]);
  assert.deepEqual(bass.slice(1).map((s, i) => s - bass[i]), [5, 5, 5]);
  assert.equal(sounding(instrument("double-bass"), 40), 28);
  // the solo bass, a tone higher, reads a minor seventh down: -12 + 2 = -10
  assert.equal(-12 + 2, -10);
});

test("positions: g# by the third finger on the a-string is the fourth position; the second finger in the sixth position on the e-string plays e an octave up", () => {
  const letter = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
  assert.equal(positionOf(letter.a, letter.g + 7, 3), 4);
  assert.equal(positionOf(letter.a, letter.e + 7, 1), 4); // a to e is a fifth: 5 - 1
  assert.equal(noteInPosition(letter.e, 6, 2), letter.e + 7);
});

test("harmonics: nodes k/n with k, n coprime give one harmonic and mirror about the middle; the 2nd-6th over c are c, g, c, e, g", () => {
  assert.deepEqual(harmonicNodes(2), [1 / 2]);
  assert.deepEqual(harmonicNodes(5), [1 / 5, 2 / 5, 3 / 5, 4 / 5]);
  assert.deepEqual(harmonicNodes(6), [1 / 6, 5 / 6]);
  const r = (xs) => xs.map((x) => Math.round(x * 1e9));
  for (const n of [3, 4, 5, 7, 8]) assert.deepEqual(r(harmonicNodes(n)), r(harmonicNodes(n).map((x) => 1 - x).reverse()));
  assert.deepEqual([2, 3, 4, 5, 6].map((n) => nm(harmonicPitch(48, n))), ["c4", "g4", "c5", "e5", "g5"]);
  assert.deepEqual(harmonicsGlissando(43, 8).map(nm), ["g5", "f5", "d5", "b4", "g4", "d4", "g3"]); // the 'cello G string: a "large seventh-chord" arpeggio
});

test("Figure 17: contact points against equal temperament, as the book grades them", () => {
  for (const r of [2, 3 / 2, 4 / 3]) assert.equal(contactDeviation(r).verdict, "practically exact", String(r));
  assert.equal(contactDeviation(16 / 9).verdict, "very slightly lower");
  for (const r of [5 / 4, 25 / 16, 10 / 4]) assert.equal(contactDeviation(r).verdict, "slightly lower", String(r));
  for (const r of [8 / 5, 12 / 5]) assert.equal(contactDeviation(r).verdict, "slightly higher", String(r));
});

test("Figure 18: the artificial harmonic -- c pressed, f touched, c two octaves up", () => {
  assert.deepEqual(artificialHarmonic(60), { touched: 65, sounds: 84 });
});

test("transpositions as the book gives them", () => {
  const t = Object.fromEntries(INSTRUMENTS.map((i) => [i.name, i.transposition]));
  assert.deepEqual(
    ["clarinet in Bb", "clarinet in A", "clarinet in D", "clarinet in Eb", "bass clarinet in Bb", "bass clarinet in A", "bassethorn in F", "alto clarinet in Eb"].map((n) => t[n]),
    [-2, -3, 2, 3, -14, -15, -7, -9],
  );
  assert.deepEqual(["piccolo", "alto flute in G", "alto flute in F", "English horn", "heckelphone", "contrabassoon"].map((n) => t[n]), [12, -5, -7, -7, -12, -12]);
  assert.deepEqual(["horn in F", "trumpet in Bb", "trumpet in A", "piccolo trumpet in D", "piccolo trumpet in Eb", "bass trumpet in Bb"].map((n) => t[n]), [-7, -2, -3, 2, 3, -14]);
  assert.deepEqual(["celesta", "orchestra bells", "xylophone", "tenor (treble clef)"].map((n) => t[n]), [12, 24, 12, -12]);
  // the alto trumpet's lowest written f# "sounds c# on the G trumpet and b on the F trumpet"
  assert.deepEqual([sounding(instrument("alto trumpet in G"), 54), sounding(instrument("alto trumpet in F"), 54)].map(nm), ["c#3", "b2"]);
});

test("valves: 2, 1, 3 and together 3, 5, 4, 6; the trumpet's lowest is written f# (in C), e (Bb), eb (A); horn middle c sounds f, and with I, II, III bb, b, a sound eb, e, d", () => {
  const combos = Object.fromEntries(valveCombinations().map((c) => [c.valves.join("+"), c.lowers]));
  assert.deepEqual(combos, { 1: 2, 2: 1, "1+2": 3, 3: 3, "1+3": 5, "2+3": 4, "1+2+3": 6 });
  const lowestWritten = 60 - 6;
  assert.deepEqual([0, -2, -3].map((tr) => nm(lowestWritten + tr)), ["f#3", "e3", "d#3"]);
  const horn = instrument("horn in F");
  assert.equal(nm(sounding(horn, 60)), "f3");
  assert.deepEqual([2, 1, 3].map((v) => nm(sounding(horn, 60 - v))), ["d#3", "e3", "d3"]);
});

test("Figure 41: the horn's natural tones 2-16, written c3 g3 c4 e4 g4 c5 d5 e5 g5 c6 and sounding a fifth lower", () => {
  const tones = hornNaturalTones();
  assert.deepEqual(tones.map((t) => nm(t.written)).join(" "), "c3 g3 c4 e4 g4 c5 d5 e5 g5 c6");
  assert.deepEqual(tones.map((t) => nm(t.sounds)).join(" "), "f2 c3 f3 a3 c4 f4 g4 a4 c5 f5");
});

test("the tuba's four valves (2, 1, 3, 5) fill every interval of its octave between the first and second tones", () => {
  const reach = new Set(valveCombinations([2, 1, 3, 5]).map((c) => c.lowers));
  for (let k = 1; k <= 11; k++) assert.ok(reach.has(k), String(k));
});

test("trombone: Figure 45's gap b1 c2 c#2 d2 d#2; Figure 46's valve notes d#2 d2 c#2 c2; Figure 100's 3 + (-5) + 34 and 3 + (-1) + 38", () => {
  const without = tromboneSpan(false);
  assert.deepEqual(without.gap.map(nm), ["b1", "c2", "c#2", "d2", "d#2"]);
  assert.deepEqual([without.pedal, without.gap.length, without.continuous], [...RANGE_TABLE.trombones.withoutValve]);
  const withValve = tromboneSpan(true);
  assert.deepEqual(withValve.gap.map(nm), ["b1"]);
  assert.deepEqual([withValve.pedal, withValve.gap.length, withValve.continuous], [...RANGE_TABLE.trombones.withValve]);
  assert.deepEqual(tromboneNotes(true).filter((n) => n.valve).map((n) => nm(n.pitch)), ["d#2", "d2", "c#2", "c2"]);
  // the continuous range has no other holes
  const all = new Set(tromboneNotes(false).map((n) => n.pitch));
  for (let p = 40; p <= 74; p++) assert.ok(all.has(p), nm(p));
});

test("Figures 99-101 against the instrument figures: violin 52, 'cello 40, bass 27, tuba 39, saxophones 30, clarinet 39, bass clarinet 38, oboe 31, flute 38", () => {
  assert.equal(span("violin"), RANGE_TABLE.strings.violins.orchestra);
  assert.equal(span("'cello"), RANGE_TABLE.strings.cellos.orchestra);
  assert.equal(span("double-bass"), RANGE_TABLE.strings.basses.orchestra);
  assert.equal(span("tuba"), RANGE_TABLE.tuba);
  assert.equal(span("alto saxophone"), RANGE_TABLE.saxophones.alto);
  assert.equal(span("clarinet in Bb"), RANGE_TABLE.clarinets.soprano);
  assert.equal(span("bass clarinet in Bb"), RANGE_TABLE.clarinets.bass);
  assert.equal(RANGE_TABLE.clarinets.bass - RANGE_TABLE.clarinets.bassWithoutExtension, 4); // "the lower extension from e to c"
  assert.equal(span("oboe"), RANGE_TABLE.oboes.soprano);
  assert.equal(span("flute"), RANGE_TABLE.flutes.grande);
  // the violin's pizzicato limit e6 (Figure 15's mark 1) and the bass's g4/e4 arco and pizz. limits
  assert.equal(88 - 55, RANGE_TABLE.strings.violins.pizzicato);
  assert.equal(64 - 40, RANGE_TABLE.strings.basses.pizzicato);
  assert.equal(RANGE_TABLE.strings.basses.orchestra5 - RANGE_TABLE.strings.basses.orchestra, 4); // the low c string
});

test("Figure 101 disagrees with the viola's own figure and text (40 and 45, not 33 and 40) and with the 'cello's solo range (45, not 47)", () => {
  const violaA = 69;
  assert.equal(span("viola"), violaA + 19 - 48); // a twelfth above the A string: 40
  assert.notEqual(span("viola"), RANGE_TABLE.strings.violas.orchestra);
  assert.equal(violaA + 24 - 48, 45); // solo: two octaves on the A string
  assert.notEqual(45, RANGE_TABLE.strings.violas.solo);
  assert.equal(57 + 24 - 36, 45); // 'cello solo, two octaves on its A string
  assert.notEqual(45, RANGE_TABLE.strings.cellos.solo);
});

test("harp: seven pedals give Cb, C and C# major with all pedals alike; 35 of the 36 Σ(13) can be set, Σ XXX (c eb e g ab bb b) cannot", () => {
  assert.deepEqual(harpPedals([0, 2, 4, 5, 7, 9, 11]), [0, 0, 0, 0, 0, 0, 0]);
  // all pedals flat give Cb major, all sharp C# major (each set has other spellings too)
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const setOf = (alts) => NAT.map((n, i) => (n + alts[i] + 12) % 12).sort((a, b) => a - b).join();
  assert.equal(setOf([-1, -1, -1, -1, -1, -1, -1]), [11, 1, 3, 4, 6, 8, 10].sort((a, b) => a - b).join());
  assert.equal(setOf([1, 1, 1, 1, 1, 1, 1]), [1, 3, 5, 6, 8, 10, 0].sort((a, b) => a - b).join());
  for (const pcs of [[11, 1, 3, 4, 6, 8, 10], [1, 3, 5, 6, 8, 10, 0]]) assert.equal(setOf(harpPedals(pcs)), [...pcs].sort((a, b) => a - b).join());
  const unset = SIGMA_13.filter((s) => !harpPedals(sigmaScale(s)));
  assert.deepEqual(unset.map((s) => s.roman), ["XXX"]);
  assert.deepEqual(sigmaScale(unset[0]), [0, 3, 4, 7, 8, 10, 11]);
  const largest = Math.max(...SIGMA_13.map((s) => { const sc = sigmaScale(s); return Math.max(...sc.map((p, i) => (sc[(i + 1) % 7] - p + 12) % 12)); }));
  assert.equal(largest, 3); // the book's condition, "no interval greater than 4 semitones", holds
});

test("organ footage and the Hammond levers: 4' +12, 16' -12, 32' -24, 2 2/3' +19; levers at -12, +19, 0, 12, 19, 24, 28, 31, 36", () => {
  assert.deepEqual([8, 4, 16, 32, 2, 8 / 3, 1].map(footagePitch), [0, 12, -12, -24, 24, 19, 36]);
  assert.deepEqual(HAMMOND_DRAWBARS.map((d) => Math.round(1200 * Math.log2(d.ratio) / 100)), [-12, 7, 0, 12, 19, 24, 28, 31, 36]);
});

test("Ch.8: blending scales -- oboes and bassoons first, horns and tuba first", () => {
  assert.equal(TIMBRAL_SIMILARITY.woodwind[0], "oboes and bassoons");
  assert.equal(TIMBRAL_SIMILARITY.brass[0], "horns and tuba");
  assert.equal(TIMBRAL_SIMILARITY.woodwind.length, 6);
});
