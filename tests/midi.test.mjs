import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMidiFile } from "../src/core/midi.ts";

const notes = [
  { midiNote: 60, startUnits: 0, durationUnits: 2, velocity: 90, voice: 0 },
  { midiNote: 64, startUnits: 2, durationUnits: 2, velocity: 90, voice: 0 },
  { midiNote: 67, startUnits: 0, durationUnits: 4, velocity: 60, voice: 1 },
];

test("file starts with the MThd header and format-1 chunk", () => {
  const bytes = buildMidiFile(notes);
  assert.deepEqual([...bytes.slice(0, 4)], [0x4d, 0x54, 0x68, 0x64]);
  const format = (bytes[8] << 8) | bytes[9];
  assert.equal(format, 1);
});

test("track count is one tempo track plus one track per distinct voice", () => {
  const bytes = buildMidiFile(notes);
  const trackCount = (bytes[10] << 8) | bytes[11];
  assert.equal(trackCount, 3); // tempo + voice 0 + voice 1
});

test("every track chunk is tagged MTrk", () => {
  const bytes = buildMidiFile(notes);
  let offset = 14; // past the 14-byte header chunk
  let mtrkCount = 0;
  while (offset < bytes.length) {
    assert.deepEqual([...bytes.slice(offset, offset + 4)], [0x4d, 0x54, 0x72, 0x6b]);
    mtrkCount++;
    const length =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7];
    offset += 8 + length;
  }
  assert.equal(mtrkCount, 3);
  assert.equal(offset, bytes.length);
});

test("throws nothing for an empty note list (tempo-only file)", () => {
  const bytes = buildMidiFile([]);
  const trackCount = (bytes[10] << 8) | bytes[11];
  assert.equal(trackCount, 1);
});

test("a voice with a channel override uses that channel instead of one derived from track position", () => {
  const drumNote = { midiNote: 36, startUnits: 0, durationUnits: 1, velocity: 100, voice: 5, channel: 9 };
  const bytes = buildMidiFile([drumNote]);
  // Track layout: tempo track (14-byte header + its own MTrk), then the one voice track.
  let offset = 14;
  const tempoTrackLength =
    (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
  offset += 8 + tempoTrackLength;
  // The voice track's event bytes start right after its own 8-byte MTrk header.
  const noteOnStatusByte = bytes[offset + 8 + 1]; // delta-time varint is 1 byte (0x00) for the first event
  assert.equal(noteOnStatusByte & 0x0f, 9); // channel nibble
  assert.equal(noteOnStatusByte & 0xf0, 0x90); // still a note-on
});
