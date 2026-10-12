/**
 * Book II, Chapter 5: Pitch-Scales -- The Second Group. Scales in Expansion.
 *
 * Section A (Methods of Tonal Expansion, p.132-133): the first expansion
 * (E1) of an N-unit scale is a circular permutation "over one pitch-unit" --
 * concretely, starting from unit 0 and repeatedly stepping by 2 positions
 * (mod N) through the scale's own units, until the walk returns to an
 * already-visited unit; at that point "the recurring unit is omitted" and
 * the walk restarts from the smallest not-yet-visited unit, continuing
 * until every unit has been placed once. Higher expansions E_k use step
 * k+1 instead of step 2. The book's own two worked examples (p.132-133),
 * both confirmed by hand against the rendered page images (the odd-count
 * example's figure wasn't in the OCR text layer):
 *   - c-d-e-f-g (N=5, odd -- a single 5-cycle since gcd(2,5)=1):
 *     E1 = c-e-g-d-f
 *   - c-d-e-f-g-b (N=6, even -- splits into two 3-cycles since gcd(2,6)=2,
 *     the second cycle restarting at d once c recurs):
 *     E1 = c-e-g-d-f-b
 * "The total number of tonal expansions of one scale equals the number of
 * units therein minus one. This includes the original scale" -- i.e. E0
 * (step 1, the identity walk) through E_{N-2} (step N-1), for N-1 total.
 *
 * An expansion is realized as a scale -- ascending, spanning more than an
 * octave -- by `expandedScale` (Figure 24 writes every one that way), and
 * Section B's translation of a melody between expansions is an exact
 * procedure (unit n to unit n), built as `translateMelodyToExpansion`.
 * Sections C-D (variable pitch axes/modulation via common tones, identical
 * motifs, or chromatic alteration) are compositional workflow guidance on
 * top of these, not additional formulas.
 */

/**
 * The tonal expansion E_k of `units` (Schillinger's own pitch-unit
 * positions, in original scale order) -- a circular-permutation walk with
 * step (k+1), decomposed into gcd(k+1, N) cycles concatenated in order of
 * each cycle's starting index. `k` must be in [0, units.length - 2]; E0
 * (k=0) is the original scale, unchanged.
 */
export function tonalExpansion<T>(units: readonly T[], k: number): T[] {
  const n = units.length;
  if (n === 0) return [];
  if (!Number.isInteger(k) || k < 0 || k > n - 2) {
    throw new Error(`k must be an integer in [0, ${n - 2}]`);
  }
  const step = k + 1;
  const visited = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;
    let i = start;
    while (!visited[i]) {
      visited[i] = true;
      order.push(i);
      i = (i + step) % n;
    }
  }
  return order.map((index) => units[index]);
}

/** Every tonal expansion of `units`, E0 through E_{N-2} -- "N-1 total, including the original scale" (p.133). */
export function allTonalExpansions<T>(units: readonly T[]): T[][] {
  const n = units.length;
  if (n < 2) return n === 1 ? [[units[0]]] : [];
  const expansions: T[][] = [];
  for (let k = 0; k <= n - 2; k++) {
    expansions.push(tonalExpansion(units, k));
  }
  return expansions;
}

/**
 * Realizes a sequence of units as an ascending scale, each unit raised by
 * octaves until it sits above the previous one. "A pitch-scale is a
 * sequence of pitch-units following in consecutive order" (p.101), and
 * Figure 24 (p.135) writes every expansion that way -- natural major E1 is
 * c-e-g-b-d-f-a climbing past the octave, its units renumbered I..VII from
 * the root -- which is why expansions belong to the Second Group (one
 * root-tone, range over 12). `tonalExpansion` alone only reorders units.
 */
export function ascendingRealization(midiNotes: readonly number[]): number[] {
  const result: number[] = [];
  for (const note of midiNotes) {
    let placed = note;
    if (result.length > 0) {
      const previous = result[result.length - 1];
      while (placed <= previous) placed += 12;
    }
    result.push(placed);
  }
  return result;
}

/** E_k of a scale as the book writes it: the expansion's units, ascending from the root. */
export function expandedScale(scaleMidiNotes: readonly number[], k: number): number[] {
  return ascendingRealization(tonalExpansion(scaleMidiNotes, k));
}

/**
 * A melody note's unit number in its scale, counted from the root-tone in
 * consecutive order and continuing past the octave (unit N is the root an
 * octave up; -1 is the top unit an octave down). Throws if the note isn't
 * one of the scale's own pitch classes.
 */
export function unitNumber(note: number, scaleMidiNotes: readonly number[]): number {
  const root = scaleMidiNotes[0];
  const offsets = scaleMidiNotes.map((n) => (((n - root) % 12) + 12) % 12);
  const index = offsets.indexOf((((note - root) % 12) + 12) % 12);
  if (index < 0) throw new Error(`note ${note} is not a unit of the scale`);
  const octave = Math.floor((note - root - offsets[index]) / 12);
  return index + octave * scaleMidiNotes.length;
}

/**
 * Section B (p.134): "transcribing a melody from one expansion into another
 * consists in... enumerating all the units in consecutive order from the
 * root-tone (scale axis) in both scales, and in translating units of one
 * melody into the units of another through the identical numbers," with
 * "the root-tone... of all the expansions on the same pitch level." Unit n
 * of the original scale becomes unit n of E_k; units past the expanded
 * scale's top continue into its next cycle, which starts on the root-tone
 * above its last unit.
 */
export function translateMelodyToExpansion(melodyMidiNotes: readonly number[], scaleMidiNotes: readonly number[], k: number): number[] {
  const expanded = expandedScale(scaleMidiNotes, k);
  const n = expanded.length;
  const [first] = ascendingRealization([...expanded, expanded[0]]).slice(-1);
  const period = first - expanded[0];
  return melodyMidiNotes.map((note) => {
    const unit = unitNumber(note, scaleMidiNotes);
    const cycle = Math.floor(unit / n);
    return expanded[unit - cycle * n] + cycle * period;
  });
}
