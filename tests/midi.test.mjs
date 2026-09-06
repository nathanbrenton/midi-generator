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

test("auto-assigned (non-explicit-channel) tracks skip GM's reserved percussion channel 9", () => {
  // 11 melodic voices, none with a channel override: positional assignment
  // (0,1,2,...) would put the 10th voice (index 9) on channel 9. It must
  // instead land on 10, with every other channel still 0-8 then 10.
  const melodicNotes = Array.from({ length: 11 }, (_, voice) => ({
    midiNote: 60,
    startUnits: 0,
    durationUnits: 1,
    velocity: 90,
    voice,
  }));
  const bytes = buildMidiFile(melodicNotes);

  let offset = 14;
  const tempoTrackLength =
    (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
  offset += 8 + tempoTrackLength;

  const channels = [];
  for (let i = 0; i < 11; i++) {
    const length =
      (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
    const noteOnStatusByte = bytes[offset + 8 + 1];
    channels.push(noteOnStatusByte & 0x0f);
    offset += 8 + length;
  }

  assert.deepEqual(channels, [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11]);
  assert.ok(!channels.includes(9), "no auto-assigned track should ever land on the reserved drum channel");
});

test("an explicit-channel (percussion) track doesn't consume a melodic channel slot", () => {
  // Percussion (explicit channel 9) plus 10 melodic voices should still
  // give the melodic voices 0-8 then 10 -- the percussion track shouldn't
  // shift or skip a position in the melodic sequence.
  const notes = [
    { midiNote: 36, startUnits: 0, durationUnits: 1, velocity: 100, voice: 0, channel: 9 },
    ...Array.from({ length: 10 }, (_, i) => ({
      midiNote: 60,
      startUnits: 0,
      durationUnits: 1,
      velocity: 90,
      voice: i + 1,
    })),
  ];
  const bytes = buildMidiFile(notes);

  let offset = 14;
  const tempoTrackLength =
    (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
  offset += 8 + tempoTrackLength;

  const channels = [];
  for (let i = 0; i < 11; i++) {
    const length =
      (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
    const noteOnStatusByte = bytes[offset + 8 + 1];
    channels.push(noteOnStatusByte & 0x0f);
    offset += 8 + length;
  }

  assert.deepEqual(channels, [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10]);
});
