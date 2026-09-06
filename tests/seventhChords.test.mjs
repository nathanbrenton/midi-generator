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

test("seventhCycle(3) steps by 2 degrees per chord, matching the triad cycle's own C3 step (p.362-363)", () => {
  assert.deepEqual(seventhCycle(3, 0), [0, 2, 4, 6, 1, 3, 5]);
});

test("seventhChordProgression stacks a plain seventh-chord at every root degree", () => {
  const chords = seventhChordProgression(C_MAJOR, C4, [0, 2]);
  assert.deepEqual(chords[0], [60, 64, 67, 71]); // Cmaj7
  assert.deepEqual(chords[1], [64, 67, 71, 74]); // Em7 (D=74)
});

test("C3 (clockwise, 'the seventh alone'): Cmaj7 -> Em7 with correct pitch classes (p.436, Figure 117)", () => {
  const start = { root: 60, third: 64, fifth: 67, seventh: 71 }; // Cmaj7
  const next = transformSeventhVoicing(start, C_MAJOR, C4, 2, 3); // next root degree 2 = E
  assert.deepEqual(pitchClasses(next), [2, 4, 7, 11]); // D,E,G,B = Em7
});

test("C5 (crosswise, 'the seventh and the fifth'): Cmaj7 -> G7 with correct pitch classes (p.437, Figure 118)", () => {
  const start = { root: 60, third: 64, fifth: 67, seventh: 71 }; // Cmaj7
  const next = transformSeventhVoicing(start, C_MAJOR, C4, 4, 5); // next root degree 4 = G
  assert.deepEqual(pitchClasses(next), [2, 5, 7, 11]); // D,F,G,B = G7
});

test("C7 (counterclockwise, 'the seventh, the fifth, and the third'): Cmaj7 -> Bm7b5 with correct pitch classes (p.437, Figure 119)", () => {
  const start = { root: 60, third: 64, fifth: 67, seventh: 71 }; // Cmaj7
  const next = transformSeventhVoicing(start, C_MAJOR, C4, 6, 7); // next root degree 6 = B
  assert.deepEqual(pitchClasses(next), [2, 5, 9, 11]); // D,F,A,B = Bm7b5
});

test("crosswise (C5) is its own inverse -- applying it twice returns to the original pitch classes (an order-2 permutation, not a 4-cycle)", () => {
  const start = { root: 60, third: 64, fifth: 67, seventh: 71 }; // Cmaj7
  const once = transformSeventhVoicing(start, C_MAJOR, C4, 4, 5);
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
