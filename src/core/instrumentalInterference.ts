/**
 * Book I, Chapter 7: Resultants Applied to Instrumental Forms.
 *
 * Extends synchronization past pure time-rhythm to an "instrumental group" --
 * a fixed number of places of attack (different drums, a melodic motif's own
 * pitches, or a named accompaniment figure like the bass/chord alternation of
 * a polka, fox-trot, or rhumba) cycled one-per-attack against a rhythmic
 * resultant's own attack count.
 *
 * The book's own two worked examples (p. 27-28): resultant with 4 attacks
 * against 2 kettle drums -- "the instrumental group appears twice, the
 * rhythmic resultant will appear once" -- and a 7-attack resultant against
 * the same 2 drums -- "the kettle drum figure will appear 7 times, while the
 * rhythmic resultant appears twice." Both are exactly `placeCount/gcd` and
 * `attackCount/gcd` respectively; no new resultant math is needed here, only
 * the same gcd/LCM reduction Ch. 2A already uses, applied to (attack count,
 * place count) instead of (generator a, generator b).
 */

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface InstrumentalSync {
  attackCount: number;
  placeCount: number;
  /** How many times the resultant (time-rhythm) cycle repeats before realigning with the instrumental group. */
  resultantRepeats: number;
  /** How many times the instrumental group's own cycle repeats before realigning with the resultant. */
  instrumentRepeats: number;
  /** attackCount * resultantRepeats === placeCount * instrumentRepeats -- the point of realignment. */
  totalAttacks: number;
}

export function synchronizeInstrumentalGroup(attackCount: number, placeCount: number): InstrumentalSync {
  const divisor = gcd(attackCount, placeCount);
  const resultantRepeats = placeCount / divisor;
  const instrumentRepeats = attackCount / divisor;
  return {
    attackCount,
    placeCount,
    resultantRepeats,
    instrumentRepeats,
    totalAttacks: attackCount * resultantRepeats,
  };
}

/** Which place (0-indexed) fires on each successive attack, across the full realigned cycle. */
export function assignPlaces(attackCount: number, placeCount: number): number[] {
  const { totalAttacks } = synchronizeInstrumentalGroup(attackCount, placeCount);
  return Array.from({ length: totalAttacks }, (_, i) => i % placeCount);
}

/**
 * Reduces a list of attack start-times (in units, within a cycle of
 * `totalUnits`) to the same {duration}-segment shape `generatorPulse` uses:
 * each entry's duration runs until the next attack in the list, wrapping
 * around the end of the cycle back to the first. `times` need not be evenly
 * spaced -- unlike a generator's own pulse, one place's attacks land wherever
 * the underlying resultant happens to hand them off.
 */
export function segmentsFromAttackTimes(times: readonly number[], totalUnits: number): { duration: number }[] {
  return times.map((time, index) => {
    const next = index + 1 < times.length ? times[index + 1] : times[0] + totalUnits;
    return { duration: next - time };
  });
}

export type AccompanimentRole = "bass" | "chord";

export interface AccompanimentFigure {
  label: string;
  roles: readonly AccompanimentRole[];
}

/** "Here we will cite" -- the book's three named accompaniment figures (Ch. 7B). */
export const ACCOMPANIMENT_FIGURES: readonly AccompanimentFigure[] = [
  { label: "Polka (2-attack)", roles: ["bass", "chord"] },
  { label: "Fox-trot (4-attack)", roles: ["bass", "chord", "bass", "chord"] },
  { label: "Rhumba (6-attack)", roles: ["bass", "chord", "bass", "chord", "bass", "chord"] },
];
