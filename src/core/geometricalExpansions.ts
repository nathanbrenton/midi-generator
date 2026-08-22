/**
 * Book III, Chapter 2: Geometrical Expansions.
 *
 * Distinct from Book II Ch.5's *tonal* expansion (which rearranges a
 * scale's own pitch-units without altering them), geometrical expansion
 * stretches the pitch axis itself by a constant coefficient: every
 * interval is multiplied by `coefficient` (p.209). Equivalently, since
 * the intervals are all measured from a common "pitch axis of the entire
 * system (usually the root-tone)" (p.218), each note's distance from that
 * axis is scaled directly: expandedPitch = axis + (pitch - axis) *
 * coefficient.
 *
 * Confirmed against the book's own footnote example (p.208): "c-d-e-f-g
 * would become c-e-g#-a#-d" under a 2p expansion. Hand-verified with
 * axis=c(60): d(62)->60+(62-60)*2=64=e; e(64)->68=g#; f(65)->70=a#;
 * g(67)->74=d (an octave up). Exact.
 *
 * Time expands the same way, independently of pitch (p.213-214): "pt
 * represents the original, 2t and 3t produce the corresponding time
 * expansions" -- both a note's start position and its own duration scale
 * by the time coefficient, since (unlike pitch) time already has a
 * natural axis at zero.
 *
 * A coefficient between 0 and 1 is a *contraction* rather than an
 * expansion -- the book frames this as the reciprocal case (root
 * coefficients like 1/2, 1/3) rather than a separate operation, so one
 * formula covers both directions.
 *
 * "All geometrical expansions are subject to geometrical inversions as
 * well" (p.220) -- the two techniques compose freely; this module doesn't
 * duplicate `geometricalPosition` from Ch.1, callers chain both directly.
 *
 * Range-readjustment (contracting an over-wide expanded melody back into
 * a practical register) and translating harmony voice-by-voice are
 * compositional workflow built on this one primitive, not additional
 * formulas, so aren't implemented separately.
 */

export interface TimedNote {
  midiNote: number;
  startUnits: number;
  durationUnits: number;
}

/** Scales every note's pitch distance from `axis` by `coefficient` -- >1 expands, 0<c<1 contracts (p.208-209). */
export function expandPitch<T extends { midiNote: number }>(notes: readonly T[], axis: number, coefficient: number): T[] {
  return notes.map((n) => ({ ...n, midiNote: axis + (n.midiNote - axis) * coefficient }));
}

/** Scales every note's start position and duration by `coefficient` -- time has a natural axis at zero (p.213-214). */
export function expandTime<T extends { startUnits: number; durationUnits: number }>(
  notes: readonly T[],
  coefficient: number,
): T[] {
  return notes.map((n) => ({ ...n, startUnits: n.startUnits * coefficient, durationUnits: n.durationUnits * coefficient }));
}

/** Applies both pitch and time expansion at once -- "expansion through two coordinates... merely magnifying" the melody (p.214). */
export function geometricalExpansion<T extends TimedNote>(
  notes: readonly T[],
  axis: number,
  pitchCoefficient: number,
  timeCoefficient: number,
): T[] {
  return expandTime(expandPitch(notes, axis, pitchCoefficient), timeCoefficient);
}
