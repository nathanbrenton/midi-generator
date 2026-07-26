/**
 * Book I, Chapter 8: Coordination of Time Structures.
 *
 * Generalizes Chapter 7's attack/place synchronization into a chain of up
 * to three nested interferences (book pages 34-39): an instrumental group
 * (pli places) against an attack-group (pla places), that attack-group's
 * own attack count (aa) against a duration-group's attack count (aT), and
 * the resulting synchronized duration-group (T') against a final duration
 * -group (T'') that the whole thing must fit into (e.g. a bar length).
 *
 * Every one of the book's "First/Second/Third Case" splits (pp. 36-38)
 * turns out to be the same gcd-based reduction Ch. 7 already uses, just
 * applied to different quantities -- confirmed by re-deriving all of the
 * book's own worked examples (Figures 58-63) by hand before writing any
 * code. Section A's three cases (aa=4/aT=4 -> A=4,T'=6t; aa=5/aT=4 ->
 * A=20,T'=30t; aa=6/aT=4 -> A=12,T'=18t) and Section B's three cases
 * (T'=6t/T''=6t -> N=1; T'=6t/T''=5t -> N=6; T'=6t/T''=4t -> N=3) all
 * match exactly.
 *
 * Section C chains pli/pla into that same machinery and, in the book's own
 * worked example (pli=4, pla=3, aa=8, aT=6, T=10t, T''=8t), lands on a
 * genuinely fractional intermediate result (T'=160/3t, then T'/T''=20/3) --
 * resolved by scaling the whole system by the leftover denominator (3) to
 * clear it into a whole number of repeats (20). That's exact-fraction
 * arithmetic, not floating point, so `coordinateTimeStructures` carries
 * fractions through symbolically and only reduces to a final integer at
 * the very last step, exactly reproducing the book's own numbers
 * (32, 16/3, 160/3, 20/3 -> 20T'') end to end.
 */

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export interface Fraction {
  numerator: number;
  denominator: number;
}

function reduceFraction(numerator: number, denominator: number): Fraction {
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function fractionTimesInt(fraction: Fraction, n: number): Fraction {
  return reduceFraction(fraction.numerator * n, fraction.denominator);
}

function fractionDividedByInt(fraction: Fraction, n: number): Fraction {
  return reduceFraction(fraction.numerator, fraction.denominator * n);
}

/** A. Synchronization of an Attack-Group (aa) with a Duration-Group (T, spanning aT attacks). */
export interface AttackDurationSync {
  attackCount: number;
  durationAttackCount: number;
  /** A: the synchronized attack-group's total attack count -- always LCM(attackCount, durationAttackCount). */
  synchronizedAttacks: number;
  /** T': the duration-group's own length, repeated until it absorbs a whole number of attack-group repetitions. */
  synchronizedDuration: number;
}

export function synchronizeAttackWithDuration(
  attackCount: number,
  durationAttackCount: number,
  duration: number,
): AttackDurationSync {
  const divisor = gcd(attackCount, durationAttackCount);
  const repeats = attackCount / divisor;
  return {
    attackCount,
    durationAttackCount,
    synchronizedAttacks: durationAttackCount * repeats,
    synchronizedDuration: duration * repeats,
  };
}

/** B. Distribution of a Synchronized Duration-Group (T') through a Final Duration-Group (T''). */
export function repeatsToCloseFinalDuration(synchronizedDuration: number, finalDuration: number): number {
  const divisor = gcd(synchronizedDuration, finalDuration);
  return synchronizedDuration / divisor;
}

/** C. Synchronization of an Instrumental Group (pli) with an Attack-Group (pla), chained through A and B. */
export interface CoordinationResult {
  reducedInstrumentalPlaces: number;
  synchronizedAttacks: number;
  synchronizedAttacksFraction: Fraction;
  synchronizedDuration: Fraction;
  finalRepeatsFraction: Fraction;
  /** The whole-number repeat count, after scaling the entire system by `scaleFactor` to clear any fraction. */
  finalRepeats: number;
  /** How many times every quantity in the chain must also be scaled up for finalRepeats to be exact. 1 if no scaling was needed. */
  scaleFactor: number;
}

export function coordinateTimeStructures(
  pli: number,
  pla: number,
  aa: number,
  aT: number,
  duration: number,
  finalDuration: number,
): CoordinationResult {
  const reducedInstrumentalPlaces = pli / gcd(pli, pla);
  const synchronizedAttacks = aa * reducedInstrumentalPlaces;
  const synchronizedAttacksFraction = reduceFraction(synchronizedAttacks, aT);
  const synchronizedDuration = fractionTimesInt(synchronizedAttacksFraction, duration);
  const finalRepeatsFraction = fractionDividedByInt(synchronizedDuration, finalDuration);
  return {
    reducedInstrumentalPlaces,
    synchronizedAttacks,
    synchronizedAttacksFraction,
    synchronizedDuration,
    finalRepeatsFraction,
    finalRepeats: finalRepeatsFraction.numerator,
    scaleFactor: finalRepeatsFraction.denominator,
  };
}
