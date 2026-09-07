/**
 * Book V, Chapter 12: Generalization of Symmetric Progressions (p.489-496).
 *
 * Chapters 3-11 built symmetric harmony from "a monomial symmetry of the
 * uniform intervals of an octave" (2/3/4/6/12 equally-spaced tonics). This
 * chapter generalizes: any root motion at all -- diatonic or symmetric --
 * can be named as a semitone interval and composed into rhythmic groups
 * (binomials, trinomials, or any of Book I's own composition techniques),
 * turning a rhythm sequence directly into a chord-root progression.
 *
 * "The system of enumeration of intervals may follow the upward or
 * downward direction from any established axis point... it seems that
 * the descending system is the more practical" (p.489) -- the book's own
 * table (p.489) descends from the root: c->c=0, c->b=1, c->bb=2, c->a=3,
 * c->ab=4, c->g=5, c->f#=6, c->f=7, c->e=8, c->eb=9, c->d=10, c->db=11,
 * c->c(octave)=12. `descendingInterval` reproduces this exactly --
 * confirmed directly against the table (e.g. c->g=5, not 7: G sits 5
 * semitones *below* C, the octave-complement of the familiar "up a
 * fifth").
 *
 * "The total sum of all number-values expressing the intervals becomes a
 * divisor of 12, or any multiple thereof... a binomial 3+2 has 12
 * recurrences until it completes its cycle, as 3+2=5, and the smallest
 * multiple of 12 divisible by 5 is 60" (p.490) -- i.e. the group repeats
 * 12/gcd(sum,12) times before the cumulative root motion returns to the
 * starting pitch class. Confirmed against both of the book's own worked
 * examples: 3+2 (sum 5, coprime to 12) needs all 12 repetitions; the
 * 8-term group 4+1+3+2+2+3+1+4 (sum 20, gcd(20,12)=4) needs exactly 3,
 * matching "closes after three cycles" exactly.
 *
 * The modulation technique (Section A, p.492-493) is pure reuse, not a
 * new primitive: "detect the number-value expressing the interval
 * between the two chords" (`descendingInterval`, optionally +12 per the
 * book's own C->Bb example, to keep the target in a sensible octave), then
 * "compose a rhythmic group from [that] numeral" -- literally
 * `generateCompositions` (Book II Ch.7, already built for sectional
 * scales) applied to the interval instead of an octave-gap. The book's
 * own worked example, "breaking up number 9 into binomials: 8+1, 7+2,
 * 6+3, 5+4, and their reciprocals," is exactly
 * `generateCompositions(9, 2)`'s 8 rows -- confirmed by hand, no new
 * function needed for that step at all.
 */

export type PitchClass = number;

/** How many semitones below `fromPitchClass` you land on `toPitchClass` -- the book's own "descending system" (p.489). */
export function descendingInterval(fromPitchClass: PitchClass, toPitchClass: PitchClass): number {
  const from = ((fromPitchClass % 12) + 12) % 12;
  const to = ((toPitchClass % 12) + 12) % 12;
  return ((from - to) % 12 + 12) % 12;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Repetitions of a rhythm-group (whose descending steps sum to `groupSum`) needed to return to the starting pitch class (p.490). */
export function symmetricProgressionCycleLength(groupSum: number): number {
  if (groupSum <= 0 || !Number.isInteger(groupSum)) throw new Error("groupSum must be a positive integer");
  return 12 / gcd(groupSum, 12);
}

/**
 * Turns a rhythm-group (a sequence of descending-interval steps, typically
 * from Book I's own techniques) directly into a chord-root progression --
 * "the rhythm of chord progressions expressed in number-values" (p.489).
 * Each step moves further downward; the returned array has
 * `steps.length + 1` roots (the starting root, then one per step).
 */
export function chordRootProgression(startRootMidiNote: number, steps: readonly number[]): number[] {
  const roots = [startRootMidiNote];
  let current = startRootMidiNote;
  for (const step of steps) {
    current -= step;
    roots.push(current);
  }
  return roots;
}

/**
 * The interval to compose a modulation rhythm-group from (p.492-493):
 * the descending distance from `fromPitchClass` to `toPitchClass`, plus
 * 12 when `wideOctave` is set -- "when a number-value expressing the
 * interval... is a small number, it is necessary to add the invariant
 * 12," the book's own C->Bb example (2 -> 14).
 */
export function modulationInterval(fromPitchClass: PitchClass, toPitchClass: PitchClass, wideOctave = false): number {
  const interval = descendingInterval(fromPitchClass, toPitchClass);
  return wideOctave ? interval + 12 : interval;
}
