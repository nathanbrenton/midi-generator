import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMidiFile } from "../src/core/midiImport.ts";
import { buildMidiFile } from "../src/core/midi.ts";

test("round-trips a simple monophonic melody written by buildMidiFile", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 2, velocity: 90, voice: 0 },
    { midiNote: 64, startUnits: 2, durationUnits: 1, velocity: 90, voice: 0 },
    { midiNote: 67, startUnits: 3, durationUnits: 1, velocity: 90, voice: 0 },
  ];
  const bytes = buildMidiFile(notes, { bpm: 120, ticksPerUnit: 240 });
  const imported = parseMidiFile(bytes);

  assert.equal(imported.trackCount, 2); // tempo track + one voice track
  assert.equal(imported.notes.length, 3);
  assert.deepEqual(
    imported.notes.map((n) => n.midiNote),
    [60, 64, 67],
  );
  assert.deepEqual(
    imported.notes.map((n) => n.startTicks),
    [0, 480, 720],
  );
  assert.deepEqual(
    imported.notes.map((n) => n.durationTicks),
    [480, 240, 240],
  );
});

test("round-trips a multi-voice file, picking the track with the most notes", () => {
  const notes = [
    { midiNote: 60, startUnits: 0, durationUnits: 1, velocity: 90, voice: 0 },
    { midiNote: 62, startUnits: 1, durationUnits: 1, velocity: 90, voice: 0 },
    { midiNote: 64, startUnits: 2, durationUnits: 1, velocity: 90, voice: 0 },
    { midiNote: 65, startUnits: 3, durationUnits: 1, velocity: 90, voice: 0 },
    { midiNote: 48, startUnits: 0, durationUnits: 4, velocity: 60, voice: 1 }, // sparser harmony voice
  ];
  const bytes = buildMidiFile(notes);
  const imported = parseMidiFile(bytes);

  assert.equal(imported.trackCount, 3); // tempo + voice 0 + voice 1
  assert.equal(imported.selectedTrackIndex, 1); // voice 0 has 4 notes vs voice 1's 1
  assert.equal(imported.notes.length, 4);
});

test("handles running status (consecutive note events without repeating the status byte)", () => {
  // Hand-built minimal SMF: format 0, one track, note C4 then D4 back to back
  // using running status for the second note-on.
  const trackEvents = [
    0x00, 0x90, 60, 90, // note on C4
    0x60, 0x80, 60, 0, // note off C4 (delta 96)
    0x00, 0x90, 62, 90, // note on D4 (explicit status)
    0x60, 62, 0, // note off D4 via running status (0x80 implied, but this is actually note-on velocity 0 form)
    0x00, 0xff, 0x2f, 0x00, // end of track
  ];
  const bytes = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0, // MThd, format0, 1 track, division 480
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, trackEvents.length,
    ...trackEvents,
  ]);
  const imported = parseMidiFile(bytes);
  assert.equal(imported.notes.length, 2);
  assert.deepEqual(imported.notes.map((n) => n.midiNote), [60, 62]);
  assert.deepEqual(imported.notes.map((n) => n.durationTicks), [96, 96]);
});

test("rejects a non-MIDI file", () => {
  assert.throws(() => parseMidiFile(new Uint8Array([1, 2, 3, 4])));
});
