/**
 * Schillinger's Theory of Rhythm (Book I): interference of periodicities.
 *
 * Two or more "generators" each produce evenly-spaced attack points around
 * a shared cycle. Superimposing (unioning) those attack points produces the
 * "resultant" — an uneven rhythm whose segment durations are exactly the
 * gaps between consecutive attacks. Points where more than one generator
 * fires simultaneously are natural accents (Schillinger's coincidence
 * points). This same math drives pitch-scale generation in scales.ts,
 * because Schillinger's Book II builds symmetric pitch scales the same way
 * he builds rhythms in Book I.
 */

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** One segment of a resultant: its duration and which generators attacked at its start. */
export interface ResultantSegment {
  duration: number;
  sources: number[];
}

export interface Resultant {
  /** Total length of one full cycle, in abstract units. */
  cycleLength: number;
  /** Ordered segments covering the cycle; durations sum to cycleLength. */
  segments: ResultantSegment[];
  /** Sorted attack points (one per segment start), for reference/visualization. */
  attackPoints: number[];
}

/**
 * Builds the resultant of two or more generators. Each generator value v
 * fires v equally-spaced attacks across the cycle (spacing = cycleLength/v).
 * cycleLength is the LCM of all generator values, the shortest cycle in
 * which every generator completes a whole number of repetitions.
 */
export function generateResultant(generatorValues: number[]): Resultant {
  if (generatorValues.length < 2) {
    throw new Error("generateResultant needs at least two generators");
  }
  if (generatorValues.some((v) => !Number.isInteger(v) || v < 1)) {
    throw new Error("generator values must be positive integers");
  }

  const cycleLength = generatorValues.reduce(lcm);

  const attacksBySource = new Map<number, Set<number>>();
  generatorValues.forEach((value, index) => {
    const spacing = cycleLength / value;
    const points = new Set<number>();
    for (let k = 0; k < value; k++) {
      points.add(k * spacing);
    }
    attacksBySource.set(index, points);
  });

  const sourcesByPoint = new Map<number, number[]>();
  for (const [index, points] of attacksBySource) {
    for (const point of points) {
      const sources = sourcesByPoint.get(point) ?? [];
      sources.push(index);
      sourcesByPoint.set(point, sources);
    }
  }

  const attackPoints = [...sourcesByPoint.keys()].sort((a, b) => a - b);

  const segments: ResultantSegment[] = attackPoints.map((point, i) => {
    const next = attackPoints[i + 1] ?? cycleLength;
    return {
      duration: next - point,
      sources: (sourcesByPoint.get(point) ?? []).sort((a, b) => a - b),
    };
  });

  return { cycleLength, segments, attackPoints };
}

/**
 * A single generator's own evenly-spaced pulse, isolated from the others —
 * used to render true polyrhythm (e.g. 3-against-2) as independent voices
 * rather than the merged resultant.
 */
export function generatorPulse(value: number, cycleLength: number): ResultantSegment[] {
  if (cycleLength % value !== 0) {
    throw new Error(`cycleLength ${cycleLength} is not a multiple of generator ${value}`);
  }
  const spacing = cycleLength / value;
  return Array.from({ length: value }, () => ({ duration: spacing, sources: [] }));
}

/**
 * Schillinger's 19 canonical cases of binary synchronization (Book I,
 * Chapter 2A): every coprime pair of generators up to 9, major generator
 * first. Restricting to coprime pairs keeps each case in its simplest
 * form — a non-coprime pair like 4:2 just reduces to the 2:1 case.
 */
export interface BinarySynchronizationCase {
  label: string;
  a: number;
  b: number;
}

export const BINARY_SYNCHRONIZATION_CASES: readonly BinarySynchronizationCase[] = [
  { label: "3 : 2", a: 3, b: 2 },
  { label: "4 : 3", a: 4, b: 3 },
  { label: "5 : 2", a: 5, b: 2 },
  { label: "5 : 3", a: 5, b: 3 },
  { label: "5 : 4", a: 5, b: 4 },
  { label: "6 : 5", a: 6, b: 5 },
  { label: "7 : 2", a: 7, b: 2 },
  { label: "7 : 3", a: 7, b: 3 },
  { label: "7 : 4", a: 7, b: 4 },
  { label: "7 : 5", a: 7, b: 5 },
  { label: "7 : 6", a: 7, b: 6 },
  { label: "8 : 3", a: 8, b: 3 },
  { label: "8 : 5", a: 8, b: 5 },
  { label: "8 : 7", a: 8, b: 7 },
  { label: "9 : 2", a: 9, b: 2 },
  { label: "9 : 4", a: 9, b: 4 },
  { label: "9 : 5", a: 9, b: 5 },
  { label: "9 : 7", a: 9, b: 7 },
  { label: "9 : 8", a: 9, b: 8 },
];

/**
 * Distributes `remainder` extra units as evenly as possible across `n`
 * slots (Bresenham-style even spread) — used to divide the octave into a
 * number of parts that doesn't evenly divide 12.
 */
export function distributeRemainder(n: number, remainder: number): number[] {
  const extras: number[] = [];
  for (let i = 0; i < n; i++) {
    extras.push(
      Math.floor(((i + 1) * remainder) / n) - Math.floor((i * remainder) / n),
    );
  }
  return extras;
}
