/**
 * Minimal Standard MIDI File reader — the inverse of core/midi.ts's
 * writer. Supports format 0 and 1, running status, meta and sysex events
 * (skipped), and picks the track with the most note-on events as "the"
 * melody, since analysis mode is monophonic-only for now.
 */

export interface ImportedNote {
  midiNote: number;
  startTicks: number;
  durationTicks: number;
  velocity: number;
}

export interface ImportedMidi {
  ticksPerQuarterNote: number;
  trackCount: number;
  selectedTrackIndex: number;
  notes: ImportedNote[];
}

class ByteReader {
  private position = 0;
  private bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  get offset(): number {
    return this.position;
  }

  atEnd(): boolean {
    return this.position >= this.bytes.length;
  }

  readUint8(): number {
    return this.bytes[this.position++];
  }

  readUint16(): number {
    const value = (this.bytes[this.position] << 8) | this.bytes[this.position + 1];
    this.position += 2;
    return value;
  }

  readUint32(): number {
    const value =
      (this.bytes[this.position] << 24) |
      (this.bytes[this.position + 1] << 16) |
      (this.bytes[this.position + 2] << 8) |
      this.bytes[this.position + 3];
    this.position += 4;
    return value >>> 0;
  }

  readAscii(length: number): string {
    let text = "";
    for (let i = 0; i < length; i++) text += String.fromCharCode(this.readUint8());
    return text;
  }

  readVariableLengthQuantity(): number {
    let value = 0;
    while (true) {
      const byte = this.readUint8();
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
  }

  skip(length: number): void {
    this.position += length;
  }
}

function parseTrack(reader: ByteReader, trackLength: number): ImportedNote[] {
  const trackEnd = reader.offset + trackLength;
  const notes: ImportedNote[] = [];
  const pendingByPitch = new Map<number, { startTicks: number; velocity: number }[]>();

  let ticks = 0;
  let runningStatus = 0;

  while (reader.offset < trackEnd) {
    ticks += reader.readVariableLengthQuantity();
    let statusByte = reader.readUint8();

    if (statusByte < 0x80) {
      // Running status: this byte is actually the first data byte, reuse the last status.
      reader.skip(-1);
      statusByte = runningStatus;
    } else {
      runningStatus = statusByte;
    }

    if (statusByte === 0xff) {
      const metaType = reader.readUint8();
      const length = reader.readVariableLengthQuantity();
      reader.skip(length);
      if (metaType === 0x2f) break; // end of track
      continue;
    }
    if (statusByte === 0xf0 || statusByte === 0xf7) {
      const length = reader.readVariableLengthQuantity();
      reader.skip(length);
      continue;
    }

    const kind = statusByte & 0xf0;
    if (kind === 0xc0 || kind === 0xd0) {
      reader.readUint8(); // program change / channel pressure: one data byte
      continue;
    }

    const data1 = reader.readUint8();
    const data2 = reader.readUint8();

    if (kind === 0x90 && data2 > 0) {
      const queue = pendingByPitch.get(data1) ?? [];
      queue.push({ startTicks: ticks, velocity: data2 });
      pendingByPitch.set(data1, queue);
    } else if (kind === 0x80 || (kind === 0x90 && data2 === 0)) {
      const queue = pendingByPitch.get(data1);
      const pending = queue?.shift();
      if (pending) {
        notes.push({
          midiNote: data1,
          startTicks: pending.startTicks,
          durationTicks: ticks - pending.startTicks,
          velocity: pending.velocity,
        });
      }
    }
  }

  return notes.sort((a, b) => a.startTicks - b.startTicks);
}

export function parseMidiFile(bytes: Uint8Array): ImportedMidi {
  const reader = new ByteReader(bytes);

  if (reader.readAscii(4) !== "MThd") {
    throw new Error("not a Standard MIDI File (missing MThd header)");
  }
  const headerLength = reader.readUint32();
  const headerStart = reader.offset;
  reader.readUint16(); // format
  const trackCount = reader.readUint16();
  const division = reader.readUint16();
  if (division & 0x8000) {
    throw new Error("SMPTE time division is not supported — only ticks-per-quarter-note files");
  }
  reader.skip(headerLength - (reader.offset - headerStart));

  const tracks: ImportedNote[][] = [];
  for (let i = 0; i < trackCount; i++) {
    if (reader.readAscii(4) !== "MTrk") {
      throw new Error(`expected MTrk chunk for track ${i}`);
    }
    const trackLength = reader.readUint32();
    tracks.push(parseTrack(reader, trackLength));
  }

  let selectedTrackIndex = 0;
  for (let i = 1; i < tracks.length; i++) {
    if (tracks[i].length > tracks[selectedTrackIndex].length) selectedTrackIndex = i;
  }

  return {
    ticksPerQuarterNote: division,
    trackCount,
    selectedTrackIndex,
    notes: tracks[selectedTrackIndex] ?? [],
  };
}
