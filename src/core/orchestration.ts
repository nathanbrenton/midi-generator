/**
 * Book XII: Theory of Orchestration (p.1485-1606).
 *
 * The book is Schillinger's instrument-by-instrument survey (Part I), the
 * nomenclature (Ch.7), instrumental combination (Ch.8) and the opening of an
 * "Acoustical Basis of Orchestration" (Ch.9) that the editors cut short: "the
 * material that follows is not complete." What can be checked is checked
 * here against the rendered figures. All pitches are MIDI numbers (C4 = 60);
 * transpositions are sounding minus written.
 *
 * Strings (Ch.1):
 *   - the violin is tuned in fifths from a by 3:2, so e = 3/2, d = 2/3,
 *     g = (2/3)²; the fifths are 2 cents wide of equal temperament, which is
 *     why "Hindemith... avoid[s] the use of open strings" (`pythagoreanStrings`);
 *   - the position in which the first finger plays a note is its interval
 *     number from the open string minus one: g# by the third finger on the
 *     a-string is in the fourth position; the second finger in the sixth
 *     position on the e-string plays the octave e (`positionOf`, `noteInPosition`);
 *   - the nth harmonic divides the string into n parts; "every node in the
 *     same subdivision produces identical harmonics" and the nodes are
 *     symmetric about the middle (`harmonicNodes`); Figure 17's contact
 *     points against equal temperament: 2/1, 3/2, 4/3 "practically exact",
 *     16/9 "very slightly lower", 5/4, 25/16, 10/4 "slightly lower", 8/5 and
 *     12/5 "slightly higher" (`contactDeviation`); "artificial harmonics":
 *     the first finger presses, the fourth touches a fourth above, sounding
 *     two octaves above the pressed note (`artificialHarmonic`);
 *   - viola a fifth below the violin, 'cello an octave below the viola,
 *     double-bass in fourths sounding an octave below; a solo bass tuned a
 *     tone higher reads a minor seventh down.
 *
 * Winds (Ch.2-3): the book's transpositions (`INSTRUMENTS`); the clarinet,
 * overblowing at the twelfth, leaves 18 semitones between its fundamental
 * and its third harmonic; valves lower by 2, 1 and 3 semitones and together
 * by 3, 5, 4 and 6 (`valveCombinations`), so the lowest note is six below the
 * second natural tone -- the trumpet's written f#; the horn in F sounds a
 * fifth below, written middle c (its 4th natural tone) sounding f; the tuba's
 * four valves (2, 1, 3, 5) cover every interval up to its octave gap.
 *
 * The trombone (`tromboneNotes`): seven slide positions a semitone apart,
 * natural tones 1-12 (no 7th or 11th), fundamentals only in I-IV; this leaves
 * Figure 45's gap, b1 c2 c#2 d2 d#2, and Figure 100's span "3 + (-5 [gap]) +
 * 34". The F-valve (a fourth) fills it from III2-VI2 with d#2, d2, c#2, c2,
 * all but b1: "3 + (-1 [gap]) + 38".
 *
 * Harp (Ch.4): seven pedals, three notches each (flat, natural, sharp); the
 * book says all 36 Σ(13) can be set "because none... contains intervals
 * greater than 4 semitones." The interval condition holds (the largest is
 * 3), but it is not enough: one string per letter sets 35 of the 36, and Σ
 * XXX (c eb e g ab bb b) cannot be set (`harpPedals`).
 *
 * Organ and Hammond (Ch.4-5): a stop's pitch follows its pipe-length
 * (`footagePitch`: 4' an octave above 8', 32' two below); the Hammond's
 * levers are the sub-fundamental, the sub-third harmonic and harmonics 1, 2,
 * 3, 4, 5, 6, 8, tempered (`HAMMOND_DRAWBARS`).
 *
 * Ch.8, combination: Figures 99-101's ranges in semitones agree with the
 * instrument figures for the violin (52, 52, 33), the 'cello (40), the bass
 * ((31) 27, (28) 24), the trombone, the tuba (D1 to F4, 39), the saxophones
 * (30) and the reeds. They disagree for the viola, whose own Figure 20 and
 * text give 40 orchestral (a twelfth above the A string) and 45 solo (two
 * octaves) against the table's 33 and 40, and for the 'cello solo (45 by
 * Figure 22, 47 in the table) (`RANGE_TABLE`). Also the blending scales of
 * timbre and the correspondence of attack-forms.
 */

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export const cents = (ratio: number) => 1200 * Math.log2(ratio);

// ---------- Instruments ----------

export interface Instrument {
  name: string;
  family: "strings" | "woodwind" | "brass" | "keyboard" | "percussion" | "voice";
  /** Sounding minus written, in semitones. */
  transposition: number;
  /** Open strings, as sounding pitches. */
  strings?: number[];
  /** Written range used in the book's semitone tables, where the figures give it. */
  written?: [number, number];
}

export const INSTRUMENTS: readonly Instrument[] = [
  { name: "violin", family: "strings", transposition: 0, strings: [55, 62, 69, 76], written: [55, 107] },
  { name: "viola", family: "strings", transposition: 0, strings: [48, 55, 62, 69], written: [48, 88] },
  { name: "'cello", family: "strings", transposition: 0, strings: [36, 43, 50, 57], written: [36, 76] },
  { name: "double-bass", family: "strings", transposition: -12, strings: [28, 33, 38, 43], written: [40, 67] },
  { name: "flute", family: "woodwind", transposition: 0, written: [60, 98] },
  { name: "piccolo", family: "woodwind", transposition: 12 },
  { name: "alto flute in G", family: "woodwind", transposition: -5 },
  { name: "alto flute in F", family: "woodwind", transposition: -7 },
  { name: "oboe", family: "woodwind", transposition: 0, written: [58, 89] },
  { name: "English horn", family: "woodwind", transposition: -7 },
  { name: "heckelphone", family: "woodwind", transposition: -12 },
  { name: "clarinet in Bb", family: "woodwind", transposition: -2, written: [52, 91] },
  { name: "clarinet in A", family: "woodwind", transposition: -3, written: [52, 91] },
  { name: "clarinet in D", family: "woodwind", transposition: 2 },
  { name: "clarinet in Eb", family: "woodwind", transposition: 3 },
  { name: "alto clarinet in Eb", family: "woodwind", transposition: -9 },
  { name: "bassethorn in F", family: "woodwind", transposition: -7 },
  { name: "bass clarinet in Bb", family: "woodwind", transposition: -14, written: [48, 86] },
  { name: "bass clarinet in A", family: "woodwind", transposition: -15 },
  { name: "soprano saxophone", family: "woodwind", transposition: -2, written: [58, 88] },
  { name: "alto saxophone", family: "woodwind", transposition: -9, written: [58, 88] },
  { name: "tenor saxophone", family: "woodwind", transposition: -14, written: [58, 88] },
  { name: "baritone saxophone", family: "woodwind", transposition: -21, written: [58, 88] },
  { name: "bass saxophone", family: "woodwind", transposition: -26, written: [58, 88] },
  { name: "bassoon", family: "woodwind", transposition: 0 },
  { name: "contrabassoon", family: "woodwind", transposition: -12 },
  { name: "horn in F", family: "brass", transposition: -7 },
  { name: "trumpet in Bb", family: "brass", transposition: -2 },
  { name: "trumpet in A", family: "brass", transposition: -3 },
  { name: "piccolo trumpet in D", family: "brass", transposition: 2 },
  { name: "piccolo trumpet in Eb", family: "brass", transposition: 3 },
  { name: "alto trumpet in G", family: "brass", transposition: -5 },
  { name: "alto trumpet in F", family: "brass", transposition: -7 },
  { name: "bass trumpet in Bb", family: "brass", transposition: -14 },
  { name: "trombone", family: "brass", transposition: 0 },
  { name: "tuba", family: "brass", transposition: 0, written: [26, 65] },
  { name: "celesta", family: "keyboard", transposition: 12 },
  { name: "orchestra bells", family: "percussion", transposition: 24 },
  { name: "xylophone", family: "percussion", transposition: 12 },
  { name: "tenor (treble clef)", family: "voice", transposition: -12 },
];

export const instrument = (name: string) => INSTRUMENTS.find((i) => i.name === name)!;
export const sounding = (inst: Instrument, written: number) => written + inst.transposition;

// ---------- Strings ----------

/** The violin's strings tuned from a in pure fifths: ratio to a and deviation from equal temperament in cents. */
export function pythagoreanStrings(): { name: string; ratio: number; deviation: number }[] {
  return [
    { name: "g", ratio: (2 / 3) ** 2, semitones: -14 },
    { name: "d", ratio: 2 / 3, semitones: -7 },
    { name: "a", ratio: 1, semitones: 0 },
    { name: "e", ratio: 3 / 2, semitones: 7 },
  ].map(({ name, ratio, semitones }) => ({ name, ratio, deviation: cents(ratio) - semitones * 100 }));
}

/** The diatonic interval number (1 = unison) from an open string's letter to a note's letter. */
const intervalNumber = (openLetter: number, noteLetter: number) => noteLetter - openLetter + 1;

/** "Position, where a given note is produced by the first finger, equals the number of the corresponding musical interval, minus one" -- for a note played by finger f. */
export function positionOf(openLetter: number, noteLetter: number, finger: number): number {
  return intervalNumber(openLetter, noteLetter) - (finger - 1) - 1;
}

/** The letter (0 = c ... as diatonic steps from the open string's letter) played by finger f in a position. */
export function noteInPosition(openLetter: number, position: number, finger: number): number {
  return openLetter + position + (finger - 1);
}

/** Nodes of the nth harmonic: k/n with k and n coprime -- all give the same harmonic, symmetric about the middle. */
export function harmonicNodes(n: number): number[] {
  return Array.from({ length: n - 1 }, (_, i) => i + 1).filter((k) => gcd(k, n) === 1).map((k) => k / n);
}

/** The pitch of the nth harmonic of an open string, tempered (the 7th and 11th are only approximate). */
export function harmonicPitch(open: number, n: number): number {
  return open + Math.round(cents(n) / 100);
}

/** A contact point's frequency ratio against equal temperament: Figure 17's "practically exact", "very slightly lower" ... */
export function contactDeviation(ratio: number): { cents: number; verdict: "practically exact" | "very slightly lower" | "very slightly higher" | "slightly lower" | "slightly higher" } {
  const c = cents(ratio);
  const d = c - Math.round(c / 100) * 100;
  const size = Math.abs(d);
  const verdict = size <= 2 ? "practically exact" : size <= 5 ? (d < 0 ? "very slightly lower" : "very slightly higher") : d < 0 ? "slightly lower" : "slightly higher";
  return { cents: d, verdict };
}

/** The "artificial harmonic": press with the first finger, touch a fourth above with the fourth -- the fourth harmonic, two octaves above the pressed note. */
export function artificialHarmonic(pressed: number): { touched: number; sounds: number } {
  return { touched: pressed + 5, sounds: pressed + 24 };
}

/** Harmonics glissando from the nut to the middle: the main points 1/n, high to low (Figure 24). */
export function harmonicsGlissando(open: number, highest = 8): number[] {
  return Array.from({ length: highest - 1 }, (_, i) => harmonicPitch(open, highest - i));
}

// ---------- Brass ----------

/** Valve lowerings: I = 2, II = 1, III = 3 (and the tuba's IV = 5); every combination's total. */
export function valveCombinations(valves: readonly number[] = [2, 1, 3]): { valves: number[]; lowers: number }[] {
  const out: { valves: number[]; lowers: number }[] = [];
  for (let mask = 1; mask < 1 << valves.length; mask++) {
    const used = valves.map((_, i) => i).filter((i) => mask & (1 << i));
    out.push({ valves: used.map((i) => i + 1), lowers: used.reduce((s, i) => s + valves[i], 0) });
  }
  return out;
}

/** Semitones above the fundamental of a natural tone (the 7th, 11th, 13th, 14th are out of tune and left out by the book). */
export const NATURAL_TONE_SEMITONES: Readonly<Record<number, number>> = { 1: 0, 2: 12, 3: 19, 4: 24, 5: 28, 6: 31, 8: 36, 9: 38, 10: 40, 12: 43, 16: 48 };

/** Horn in F (written as a horn in C): its natural tones written and sounding (Figure 41). */
export function hornNaturalTones(): { tone: number; written: number; sounds: number }[] {
  return [2, 3, 4, 5, 6, 8, 9, 10, 12, 16].map((tone) => {
    const written = 36 + NATURAL_TONE_SEMITONES[tone];
    return { tone, written, sounds: written - 7 };
  });
}

/** Every note of the trombone (Bb, first-position fundamental Bb1 = 34), natural tones 1-10, with or without the F-valve. */
export function tromboneNotes(withValve: boolean): { pitch: number; position: number; tone: number; valve: boolean }[] {
  const tones = [1, 2, 3, 4, 5, 6, 8, 9, 10];
  const out: { pitch: number; position: number; tone: number; valve: boolean }[] = [];
  for (let position = 1; position <= 7; position++) {
    for (const tone of tones) {
      if (tone === 1 && position > 4) continue; // "beginning with the fifth position... the fundamental [is] impossible"
      out.push({ pitch: 34 - (position - 1) + NATURAL_TONE_SEMITONES[tone], position, tone, valve: false });
    }
  }
  if (withValve) {
    // The valve lowers the second natural tone a fourth in III-VI; in VII "it breaks itself into... the third natural tone."
    for (const position of [3, 4, 5, 6]) out.push({ pitch: 34 - (position - 1) + 12 - 5, position, tone: 2, valve: true });
  }
  return out;
}

/** The trombone's span as Figure 100 writes it: pedal tones, the gap, and the continuous range above. */
export function tromboneSpan(withValve: boolean): { pedal: number; gap: number[]; continuous: number } {
  const pitches = new Set(tromboneNotes(withValve).map((n) => n.pitch));
  const sorted = [...pitches].sort((a, b) => a - b);
  const lowestPedal = sorted[0];
  const fundamentalOfI = 34;
  const gap: number[] = [];
  let p = fundamentalOfI + 1;
  while (!pitches.has(p)) gap.push(p++);
  return { pedal: fundamentalOfI - lowestPedal, gap, continuous: sorted[sorted.length - 1] - p };
}

// ---------- Harp ----------

const NATURALS = [0, 2, 4, 5, 7, 9, 11];
/** Pedal settings for a seven-tone set, one string per letter c d e f g a b, each flat (-1), natural (0) or sharp (+1); null when impossible. */
export function harpPedals(pitchClasses: readonly number[]): number[] | null {
  const want = [...new Set(pitchClasses.map(mod12))];
  if (want.length !== 7) return null;
  const search = (letter: number, used: Set<number>, settings: number[]): number[] | null => {
    if (letter === 7) return settings;
    for (const alt of [0, -1, 1]) {
      const pc = mod12(NATURALS[letter] + alt);
      if (want.includes(pc) && !used.has(pc)) {
        const found = search(letter + 1, new Set([...used, pc]), [...settings, alt]);
        if (found) return found;
      }
    }
    return null;
  };
  return search(0, new Set(), []);
}

// ---------- Organ and Hammond ----------

/** A stop's pitch in semitones from the 8' (unison) stop: 4' = +12, 16' = -12, 2 2/3' = +19. */
export function footagePitch(feet: number): number {
  return Math.round(cents(8 / feet) / 100);
}

/** The Hammond levers (Ch.5): sub-fundamental, sub-third harmonic, then harmonics 1-6 and 8. */
export const HAMMOND_DRAWBARS = [
  { label: "sub-fundamental", ratio: 1 / 2, feet: "16'" },
  { label: "sub-third", ratio: 3 / 2, feet: "5 1/3'" },
  { label: "fundamental", ratio: 1, feet: "8'" },
  { label: "2nd", ratio: 2, feet: "4'" },
  { label: "3rd", ratio: 3, feet: "2 2/3'" },
  { label: "4th", ratio: 4, feet: "2'" },
  { label: "5th", ratio: 5, feet: "1 3/5'" },
  { label: "6th", ratio: 6, feet: "1 1/3'" },
  { label: "8th", ratio: 8, feet: "1'" },
] as const;

// ---------- Ch.8: combination ----------

/** Figures 99-101, semitone spans as printed; the strings with (orchestra, solo, pizzicato), basses with their (5-string) values. */
export const RANGE_TABLE = {
  flutes: { alto: 31, grande: 38, piccolo: 27 },
  clarinets: { bass: 38, bassWithoutExtension: 34, alto: 34, soprano: 39, piccolo: 39 },
  saxophones: { bass: 30, baritone: 30, tenor: 30, alto: 30, soprano: 30 },
  oboes: { baritone: 27, alto: 28, soprano: 31 },
  bassoons: { contrabassoon: 34, bassoon: 40 },
  horns: 44,
  trumpets: { bass: 25, alto: 25, soprano: 32, piccolo: 30 },
  trombones: { withValve: [3, 1, 38], withoutValve: [3, 5, 34] },
  tuba: 39,
  strings: {
    violins: { orchestra: 52, solo: 52, pizzicato: 33 },
    violas: { orchestra: 33, solo: 40, pizzicato: 28 },
    cellos: { orchestra: 40, solo: 47, pizzicato: 40 },
    basses: { orchestra: 27, orchestra5: 31, solo: 41, pizzicato: 24, pizzicato5: 28 },
  },
} as const;

/** "A scale of decreasing timbral similarities" for pairs of families (p.1594-1595). */
export const TIMBRAL_SIMILARITY = {
  woodwind: ["oboes and bassoons", "clarinets and bassoons", "flutes and clarinets", "clarinets and oboes", "flutes and bassoons", "flutes and oboes"],
  brass: ["horns and tuba", "trumpets and trombones", "trombones and tuba", "horns and trombones", "trumpets and horns", "trumpets and tuba"],
} as const;

/** Figure 98, the attack-forms of the winds; the strings answer each with one or more bowings. */
export const ATTACK_FORMS = {
  flutes: ["legato", "portamento", "staccato", "frulato", "multiple tongue"],
  clarinets: ["legato", "portamento", "staccato"],
  oboes: ["legato", "portamento", "soft staccato", "hard staccato"],
  bassoons: ["legato", "portamento", "soft staccato", "hard staccato"],
  horns: ["legato", "portamento", "staccato"],
  tuba: ["legato", "portamento", "staccato"],
  trombones: ["legato", "portamento", "soft staccato", "hard staccato"],
  trumpets: ["legato", "portamento", "soft staccato", "hard staccato", "multiple tongue", "frulato"],
  strings: ["legato", "detaché", "portamento", "spiccato", "staccato", "martellato", "saltando", "col legno", "pizzicato"],
} as const;

/** The classified combinations (Figures 90-93): each family in single, double, triple or quadruple. */
export function combination(multiple: 1 | 2 | 3 | 4): Record<string, number> {
  const families = ["flutes", "oboes", "clarinets", "bassoons", "horns", "trumpets", "trombones"];
  return Object.fromEntries(families.map((f) => [f, multiple]));
}

