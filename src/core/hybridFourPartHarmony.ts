/**
 * Book V, Chapter 11, Section D: Hybrid Four-Part Harmony (p.478-488).
 *
 * "The general technique of transformations for groups with three
 * functions may now be adopted for a generalization of the forms of
 * voice-leading in hybrid four-part harmony. The three upper parts
 * perform the transformations corresponding to the groups with three
 * functions, and the bass remains constant" (p.478) -- this chapter
 * generalizes Ch.2's clockwise/counterclockwise triad voice-leading
 * (`transformVoicing`, `diatonicHarmony.ts`) to every "hybrid" chord
 * already built in this project (S(9), S(11), plus S(5)/S(7)/S(13) forms
 * newly added here), by treating each chord's 3 upper voices as an
 * abstract a/b/c group -- the same 3-slot machinery, regardless of which
 * concrete functions (3-7-9, or 7-9-11, or 9-11-13...) fill it.
 *
 * Figure 190 (p.478, fully legible typeset numbers, no figure-reading
 * risk) tabulates 9 concrete forms across all 5 tensions -- `HYBRID_FORMS`
 * below is a direct transcription. Each hybrid chord function n (odd,
 * 1/3/5/7/9/11/13) is n-1 scale-degree-steps above the root, the same
 * "stack thirds by +2 scale degrees" convention already used by
 * `stackedSeventhChord`/`stackedNinthChord`/`stackedEleventhChord` --
 * this module's `stackedHybridChord` is their direct generalization
 * (confirmed those three chapters' own single hard-coded forms are
 * exactly Figure 190's own unmarked S(7)/S(9)/S(11) columns).
 *
 * Figure 191 (p.479) gives the 6 abstract transformations precisely, as
 * a permutation of the 3 letter-slots {a,b,c} (sorted ascending by
 * function number -- confirmed against the chapter's own two worked
 * examples, "S(9): 3/9,7" and "S(13): 7/13,9", both reading as a=lowest,
 * b=middle, c=highest, exactly matching Ch.2's own root=a/third=b/
 * fifth=c clockwise convention for a plain triad):
 *   - clockwise:        a->b, b->c, c->a   (Ch.2's own CLOCKWISE_NEXT)
 *   - counterclockwise: a->c, c->b, b->a   (Ch.2's own COUNTERCLOCKWISE_NEXT)
 *   - constant a:       a->a, b->c, c->b   (a holds, b/c swap)
 *   - constant b:       a->c, c->a, b->b   (b holds, a/c swap)
 *   - constant c:       a->b, b->a, c->c   (c holds, a/b swap)
 *   - constant abc:     a->a, b->b, c->c   (identity -- "complete parallelism")
 * These are exactly the 6 elements of the symmetric group on 3 letters:
 * the two 3-cycles, the three transpositions, and the identity.
 *
 * `transformHybridVoicing` is the direct generalization of
 * `transformVoicing`/`transformSeventhVoicing`: reassigns each old
 * letter-slot's pitch to its new slot via `nearestPitch`, exactly the
 * same minimal-movement idiom used everywhere else in this project.
 *
 * Honest scope note: Figures 192-200 (p.479-487) additionally tabulate
 * every one of the 20 "binomial" tension-pairs (S5<->S7, S5<->S9, ...,
 * S11<->S13) with concrete numeral tables for all 6 transformations --
 * this module builds the *general mechanic* directly (which works for
 * any pair of forms, not just the 20 the book happened to tabulate) and
 * was spot-checked against the chapter's own worked examples, rather
 * than transcribing every one of those dense multi-column tables by
 * hand. Section D's own closing continuity examples (constant-form vs.
 * variable-form/tension, p.488) are compositional guidance, not a
 * separate formula.
 */

import { midiNoteForDegree, type PitchScale } from "./scales.ts";
import { nearestPitch } from "./diatonicHarmony.ts";

export type HybridTension = 5 | 7 | 9 | 11 | 13;

export interface HybridForm {
  tension: HybridTension;
  /** "Those marked with an asterisk... are less commonly used than the unmarked ones" (p.478). */
  marked: boolean;
  /** The three upper-voice functions, as printed in Figure 190 (not necessarily sorted). */
  upperFunctions: readonly [number, number, number];
}

/** Figure 190, "Forms of Hybrid Four-Part (3+1) Harmony" (p.478) -- transcribed directly, all 9 columns. */
export const HYBRID_FORMS: readonly HybridForm[] = [
  { tension: 5, marked: false, upperFunctions: [5, 3, 1] },
  { tension: 5, marked: true, upperFunctions: [5, 3, 13] },
  { tension: 7, marked: false, upperFunctions: [7, 5, 3] },
  { tension: 7, marked: true, upperFunctions: [7, 3, 1] },
  { tension: 9, marked: false, upperFunctions: [9, 7, 3] },
  { tension: 9, marked: true, upperFunctions: [9, 7, 1] },
  { tension: 11, marked: false, upperFunctions: [11, 9, 7] },
  { tension: 13, marked: false, upperFunctions: [13, 9, 7] },
  { tension: 13, marked: true, upperFunctions: [13, 11, 7] },
];

export function hybridFormsForTension(tension: HybridTension): HybridForm[] {
  return HYBRID_FORMS.filter((f) => f.tension === tension);
}

/** Sorts a form's upper functions ascending -- a=lowest, b=middle, c=highest (see module docstring for why this matches the book's own a/b/c convention). */
function sortedFunctions(form: HybridForm): [number, number, number] {
  const sorted = [...form.upperFunctions].sort((x, y) => x - y);
  return [sorted[0], sorted[1], sorted[2]];
}

export interface HybridVoicing {
  bass: number;
  a: number;
  b: number;
  c: number;
}

/** Builds a root-position hybrid chord: bass = root, upper a/b/c = `form`'s three functions, each n-1 scale-degree-steps above the root. */
export function stackedHybridChord(scale: PitchScale, rootMidiNote: number, rootDegree: number, form: HybridForm): HybridVoicing {
  const bass = midiNoteForDegree(scale, rootMidiNote, rootDegree);
  const [a, b, c] = sortedFunctions(form).map((fn) => midiNoteForDegree(scale, rootMidiNote, rootDegree + (fn - 1)));
  return { bass, a, b, c };
}

export type ThreeFunctionTransform = "clockwise" | "counterclockwise" | "constantA" | "constantB" | "constantC" | "constantAbc";

type LetterSlot = "a" | "b" | "c";

/** Figure 191 (p.479) -- the 6 elements of the symmetric group on {a,b,c}. */
const TRANSFORM_MAPS: Record<ThreeFunctionTransform, Record<LetterSlot, LetterSlot>> = {
  clockwise: { a: "b", b: "c", c: "a" },
  counterclockwise: { a: "c", c: "b", b: "a" },
  constantA: { a: "a", b: "c", c: "b" },
  constantB: { a: "c", b: "b", c: "a" },
  constantC: { a: "b", b: "a", c: "c" },
  constantAbc: { a: "a", b: "b", c: "c" },
};

/**
 * Transforms `voicing` into the next hybrid chord (rooted at
 * `nextRootDegree`, in `nextForm`) via one of Figure 191's 6
 * transformations -- the direct generalization of `transformVoicing`/
 * `transformSeventhVoicing` to an arbitrary 3-function hybrid chord.
 */
export function transformHybridVoicing(
  voicing: HybridVoicing,
  scale: PitchScale,
  rootMidiNote: number,
  nextRootDegree: number,
  nextForm: HybridForm,
  transform: ThreeFunctionTransform,
): HybridVoicing {
  const nextStack = stackedHybridChord(scale, rootMidiNote, nextRootDegree, nextForm);
  const nextMap = TRANSFORM_MAPS[transform];

  const next: HybridVoicing = { bass: nearestPitch(voicing.bass, nextStack.bass), a: 0, b: 0, c: 0 };
  (["a", "b", "c"] as LetterSlot[]).forEach((slot) => {
    const newSlot = nextMap[slot];
    next[newSlot] = nearestPitch(voicing[slot], nextStack[newSlot]);
  });
  return next;
}
