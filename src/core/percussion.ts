/**
 * Maps the structural components Schillinger's own resultant figures are
 * drawn from — the common denominator (c.d., the finest grid a resultant's
 * attacks fall on), each generator's own pulse, the resultant itself, and
 * the common product (c.p., the whole cycle as one unit) — onto General
 * MIDI percussion voices (kick, snare, hi-hat/ride, ...). Reinforces the
 * same idea as the piano roll's lanes: these five rows are the same
 * construction Figure 6 of the book shows, just assignable to actual drum
 * sounds instead of only viewed.
 */

import { generatorPulse, type Resultant } from "./resultant.ts";
import type { NoteEvent } from "./melody.ts";

/** General MIDI's dedicated percussion channel (0-indexed; channel 10 in 1-indexed DAW UIs). */
export const GM_DRUM_CHANNEL = 9;

export interface PercussionVoiceOption {
  label: string;
  midiNote: number;
}

/** Standard General MIDI percussion-map notes for the voices this app offers. */
export const PERCUSSION_VOICE_OPTIONS: readonly PercussionVoiceOption[] = [
  { label: "Kick", midiNote: 36 },
  { label: "Snare", midiNote: 38 },
  { label: "Rim shot", midiNote: 37 },
  { label: "Clap", midiNote: 39 },
  { label: "Closed hi-hat", midiNote: 42 },
  { label: "Open hi-hat", midiNote: 46 },
  { label: "Ride", midiNote: 51 },
  { label: "Crash", midiNote: 49 },
  { label: "Low tom", midiNote: 45 },
  { label: "Mid tom", midiNote: 47 },
  { label: "High tom", midiNote: 50 },
  { label: "Cowbell", midiNote: 56 },
];

export const PERCUSSION_SOURCES = ["cd", "generatorA", "generatorB", "resultant", "cp"] as const;
export type PercussionSource = (typeof PERCUSSION_SOURCES)[number];

export const PERCUSSION_SOURCE_LABELS: Readonly<Record<PercussionSource, string>> = {
  cd: "C.D. (common denominator)",
  generatorA: "Generator A",
  generatorB: "Generator B",
  resultant: "Resultant (r)",
  cp: "C.P. (common product)",
};

export type PercussionAssignments = Record<PercussionSource, number | null>;

export function emptyPercussionAssignments(): PercussionAssignments {
  return { cd: null, generatorA: null, generatorB: null, resultant: null, cp: null };
}

/**
 * The attack pattern for one of the five sources, in the same
 * `{duration}` shape a resultant's segments use. Returns null when the
 * source isn't computable for this cycle — generator b's own pulse only
 * divides the cycle evenly for the Plain technique (a·b), not the longer
 * composed cycles the other techniques produce.
 */
export function segmentsForSource(
  source: PercussionSource,
  resultant: Resultant,
  a: number,
  b: number,
): { duration: number }[] | null {
  switch (source) {
    case "cd":
      return Array.from({ length: resultant.cycleLength }, () => ({ duration: 1 }));
    case "generatorA":
      return evenPulse(a, resultant.cycleLength);
    case "generatorB":
      return evenPulse(b, resultant.cycleLength);
    case "resultant":
      return resultant.segments.map((segment) => ({ duration: segment.duration }));
    case "cp":
      return [{ duration: resultant.cycleLength }];
  }
}

function evenPulse(generatorValue: number, cycleLength: number): { duration: number }[] | null {
  if (cycleLength % generatorValue !== 0) return null;
  return generatorPulse(generatorValue, cycleLength);
}

/**
 * Builds one short percussion hit per attack for every source with a
 * voice assigned, each as its own MIDI track (`voice`) pinned to the
 * General MIDI drum channel. `startVoiceIndex` continues numbering after
 * whatever melody/harmony voices already exist.
 */
export function buildPercussionVoices(
  assignments: Readonly<PercussionAssignments>,
  resultant: Resultant,
  a: number,
  b: number,
  startVoiceIndex: number,
): NoteEvent[] {
  const notes: NoteEvent[] = [];
  let voice = startVoiceIndex;

  for (const source of PERCUSSION_SOURCES) {
    const midiNote = assignments[source];
    if (midiNote == null) continue;

    const segments = segmentsForSource(source, resultant, a, b);
    if (!segments) continue;

    let cursor = 0;
    for (const segment of segments) {
      notes.push({
        midiNote,
        startUnits: cursor,
        durationUnits: segment.duration * 0.5,
        velocity: 100,
        voice,
        channel: GM_DRUM_CHANNEL,
      });
      cursor += segment.duration;
    }
    voice += 1;
  }

  return notes;
}
