/**
 * Classifies a set of pitches into Schillinger's Theory of Pitch-Scales
 * groups (Book II, Ch. 1, p.101) and, for two-unit scales, the specific
 * interval (Book II, Ch. 2B, p.103). Both tables confirmed verbatim
 * against the book (see project memory) — see tests/pitchClassification.test.mjs.
 *
 * Only 1- and 2-pitch-class inputs are classified with confidence. For 3+
 * pitch classes, Group Three/Four's "range" isn't simply the pitch
 * content's actual span (the whole-tone scale's actual span is 10
 * semitones, but reads as "range=12" per Group Three), so it depends on
 * scale-construction details this module doesn't yet have verified —
 * classifyScaleGroup returns null rather than guess.
 */

export type ScaleGroup = 1 | 2 | 3 | 4;

export interface ScaleGroupResult {
  group: ScaleGroup;
  rootToneCount: 1;
  range: number;
  label: string;
}

const TWO_UNIT_INTERVAL_LABELS: Readonly<Record<number, string>> = {
  1: "minor second (m2)",
  2: "major second (M2)",
  3: "minor third (m3)",
  4: "major third (M3)",
  5: "perfect fourth (P4)",
  6: "augmented fourth / diminished fifth / tritone (A4, d5)",
  7: "perfect fifth (P5)",
  8: "minor sixth (m6)",
  9: "major sixth (M6)",
  10: "minor seventh (m7)",
  11: "major seventh (M7)",
};

/** Reduces MIDI note numbers to their distinct pitch classes (0-11), sorted. */
export function pitchClassesFromMidiNotes(midiNotes: readonly number[]): number[] {
  return [...new Set(midiNotes.map((note) => ((note % 12) + 12) % 12))].sort((a, b) => a - b);
}

/**
 * Classifies a 1- or 2-pitch-class scale into one of the four groups.
 * Both are always "one root-tone" constructions (Book II confirms this
 * explicitly for two-unit scales — "the two forms become a1 and b1" from
 * a single cell), so the group is decided purely by range vs. the
 * Group One/Two boundary (11 vs. over 12). Returns null for 3+ pitch
 * classes — see the module docstring.
 */
export function classifyScaleGroup(pitchClasses: readonly number[]): ScaleGroupResult | null {
  if (pitchClasses.length === 0 || pitchClasses.length > 2) return null;

  const range = pitchClasses.length === 1 ? 0 : Math.max(...pitchClasses) - Math.min(...pitchClasses);
  const group: ScaleGroup = range <= 11 ? 1 : 2;
  const groupName = group === 1 ? "One" : "Two";
  return {
    group,
    rootToneCount: 1,
    range,
    label: `Group ${groupName}: one root-tone, range ${range}`,
  };
}

/**
 * For an exactly-2-pitch-class scale, the named interval from the book's
 * two-unit scale table (1-11) — measured straight up from the lower pitch
 * class, matching the book's "constructed from c" convention (c-g is 7,
 * P5, not folded down to its 5-semitone complement).
 */
export function twoUnitScaleLabel(pitchClasses: readonly number[]): string | null {
  if (pitchClasses.length !== 2) return null;
  const interval = Math.abs(pitchClasses[1] - pitchClasses[0]);
  return TWO_UNIT_INTERVAL_LABELS[interval] ?? null;
}
