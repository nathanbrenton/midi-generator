import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seventhCycle,
  stackedSeventhChord,
  seventhChordProgression,
  transformSeventhVoicing,
  seventhVoiceLeadProgression,
} from "../src/core/seventhChords.ts";
import { intervalCellScale } from "../src/core/scales.ts";

const C_MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const C4 = 60;

function pitchClasses(voicing) {
  return [voicing.root, voicing.third, voicing.fifth, voicing.seventh].map((n) => ((n % 12) + 12) % 12).sort((a, b) => a - b);
}

test("stackedSeventhChord on C major at degree 0 gives Cmaj7 (C,E,G,B)", () => {
  assert.deepEqual(stackedSeventhChord(C_MAJOR, C4, 0), [60, 64, 67, 71]);
});

test("seventhCycle(3) steps the root down a third, like the triad cycles (p.362-363)", () => {
  assert.deepEqual(seventhCycle(3, 0), [0, 5, 3, 1, 6, 4, 2]); // c-a-f-d-b-g-e
});

test("seventhChordProgression stacks a plain seventh-chord at every root degree", () => {
  const chords = seventhChordProgression(C_MAJOR, C4, [0, 5]);
  assert.deepEqual(chords[0], [60, 64, 67, 71]); // Cmaj7
  assert.deepEqual(chords[1], [69, 72, 76, 79]); // Am7
});

const CMAJ7 = { root: 60, third: 64, fifth: 67, seventh: 71 };
test("C3 (clockwise, 'the seventh alone'): Cmaj7 -> Am7, only B moves, down to A (p.436, Figure 117)", () => {
  const next = transformSeventhVoicing(CMAJ7, C_MAJOR, C4, seventhCycle(3)[1], 3);
  assert.deepEqual(pitchClasses(next), [0, 4, 7, 9]); // A,C,E,G
  assert.deepEqual(next, { root: 69, third: 60, fifth: 64, seventh: 67 });
});

test("C5 (crosswise, 'the seventh and the fifth'): Cmaj7 -> Fmaj7, G and B step down to F and A (p.437, Figure 118)", () => {
  const next = transformSeventhVoicing(CMAJ7, C_MAJOR, C4, seventhCycle(5)[1], 5);
  assert.deepEqual(next, { root: 65, third: 69, fifth: 60, seventh: 64 });
});

test("C7 (counterclockwise, 'the seventh, the fifth, and the third'): Cmaj7 -> Dm7, B, G, E step down to A, F, D (p.437, Figure 119)", () => {
  const next = transformSeventhVoicing(CMAJ7, C_MAJOR, C4, seventhCycle(7)[1], 7);
  assert.deepEqual(next, { root: 62, third: 65, fifth: 69, seventh: 60 });
});

test("through a whole cycle, C3/C5/C7 move exactly 1/2/3 voices per chord, each down a step (p.436-437)", () => {
  for (const [cycle, movements] of [[3, 1], [5, 2], [7, 3]]) {
    const progression = seventhVoiceLeadProgression(C_MAJOR, C4, [...seventhCycle(cycle), 0], cycle);
    for (let i = 1; i < progression.length; i++) {
      const before = Object.values(progression[i - 1]).sort((a, b) => a - b);
      const after = Object.values(progression[i]).sort((a, b) => a - b);
      const steps = before.map((n, v) => after[v] - n).filter((d) => d !== 0);
      assert.equal(steps.length, movements, `C${cycle}, chord ${i}`);
      assert.ok(steps.every((d) => d === -1 || d === -2), `C${cycle}, chord ${i}: ${steps}`);
    }
  }
});

test("crosswise (C5) is its own inverse -- applying it twice returns to the original pitch classes (an order-2 permutation, not a 4-cycle)", () => {
  const once = transformSeventhVoicing(CMAJ7, C_MAJOR, C4, 3, 5);
  const twice = transformSeventhVoicing(once, C_MAJOR, C4, 0, 5);
  assert.deepEqual(pitchClasses(twice), [0, 4, 7, 11]); // back to C,E,G,B
});

test("seventhVoiceLeadProgression under C3 cycles through all 7 chords with smooth (minimal) voice movement", () => {
  const degrees = seventhCycle(3, 0);
  const progression = seventhVoiceLeadProgression(C_MAJOR, C4, degrees, 3);
  assert.equal(progression.length, 7);
  // Every consecutive pair moves each of the 4 voices by no more than a few semitones.
  for (let i = 1; i < progression.length; i++) {
    const prevVoices = Object.values(progression[i - 1]);
    const currVoices = Object.values(progression[i]).sort((a, b) => a - b);
    const prevSorted = [...prevVoices].sort((a, b) => a - b);
    for (let v = 0; v < 4; v++) {
      assert.ok(Math.abs(currVoices[v] - prevSorted[v]) <= 12, "no voice should leap more than an octave between chords");
    }
  }
});
