/**
 * Alternate time-signature readings of a resultant. A resultant's abstract
 * "units" can be grouped into beats in more than one musically sensible
 * way — e.g. 4:3 (c.p. 12) reads equally well as 12/8 (each unit is its
 * own beat), 4/4 (each beat is 3 units, matching generator b), or 3/4
 * (each beat is 4 units, matching generator a). All three describe the
 * exact same 12 units; they differ only in how the bar lines fall.
 *
 * Denominator 16 is deliberately never offered — an uncommon time
 * signature denominator in practice — and numerators are capped to the
 * conventional 2-15 range. A numerator that would exceed that (or simply
 * has convenient factors, like 10 or 12) is instead broken into several
 * smaller bars: 12 beats becomes "3 x 4/4" or "4 x 3/4" rather than a
 * single 12/4 bar. Cut time (2/2) is offered wherever a 4/4-shaped
 * reading exists, since it's the same total duration renotated with the
 * beat doubled and the count halved.
 */

export type Technique = "plain" | "fractioned" | "expansion" | "contraction" | "balance";

export type TimeSignatureDenominator = 2 | 4 | 8;

export interface TimeSignatureOption {
  label: string;
  bars: number;
  beatsPerBar: number;
  unitsPerBeat: number;
  denominator: TimeSignatureDenominator;
}

export interface TimeSignatureParams {
  technique: Technique;
  a: number;
  b: number;
  cycleLength: number;
}

const MIN_BEATS_PER_BAR = 2;
const MAX_BEATS_PER_BAR = 15;

function factorBreakdowns(total: number): { bars: number; beatsPerBar: number }[] {
  const breakdowns: { bars: number; beatsPerBar: number }[] = [];
  for (let beatsPerBar = MIN_BEATS_PER_BAR; beatsPerBar <= MAX_BEATS_PER_BAR; beatsPerBar++) {
    if (total % beatsPerBar === 0) {
      breakdowns.push({ bars: total / beatsPerBar, beatsPerBar });
    }
  }
  return breakdowns;
}

function labelFor(bars: number, beatsPerBar: number, denominator: number): string {
  const signature = `${beatsPerBar}/${denominator}`;
  return bars === 1 ? signature : `${bars} × ${signature}`;
}

function optionsForUnitsPerBeat(
  cycleLength: number,
  unitsPerBeat: number,
  denominator: TimeSignatureDenominator,
): TimeSignatureOption[] {
  if (cycleLength % unitsPerBeat !== 0) return [];
  const total = cycleLength / unitsPerBeat;
  return factorBreakdowns(total).map(({ bars, beatsPerBar }) => ({
    label: labelFor(bars, beatsPerBar, denominator),
    bars,
    beatsPerBar,
    unitsPerBeat,
    denominator,
  }));
}

export function computeTimeSignatureOptions(params: TimeSignatureParams): TimeSignatureOption[] {
  const { technique, a, b, cycleLength } = params;

  const options: TimeSignatureOption[] = [
    // Raw/finest reading: one abstract unit per beat, notated in eighths by convention.
    ...optionsForUnitsPerBeat(cycleLength, 1, 8),
    ...optionsForUnitsPerBeat(cycleLength, a, 4),
  ];
  if (technique === "plain") {
    options.push(...optionsForUnitsPerBeat(cycleLength, b, 4));
  }

  for (const source of options.filter((o) => o.denominator === 4 && o.beatsPerBar === 4)) {
    options.push({
      label: labelFor(source.bars, 2, 2),
      bars: source.bars,
      beatsPerBar: 2,
      unitsPerBeat: source.unitsPerBeat * 2,
      denominator: 2,
    });
  }

  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.bars}x${option.beatsPerBar}/${option.denominator}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
