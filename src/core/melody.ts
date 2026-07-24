/**
 * Combines a rhythm resultant with a pitch scale into note events, using a
 * melodic contour to pick each note's scale degree. "arch" and "wedge"
 * mirror Schillinger's own technique of expanding/contracting a line
 * symmetrically, the same way his rhythm resultants expand and contract in
 * time.
 */

import type { Resultant } from "./resultant.ts";
import { midiNoteForDegree, type PitchScale } from "./scales.ts";

export type Contour = "ascending" | "descending" | "arch" | "wedgeOut" | "cycle";

export interface NoteEvent {
  midiNote: number;
  startUnits: number;
  durationUnits: number;
  velocity: number;
  voice: number;
}

export interface MelodyOptions {
  rootMidiNote: number;
  scale: PitchScale;
  contour: Contour;
  /** How many scale-lengths the contour travels before repeating (ignored by "cycle"). */
  span: number;
  baseVelocity: number;
  /** Velocity used at coincidence points, where more than one generator attacked together. */
  accentVelocity: number;
}

function degreeIndexForContour(contour: Contour, noteIndex: number, span: number): number {
  switch (contour) {
    case "ascending":
      return noteIndex;
    case "descending":
      return -noteIndex;
    case "cycle":
      return noteIndex;
    case "arch": {
      const period = span * 2;
      const phase = noteIndex % period;
      return phase <= span ? phase : period - phase;
    }
    case "wedgeOut": {
      // Alternates outward from the root: 0, +1, -1, +2, -2, +3, -3, ...
      const magnitude = Math.ceil(noteIndex / 2);
      const sign = noteIndex % 2 === 0 ? -1 : 1;
      return noteIndex === 0 ? 0 : sign * magnitude;
    }
  }
}

export function buildMelody(resultant: Resultant, options: MelodyOptions): NoteEvent[] {
  const { rootMidiNote, scale, contour, span, baseVelocity, accentVelocity } = options;

  let cursor = 0;
  return resultant.segments.map((segment, index) => {
    const degreeIndex =
      contour === "cycle"
        ? index % scale.degrees.length
        : degreeIndexForContour(contour, index, span * scale.degrees.length);

    const note: NoteEvent = {
      midiNote: midiNoteForDegree(scale, rootMidiNote, degreeIndex),
      startUnits: cursor,
      durationUnits: segment.duration,
      velocity: segment.sources.length > 1 ? accentVelocity : baseVelocity,
      voice: 0,
    };
    cursor += segment.duration;
    return note;
  });
}

export interface StrataOptions {
  /** Semitone offsets for each parallel harmony voice, e.g. [4, 7] for a major triad above. */
  intervals: number[];
  velocityScale?: number;
}

/**
 * Schillinger's "harmonization by strata": adds parallel voices at fixed
 * interval offsets from the melody, moving in lockstep with it.
 */
export function applyStrata(melody: readonly NoteEvent[], options: StrataOptions): NoteEvent[] {
  const { intervals, velocityScale = 0.8 } = options;
  const harmonyVoices = intervals.flatMap((interval, voiceIndex) =>
    melody.map((note) => ({
      ...note,
      midiNote: note.midiNote + interval,
      velocity: Math.round(note.velocity * velocityScale),
      voice: voiceIndex + 1,
    })),
  );
  return [...melody, ...harmonyVoices];
}
