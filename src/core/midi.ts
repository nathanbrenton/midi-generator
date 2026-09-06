/**
 * Minimal Standard MIDI File (format 1) writer — no dependencies. Groups
 * note events by voice into separate tracks so polyrhythmic generator
 * voices and strata harmony voices can play back simultaneously. A
 * voice's channel is normally derived from its position among the other
 * voices, but any note can pin its whole voice to a fixed channel (e.g.
 * General MIDI's percussion channel) via `NoteEvent.channel`.
 */

import type { NoteEvent } from "./melody.ts";

const TICKS_PER_QUARTER_NOTE = 480;

function variableLengthQuantity(value: number): number[] {
  let buffer = value & 0x7f;
  let remaining = value >> 7;
  const bytes: number[] = [];

  while (remaining > 0) {
    buffer <<= 8;
    buffer |= 0x80 | (remaining & 0x7f);
    remaining >>= 7;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

function uint32Bytes(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

function uint16Bytes(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function trackChunk(events: number[]): number[] {
  return [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    ...uint32Bytes(events.length),
    ...events,
  ];
}

function tempoTrack(bpm: number): number[] {
  const microsecondsPerQuarter = Math.round(60_000_000 / bpm);
  return trackChunk([
    0x00,
    0xff, 0x51, 0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
    0x00, 0xff, 0x2f, 0x00, // end of track
  ]);
}

function noteTrack(notes: readonly NoteEvent[], ticksPerUnit: number, defaultChannel: number): number[] {
  const events: number[] = [];
  let clock = 0;
  const channel = notes[0]?.channel ?? defaultChannel;

  const sorted = [...notes].sort((a, b) => a.startUnits - b.startUnits);

  for (const note of sorted) {
    const startTick = Math.round(note.startUnits * ticksPerUnit);
    const durationTicks = Math.max(1, Math.round(note.durationUnits * ticksPerUnit));
    const clampedNote = Math.max(0, Math.min(127, Math.round(note.midiNote)));
    const velocity = Math.max(1, Math.min(127, Math.round(note.velocity)));

    events.push(
      ...variableLengthQuantity(Math.max(0, startTick - clock)),
      0x90 | channel,
      clampedNote,
      velocity,
    );
    clock = startTick;

    events.push(
      ...variableLengthQuantity(durationTicks),
      0x80 | channel,
      clampedNote,
      0x00,
    );
    clock += durationTicks;
  }

  events.push(0x00, 0xff, 0x2f, 0x00); // end of track
  return trackChunk(events);
}

export interface MidiFileOptions {
  bpm?: number;
  /** Ticks per rhythm "unit" — the abstract duration unit used by resultant.ts/melody.ts. */
  ticksPerUnit?: number;
}

/**
 * The next channel for a track that has no explicit `NoteEvent.channel`
 * override, cycling 0-15 but skipping 9 -- General MIDI reserves channel
 * 9 (channel 10 in 1-indexed DAW UIs) exclusively for percussion, and a
 * compliant player will reinterpret ANY note sent there through the GM
 * drum map regardless of program, garbling a melodic voice that happened
 * to land on it by plain positional bad luck. Only reachable in practice
 * once enough simultaneous voices exist for position 9 to come up at all.
 */
function nextMelodicChannel(cursor: number): number {
  const channel = cursor % 15;
  return channel >= 9 ? channel + 1 : channel;
}

/** Builds a multi-track .mid file, one track per distinct `voice` value in `notes`. */
export function buildMidiFile(notes: readonly NoteEvent[], options: MidiFileOptions = {}): Uint8Array {
  const { bpm = 120, ticksPerUnit = 120 } = options;

  const voices = [...new Set(notes.map((note) => note.voice))].sort((a, b) => a - b);
  let melodicCursor = 0;
  const tracks = [
    tempoTrack(bpm),
    ...voices.map((voice) => {
      const voiceNotes = notes.filter((note) => note.voice === voice);
      const hasExplicitChannel = voiceNotes[0]?.channel != null;
      const defaultChannel = hasExplicitChannel ? 0 : nextMelodicChannel(melodicCursor++);
      return noteTrack(voiceNotes, ticksPerUnit, defaultChannel);
    }),
  ];

  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    ...uint32Bytes(6),
    ...uint16Bytes(1), // format 1
    ...uint16Bytes(tracks.length),
    ...uint16Bytes(TICKS_PER_QUARTER_NOTE),
  ];

  return new Uint8Array([...headerChunk, ...tracks.flat()]);
}
