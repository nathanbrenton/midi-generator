/**
 * Book V, Chapter 11, Section A: The Eleventh Chord, Diatonic System (p.469-471).
 *
 * "In four-part harmony, eleventh chords [S(11)] are used with the root-
 * tone in the bass only, thus forming a hybrid four-part harmony [like
 * that formed by S(5) with the doubled root]. The three upper parts
 * consist of 7, 9, 11" (p.469) -- unlike S(9) (upper voices 3, 7, 9,
 * which skip the fifth), S(11) skips BOTH the third and the fifth: its
 * upper voices are three *contiguous* stacked thirds (7-9-11), which is
 * exactly why "S(11) has an advantage over S(9) in that the upper
 * functions form a complete S(5)" -- 7,9,11 are themselves a triad shape,
 * just transposed up. "Seventh, ninth and eleventh form a triad
 * corresponding to a root, a third and a fifth, while the bass
 * corresponds to the pitch-unit one degree higher than the root of the
 * triad" -- confirming the bass sits a step below the 7 (i.e. it's the
 * true root, an octave-plus below where a literal stack would put "1").
 *
 * "As the bass remains constant, the three upper voices are subject to
 * six permutations" (Figure 176) -- the same positions mechanic reused
 * for Ch.6/7/10's hybrid-voicing chords.
 *
 * The resolution chain is stated directly and precisely (unlike S(9)'s,
 * which stayed genuinely underspecified): "An S(11) allows a continuous
 * chain of resolutions: S(11) -> S(9) -> S(7) -> S(6)[doubled third].
 * An eleventh-chord through resolution of the eleventh becomes a
 * ninth-chord... when S(11) resolves into S(9) in C0, S(9) has its proper
 * structural constitution (i.e. 1, 3, 7, 9)" (p.469-470). That's an exact,
 * checkable claim: resolving the 11 alone (C0 -- "if only one is
 * resolved, 11 must be resolved first") collapses S(11) into exactly the
 * SAME-root chord `stackedNinthChord` already builds for Ch.10 Section A.
 * `eleventhResolutionChain` builds the whole chain, one function down a
 * step at a time: c | b-d-f, c | b-d-e, c | b-c-e, c | a-c-e -- the last
 * an A minor over its third, the S(6)③ the book names (the same chord
 * S(9) reaches in C3). Figure 177 (rendered) adds the resolutions of all
 * three functions at once: C3 to that S(6)③ (or, the bass moving to g,
 * S(2)), C5 to F S(7) over f; "the C7 resolution does not appear... the
 * structural constitution of S(9) into which S(11) would resolve is 1,
 * 5, 7, 9" -- `ELEVENTH_RESOLUTIONS`.
 *
 * Section B, preparation (p.470-471, Figure 179): "As S(11) has an
 * appearance of an S(5) with a bass corresponding to the pitch-unit one
 * degree higher than the root of the triad, the most logical assumption
 * is: take S(5)①, move its bass one step up and this will produce an
 * S(11)" -- C7 -- and "to prepare S(11) after an S(5) in C0, move all
 * upper functions down scalewise and leave the bass stationary"
 * (`prepareEleventh`). Other cycles, "the more gradual transformation
 * (clockwise or counterclockwise) of the three upper functions," are left
 * to Ch.2's transformations.
 *
 * Section C (Symmetric System, p.473-477) uses the same two families as
 * S(9); Section D is `hybridFourPartHarmony.ts`.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { generalPermutations } from "./permutations.ts";
import { stackedNinthChord } from "./ninthChords.ts";
import { S5_STRUCTURES, symmetricTriad, type StructureId } from "./symmetricHarmony.ts";

/** Stacks a root-position eleventh-chord: bass = root alone, upper = seventh, ninth, eleventh (p.469 -- third and fifth are both omitted). */
export function stackedEleventhChord(scale: PitchScale, rootMidiNote: number, rootDegree: number): { bass: number; upper: number[] } {
  const bass = midiNoteForDegree(scale, rootMidiNote, rootDegree);
  const upper = [6, 8, 10].map((offset) => midiNoteForDegree(scale, rootMidiNote, rootDegree + offset));
  return { bass, upper };
}

export type EleventhUpperFunction = "seventh" | "ninth" | "eleventh";
export const ELEVENTH_UPPER_FUNCTIONS: readonly EleventhUpperFunction[] = ["seventh", "ninth", "eleventh"];

/** Every distinct ordering of the three upper voices (p.469, Figure 176) -- always 6, since 7/9/11 are always distinct. */
export function eleventhPositions(): EleventhUpperFunction[][] {
  return generalPermutations([0, 1, 2]).map((indices) => indices.map((i) => ELEVENTH_UPPER_FUNCTIONS[i])) as EleventhUpperFunction[][];
}

/**
 * Builds the four MIDI notes (bass + 3 upper voices) for one position,
 * stacked upward in plain close position above the bass -- this
 * project's own register choice, not a reproduction of Figure 176's
 * specific spacing (see module docstring).
 */
export function buildEleventhVoicing(
  position: readonly EleventhUpperFunction[],
  scale: PitchScale,
  rootMidiNote: number,
  rootDegree: number,
): { bass: number; upper: number[] } {
  const { bass, upper: rootPositionUpper } = stackedEleventhChord(scale, rootMidiNote, rootDegree);
  const pitchClassFor: Record<EleventhUpperFunction, number> = {
    seventh: rootPositionUpper[0],
    ninth: rootPositionUpper[1],
    eleventh: rootPositionUpper[2],
  };

  let previous = bass;
  const upper = position.map((fn) => {
    let note = pitchClassFor[fn];
    while (note <= previous) note += 12;
    previous = note;
    return note;
  });

  return { bass, upper };
}

/**
 * Resolves the eleventh alone (C0, p.469-470): "when S(11) resolves into
 * S(9) in C0, S(9) has its proper structural constitution (i.e. 1, 3, 7,
 * 9)" -- the 11 resolves down to fill in the missing third, landing
 * exactly on the same-root S(9) chord already built for Ch.10 Section A.
 */
export function resolveEleventhToNinth(scale: PitchScale, rootMidiNote: number, rootDegree: number): { bass: number; upper: number[] } {
  return stackedNinthChord(scale, rootMidiNote, rootDegree);
}

/**
 * The chain of C0 resolutions, "in the direction of the decreasing
 * functions" (p.469): S(11), then 11 down a step (S(9), 1-3-7-9), then 9
 * (S(7) without its fifth), then 7 (S(6)③). Upper voices lowest first.
 */
export function eleventhResolutionChain(scale: PitchScale, rootMidiNote: number, rootDegree: number): { label: string; bass: number; upper: number[] }[] {
  const bass = midiNoteForDegree(scale, rootMidiNote, rootDegree);
  // Scale degrees of 7, 9, 11 above the root; each resolution lowers the highest unresolved one by a degree.
  let degrees = [6, 8, 10].map((offset) => rootDegree + offset);
  const chain = [{ label: "S(11)", bass, upper: degrees.map((d) => midiNoteForDegree(scale, rootMidiNote, d)) }];
  for (const [index, label] of [[2, "S(9)"], [1, "S(7)"], [0, "S(6)"]] as const) {
    degrees = degrees.map((d, k) => (k === index ? d - 1 : d));
    chain.push({ label, bass, upper: degrees.map((d) => midiNoteForDegree(scale, rootMidiNote, d)) });
  }
  return chain;
}

/** Figure 177 (p.470): the resolutions of S(11), with the chord each lands on. */
export const ELEVENTH_RESOLUTIONS: readonly { cycle: "C0" | "C3" | "C5"; resolves: readonly (7 | 9 | 11)[]; result: string; alternative?: string }[] = [
  { cycle: "C0", resolves: [11], result: "S(9)" },
  { cycle: "C0", resolves: [11, 9], result: "S(7)", alternative: "S(4/3)" },
  { cycle: "C3", resolves: [11, 9, 7], result: "S(6)", alternative: "S(2)" },
  { cycle: "C5", resolves: [11, 9, 7], result: "S(7)" },
];

/**
 * Section B: preparing S(11) from S(5) on `triadRootDegree` (p.470-471).
 * C7: the bass moves up a step and the upper voices stay, now 7-9-11 of
 * the new root. C0: the bass stays and the three upper voices move down a
 * degree.
 */
export function prepareEleventh(
  scale: PitchScale,
  rootMidiNote: number,
  triadRootDegree: number,
  cycle: "C0" | "C7",
): { from: { bass: number; upper: number[] }; to: { bass: number; upper: number[]; rootDegree: number } } {
  const upperDegrees = [0, 2, 4].map((offset) => triadRootDegree + offset + 7);
  const from = {
    bass: midiNoteForDegree(scale, rootMidiNote, triadRootDegree),
    upper: upperDegrees.map((d) => midiNoteForDegree(scale, rootMidiNote, d)),
  };
  const rootDegree = cycle === "C7" ? triadRootDegree + 1 : triadRootDegree;
  const shift = cycle === "C7" ? 0 : -1;
  return {
    from,
    to: {
      bass: midiNoteForDegree(scale, rootMidiNote, rootDegree),
      upper: upperDegrees.map((d) => midiNoteForDegree(scale, rootMidiNote, d + shift)),
      rootDegree,
    },
  };
}

/**
 * Section C (p.473, Figures 182-183, rendered): "the structural
 * constitution of S(11) permits the classification of such structures as
 * S(5) with regard to their upper functions" -- the upper 7-9-11 is a
 * triad on the seventh, minor (10 semitones up) or major (11), in any of
 * the four S(5) structures. Common forms: 7bS1 major, 7bS2 minor, 7bS3
 * augmented; 7nS1 major, 7nS2 minor, 7nS4 diminished. "There are two less
 * common forms. The diminished in the first group and the augmented in
 * the second group" -- 7bS4, 7nS3.
 */
export const ELEVENTH_FAMILIES: readonly { family: "minor seventh" | "major seventh"; structure: StructureId; common: boolean }[] = [
  { family: "minor seventh", structure: 1, common: true },
  { family: "minor seventh", structure: 2, common: true },
  { family: "minor seventh", structure: 3, common: true },
  { family: "minor seventh", structure: 4, common: false },
  { family: "major seventh", structure: 1, common: true },
  { family: "major seventh", structure: 2, common: true },
  { family: "major seventh", structure: 4, common: true },
  { family: "major seventh", structure: 3, common: false },
];

/** The name the figure gives a form: its upper triad's (Figure 182). */
export function eleventhFormName(form: (typeof ELEVENTH_FAMILIES)[number]): string {
  return S5_STRUCTURES[form.structure].name;
}

/** An S(11) of one family and structure on `rootMidiNote`: the root in the bass, the triad on its seventh above (Section C). */
export function symmetricEleventhChord(family: "minor seventh" | "major seventh", structure: StructureId, rootMidiNote: number): { bass: number; upper: number[] } {
  const seventh = rootMidiNote + 12 + (family === "minor seventh" ? 10 : 11);
  return { bass: rootMidiNote, upper: symmetricTriad(structure, seventh) };
}
