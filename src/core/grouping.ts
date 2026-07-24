/**
 * Schillinger's Theory of Rhythm (Book I, Chapter 3): Grouping.
 *
 * The same resultant can be barred multiple ways depending on which
 * generator is treated as the beat: as one bar covering the whole cycle
 * (grouping by the common product), or as several bars sized to the major
 * or minor generator. Which one reads as "the" time signature depends on
 * what note value stands for one rhythm unit — that choice lives outside
 * this module (see the "unit note value" control), so a grouping here is
 * reported as bars of N units, not committed to a specific denominator.
 */

export interface Grouping {
  label: string;
  bars: number;
  unitsPerBar: number;
}

/** a is the major generator, b the minor — same convention as resultant.ts. */
export function computeGroupings(a: number, b: number): Grouping[] {
  return [
    { label: "By common product (c.p.)", bars: 1, unitsPerBar: a * b },
    { label: "By major generator (a)", bars: b, unitsPerBar: a },
    { label: "By minor generator (b)", bars: a, unitsPerBar: b },
  ];
}
