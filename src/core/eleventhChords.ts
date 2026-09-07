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
 * SAME-root chord `stackedNinthChord` already builds for Ch.10 Section A
 * -- the 11 resolves down to fill in the missing third (an octave up),
 * completing S(9)'s own 1-3-7-9 shape. This module only builds that first,
 * textually-confirmed link. The rest of the chain (S(9)->S(7)->S(6)③)
 * depends on Ch.10 Section A's own S(9) resolution, which was left
 * deliberately unbuilt there (see `ninthChords.ts`) -- not re-guessed
 * here either.
 *
 * Honest scope note: Section B (Preparation, p.470-472) and Section C
 * (Symmetric System, p.473-477) reuse the same two-"family" combinatorics
 * (7bS/7#S) already deferred in Ch.10 Section B for the same reason
 * (Figures didn't resolve confidently), and Section D (Hybrid Four-Part
 * Harmony, p.478+) is a large, separate generalized voice-leading system
 * (Figures 190-191's "constant abc" transformation tables) not assessed
 * yet. Natural next steps, not attempted here.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { generalPermutations } from "./permutations.ts";
import { stackedNinthChord } from "./ninthChords.ts";

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
