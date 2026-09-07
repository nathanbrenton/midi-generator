/**
 * Book V, Chapter 8, Section G: Passing Fourth-Sixth Chords, S(4/6)
 * (p.427-434).
 *
 * G4/6 = S(5) + S(4/6) + S(6) -- unlike Ch.8-A's G6, this group is
 * *reversible* (p.428), so the descending form is just the same three
 * chords in reverse order (`orderForDirection` below), not a separately
 * derived structure.
 *
 * The relations chain given in the book is "S(5) + C-5 + S(4/6) + C5 +
 * S(6)" (p.429) -- read literally, a round trip: move to the C-5-related
 * chord, borrow its second-inversion voicing as the passing S(4/6), then
 * move back via C5 to the *original* chord's first inversion, S(6). This
 * was hand-verified numerically before writing any of this: starting from
 * a C-major S(5) {bass 48, root 60, third 64, fifth 67}, applying the
 * book's own stated "clockwise" transformation (p.429: "as the bass moves
 * from 1 to 5... the three upper voices must move clockwise... to get the
 * transformation of 1 into 3") at a root degree stepped by C-5 (-4
 * diatonic degrees, the same interval `diatonicCycle(5)` steps by)
 * produces an F-major intermediate chord -- and applying the *reverse*
 * (counterclockwise) transformation back to the original root degree
 * lands EXACTLY back on the original C-major pitch classes {0,4,7}, not a
 * new chord. So S(6) here is genuinely the same underlying harmony as the
 * starting S(5), just reached by a brief passing detour through a
 * neighboring key's own second inversion.
 *
 * S(4/6) always has "a fifth in the bass while the three upper parts have
 * the six usual arrangements" (p.427) -- i.e. root/third/fifth in some
 * order, no special doubling beyond the bass/upper-fifth coincidence, so
 * it's built as a plain `Voicing` exactly like Ch.8-A's own chords.
 *
 * S(6) is where "two possible forms of doubling (regardless of the
 * chord-structure): S(6)(1) and S(6)(3)" (p.427) actually matters.
 * Working out Ch.6/7's own `upperVoiceFunctions(doubled, bass=3)` rule by
 * hand for both cases: S(6)(3) (doubled third) gives upper voices {1,3,5}
 * -- exactly Ch.8-A's plain `Voicing` shape (bass and the upper third
 * already coincide, no new code needed). S(6)(1) (doubled root) gives
 * upper voices {1,1,5} -- third is absent from the uppers entirely,
 * replaced by a second root. That second case is the one genuine reason
 * this module needs its own small `FourSixGroupChord` shape (a bass plus
 * a plain list of 3 upper pitches) instead of reusing `Voicing` directly
 * for the final chord -- `Voicing`'s fixed root/third/fifth fields have
 * no slot for "third is missing, root appears twice." This is a
 * deliberately local, minimal type (chosen over extending the shared
 * `Voicing` type, which Ch.2/7/8-A all depend on for shapes that don't
 * need doubling, or rebuilding on `variableDoublings.ts`'s semitone-based
 * system, which has no notion of walking a scale-degree progression) --
 * see the project memory for the fuller reasoning.
 */

import type { PitchScale } from "./scales.ts";
import { transformVoicing, nearestPitch, type Voicing } from "./diatonicHarmony.ts";

/** A fifth spans 4 diatonic degree-steps -- the same interval `diatonicCycle(5)` and Ch.9's `SEVENTH_CYCLE_STEPS[5]` already use. */
const FIFTH_STEP = 4;

export type FourSixDoubling = "root" | "third";

/** The final chord's own shape: a bass plus exactly 3 upper pitches -- see the module docstring for why this can't just be a `Voicing`. */
export interface FourSixGroupChord {
  bass: number;
  upper: readonly number[];
}

function voicingToGroupChord(voicing: Voicing): FourSixGroupChord {
  return { bass: voicing.bass, upper: [voicing.root, voicing.third, voicing.fifth] };
}

/** The nearest pitch of `targetPitchClass` strictly above `referencePitch` -- used to place a doubled voice above the rest of the chord instead of colliding in unison with the plain root. */
function nearestPitchAbove(referencePitch: number, targetPitchClass: number): number {
  const targetClass = ((targetPitchClass % 12) + 12) % 12;
  let note = referencePitch + 1;
  while (((note % 12) + 12) % 12 !== targetClass) note++;
  return note;
}

/**
 * Builds the three chords of a G4/6 group in ascending order (S(5),
 * S(4/6), S(6)) from a starting root-position S(5) `Voicing` (see module
 * docstring for the full derivation).
 */
export function buildFourSixGroup(
  startVoicing: Voicing,
  scale: PitchScale,
  rootMidiNote: number,
  rootDegree: number,
  doubling: FourSixDoubling,
): [FourSixGroupChord, FourSixGroupChord, FourSixGroupChord] {
  const intermediateDegree = rootDegree - FIFTH_STEP;
  const intermediate = transformVoicing(startVoicing, scale, rootMidiNote, intermediateDegree, "clockwise");
  const fourSixVoicing: Voicing = { ...intermediate, bass: nearestPitch(intermediate.bass, intermediate.fifth) };

  const backVoicing = transformVoicing(fourSixVoicing, scale, rootMidiNote, rootDegree, "counterclockwise");
  const sixthBass = nearestPitch(backVoicing.bass, backVoicing.third);
  const sixthUpper =
    doubling === "third"
      ? [backVoicing.root, backVoicing.third, backVoicing.fifth]
      : [backVoicing.root, nearestPitchAbove(backVoicing.fifth, backVoicing.root), backVoicing.fifth];

  return [voicingToGroupChord(startVoicing), voicingToGroupChord(fourSixVoicing), { bass: sixthBass, upper: sixthUpper }];
}

/** G4/6 is reversible (p.428): the descending form is the same three chords in reverse order, not a separate derivation. */
export function orderForDirection(
  group: readonly [FourSixGroupChord, FourSixGroupChord, FourSixGroupChord],
  direction: "ascending" | "descending",
): FourSixGroupChord[] {
  return direction === "ascending" ? [...group] : [...group].reverse();
}
