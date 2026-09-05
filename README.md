# schillinger-midi

A MIDI generator built on Joseph Schillinger's *Theory of Rhythm* and *Theory
of Pitch Scales* (Books I and II of *The Schillinger System of Musical
Composition*), structured the same way as [`gematria`](../gematria): a
standalone Vite + React app with the theory logic kept separate from the UI
so it can be dropped into other apps.

## Run it standalone

```bash
npm install
npm run dev
```

## Motif Explorer

The main app (below) is a chapter-by-chapter tour of the books, one panel
per figure. **The Motif Explorer** (`src/pages/MotifExplorerPage.tsx`, at
the `#motif` URL) is a second, separate page with a different purpose: not
educational, an immediate compositional workbench for building and
auditioning one short musical idea at a time. It's reached via a plain
`location.hash` check in `App.tsx` (`useHashRoute.ts`) — no router, matching
the rest of the project's zero-dependency approach — and is the first
keyboard-driven surface in the codebase: **←/→** slides the motif's length
window, **↑/↓** browses its circular-permutation rotations (Ch. 9), and
**space** plays/stops, all guarded to no-op while a text/number input has
focus.

Every piece of it reuses already-tested core modules — no new `src/core`
code was needed. **Rhythm** picks 2 generators (any of the 19 canonical
cases, Ch. 2A Figure 19) or 3 (`THREE_GENERATOR_CASES`, Ch. 6). **Extend the
motif** swaps in Fractioned/Expansion/Contraction/Balance via the same
`buildResultantForTechnique` dispatcher the main generator uses — Expansion
is literally "append the fractioned form," Contraction "prepend" it, Balance
"combine" them, plus a plain repeat count. **Motif length** is a sliding
`{start, length}` window over the resultant's segments — the same mechanic
as the main generator's "Loop a range" control, generalized here into the
primary length control, with an added "by beats" mode that grows the window
to the smallest number of events reaching a target beat count. **Voices**
distributes the motif's attacks across 1-4 voices via Ch. 7's pli/pla
mechanic (`synchronizeInstrumentalGroup`/`assignPlaces`/
`segmentsFromAttackTimes`) — each voice is either a percussion sound
(`PERCUSSION_VOICE_OPTIONS`) or a melodic role (Lead/Pad/Pluck, mapped to an
oscillator type, cycling through the chosen **Scale**'s degrees). MIDI
export is deliberately minimal for now — one plain multi-track download, no
per-voice overrides dialog, no GM instrument/program-change support — kept
that way on purpose to prioritize the interaction design first.

**The preview itself is `src/components/MidiPreview.tsx`** — a standalone,
reusable D-pad wrapper around `SchillingerPianoRoll` (purely presentational,
same as the roll itself: it takes already-computed lanes and navigation
callbacks, owns no state). Left/right arrows shift which adjacent part of
the underlying sequence is windowed (the same "Motif length" window
described above); up/down arrows cycle through that window's own circular
permutations (Ch. 9). It isn't specific to Motif Explorer — any page that
can hand it a `Resultant`-shaped window and a couple of navigation callbacks
can reuse it.

**"Extend the motif" has two independent modes.** Technique (Ch. 4-5,
described above) grows the cycle from the actual resultant math. **Higher-
order growth (Ch. 10)** is a second, unrelated way to lengthen the same
cycle: the 2 (or 3) generator values themselves become `higherOrderElements`'s
seeds — exactly the book's own Figure 120 example, just using the active
case's own numbers instead of an arbitrary `a`/`b` — grown to a chosen order
(capped 1-6, matching `HigherOrderPermutationsPanel`'s own established cap)
and concatenated into one long cycle. At order 4 with a 3:2 case this
reproduces the book's classic `abbabaab`+`baababba` shape exactly, just
spelled in durations (`3,2` in place of `a,b`) instead of letters; the same
concatenation generalizes cleanly to 3 seeds for three-generator mode,
verified by hand. The two modes are mutually exclusive by design (the
book presents them as distinct variation mechanisms, not composable) — the
"Motif length" window and rotation browsing below work identically on top
of either one's output.

## The theory, briefly

Schillinger's Book I builds rhythm from **interference of periodicities**:
two or more "generators" each fire a fixed number of evenly-spaced attacks
around a shared cycle. Superimposing those attack points produces a
**resultant** — an uneven rhythm whose durations are the gaps between
attacks. Where more than one generator fires at once is a natural accent
("coincidence point"). The resultant picker is limited to Schillinger's own **19 canonical cases of
binary synchronization** (every coprime generator pair up to 9:2 .. 9:8) —
the same restriction as his Chapter 2A. All 19 are checked in
`tests/resultant.test.mjs` against the published durations, transcribed from
`~/Desktop/schillinger-midi-artifacts/Resultants_Numbers.txt`.

Chapter 3 (**Grouping**) recognizes that the same resultant can be barred
several ways: as one bar covering the whole cycle, or as several bars sized
to the major or minor generator. `computeGroupings(a, b)` reports all three
as bar counts; the UI turns them into time signatures using whatever note
value the "unit note value" control says one rhythm unit is worth (an
eighth-note triplet unit has no clean single-number denominator, so that
case is called out instead of faked).

Chapter 4 (**Fractioning**) expands a resultant into finer values by
nesting the minor generator's own pulse inside the major generator's grid:
on a grid of a² units, generator *a* fires its normal pulse while generator
*b* fires (a − b + 1) staggered copies of its own pulse, each spanning a·b
units and starting a units later than the last. The union of all of those
attack points is the fractioned resultant — reverse-engineered from an
earlier, unfinished prototype, then confirmed directly against the actual
book (`schillinger-midi-artifacts/Schillinger System of Musical
Composition_text.pdf`, an OCR'd scan): the a−b+1 formula and the worked 3:2
example (r = 2/9+1/9+1/9+1/9+1/9+1/9+2/9) match verbatim. Checked against
all 19 published fractioned resultants (`tests/fractioning.test.mjs`); four
of those published values (7:3, 7:6, 8:5, 9:8) didn't sum to a² and broke
the time-reversal symmetry every other case has — transcription slips in
the 2017 notes (the book itself only works through 3:2 and 4:3 as teaching
examples and leaves the rest as a reader exercise, so there was no printed
table to check the other 16 against directly; the corrected values are
verified by checksum and symmetry instead).

Grouping (Ch. 3) also applies to a fractioned resultant (Figures 27-31 of
the book), but "by b" generally doesn't land on whole bars — a² isn't a
multiple of b — so it needs a quotient/remainder rule instead:
`computeFractionedGroupings(a, b)` in `fractioning.ts` reports the bars, the
leftover remainder, and how many times the resultant has to repeat before
it and the bar lines close together. Verified against both of the book's
own worked examples (3:2 → 9/2 = 4½ bars, repeats twice; 4:3 → 16/3 = 5⅓
bars, repeats three times). The Grouping section in the UI switches to
this fractioned version automatically when "Apply fractioning" is on.

Chapter 5 (**Composition of Groups by Pairs**) pairs the plain resultant
with its fractioned expansion. The chapter's own definition is literal:
"moving from a long to a short group is contraction; the opposite is
expansion." **Expansion** states the plain resultant then the fractioned
one (short → long); **Contraction** is the same two pieces in reverse
(long → short). **Balance** states the fractioned resultant, then the
plain resultant repeated `m = floor(a/b)` times, then one sustained note
of duration `a² − m·a·b` — always totaling exactly `2a²`, matching the
chapter's framing of "stating the theme twice... the second time brought
to a completion." All three are confirmed digit-for-digit against the
book's own worked examples (Figures 38-46, covering 3:2, 4:3, and the
extended 5:2 case for Balance) in `tests/groupsByPairs.test.mjs`. The book
states "grouping for such pairs is through a only" — one clean bar count
of `a` units, always exact, unlike Chapter 4's "by b" grouping.

Chapter 6 (**Utilization of Three or More Generators**) extends binary
synchronization past two generators by drawing three at once from one of
Schillinger's "series of growth" — summation series (Fibonacci-style: each
value after the first two is the sum of the two before it) that "all
generators pertaining to one family of rhythm belong to." Synchronizing
2:3:5 (the book's own worked example) gives a common product of 30 and
complementary factors 15, 10, 6 — the book states "generators produce r,
and the complementary factors produce r'," so the **theme** (r) is the
resultant of the three generators themselves and the **countertheme** (r')
is the resultant of their complementary factors, both sharing the common
product as their cycle length so they loop together. Both sequences are
confirmed against the book's own numbers (theme `6 4 2 3 3 2 4 6`,
countertheme's 22-term sequence) in `tests/threeGenerators.test.mjs`. One
honest flag: the worked example's own figure, at the scan quality
available, appears to attach its two duration formulas to r/r' the
opposite way from that prose sentence — both duration sequences are
independently re-derivable from first principles and check out either way,
so only the *label* is uncertain; the prose is what this app follows. See
the docstring in `src/core/threeGenerators.ts` for the full account.

Chapter 7 (**Resultants Applied to Instrumental Forms**) synchronizes a
rhythmic resultant's own attack count against a fixed "instrumental group"
— a set of drums, a melodic motif, or one of the book's own named
accompaniment figures (the 2-attack polka: bass, chord; the 4-attack
fox-trot: bass, chord, bass, chord; the 6-attack rhumba: three bass/chord
pairs) — cycled one place per attack. Since the two counts are usually not
equal, the pairing doesn't realign until their least common multiple: the
resultant repeats `placeCount / gcd` times while the instrumental group
repeats `attackCount / gcd` times, exactly the same gcd/LCM reduction Ch.
2A already uses for binary synchronization, just applied to (attack count,
place count) instead of (generator a, generator b). Confirmed against both
of the book's own worked examples (4 attacks vs. 2 places → resultant×1,
instrument×2; 7 attacks vs. 2 places → resultant×2, instrument×7) in
`tests/instrumentalInterference.test.mjs`.

Chapter 8 (**Coordination of Time Structures**) chains that same gcd/LCM
reduction three levels deep: an instrumental group (`pli` places) against
an attack-group (`pla` places) produces a reduced place count; that
attack-group's own attack count (`aa`) against a duration-group's attack
count (`aT`) produces a synchronized attack total and a scaled duration
(`T'`); and `T'` against a chosen final duration (`T''`, e.g. a bar length)
produces the number of repeats needed to close evenly. The book's own full
worked example (`pli=4, pla=3, aa=8, aT=6, T=10t, T''=8t`) lands on a
genuinely fractional intermediate result — `T'=160/3t`, then `T'/T''=20/3`
— resolved by scaling the *entire* chain by the leftover denominator (3)
to clear it into a whole number of repeats (20). `coordinateTimeStructures`
carries exact fractions (plain `{numerator, denominator}` pairs, gcd-reduced
at each step) rather than floating point, and reproduces every one of the
book's own intermediate numbers exactly — `32`, `16/3`, `160/3`, `20/3 → 20`
— confirmed in `tests/timeStructureCoordination.test.mjs`.

Chapter 9 (**Homogeneous Simultaneity and Continuity — Variations**) treats
every reordering of a duration-group's own values as a "variation" of it.
**General permutations** are every distinct reordering — n!, or fewer when
values repeat (a trinomial like 2+1+1 produces only 3 distinct orderings,
not 3!=6; a quadrinomial with two identical pairs like 2+1+1+2 produces
4!/(2!2!)=6, not 4!=24 — both confirmed against the book's own listed rows
exactly). **Circular permutations** are always exactly n — the group's own
n rotations, regardless of repeats. The book applies this same combinatorics
to several different musical parameters in turn (durations, rests, accents,
split-unit groups, whole named sub-groups — Figures 76-105), but the
underlying primitive is identical every time, so `generalPermutations` and
`circularPermutations` (`src/core/permutations.ts`) implement just that one
primitive rather than every presentational variant. Confirmed against seven
of the book's own tables in `tests/permutations.test.mjs`, plus a general
check that the count always matches the standard multiset-permutation
formula `n! / ∏(repeated-value factorials)`.

Chapter 10 (**Generalization of Variation Techniques**) grows two seed
elements through successive "orders": Figure 120's own formula states
`a2 = a1+b1`, `b2 = b1+a1`, then `a3 = a2+b2`, `b3 = b2+a2`, and so on —
each order concatenates the *previous* order's own (already-grown) a and b,
so the pair keeps exactly 2 simultaneous voices forever while their length
doubles every order. `higherOrderElements` (`src/core/higherOrderPermutations.ts`)
generalizes this to any number of seeds — element *i* at order *k* is the
concatenation of element *i* and element *(i+1 mod n)* from order *k-1* —
and reproduces the book's own exact numbers for two seeds `[2],[1]` at
every order in `tests/higherOrderPermutations.test.mjs` (`a3=[2,1,1,2]`,
`b3=[1,2,2,1]`, `a4=[2,1,1,2,1,2,2,1]`, ...). One honest flag: the book's
own prose separately claims the *element count* itself grows ("3 elements
→ 9 on the second order, 27 on the third... through circular
permutations"), which doesn't square with Figure 120's own formula (which
keeps the count fixed, only the length grows) or even with itself (9 fits
"square of 3," but 27 doesn't fit "square of 9"=81) — this implementation
follows the formula, which is unambiguous and directly verifiable, over
the prose claim, which isn't internally consistent.

Chapter 11 (**Composition of Homogeneous Rhythmic Continuity**) splits a
rhythmic group into n equal pieces (its simplest divisor, or its
individual segments) and grows n *parts* from them: part *p* is every
circular rotation of the pieces concatenated in turn, starting at rotation
*p* and wrapping around — a canon where every part eventually states every
rotation, each one entering a rotation later than the last. The book's own
Figure 124 (p. 67, 4 pieces `a1,b1,c1,d1`) spells out all 4 parts in full —
part 0 reads `a,b,c,d,b,c,d,a,c,d,a,b,d,a,b,c` and part 1 reads
`b,c,d,a,c,d,a,b,d,a,b,c,a,b,c,d` (rotations 0,1,2,3 vs. 1,2,3,0) — both
reproduced exactly by `homogeneousContinuityParts`
(`src/core/homogeneousContinuity.ts`), which reuses Ch. 9's
`circularPermutations` unchanged via an index-permutation trick (permute
`[0..n-1]`, then map each row back to the actual pieces) rather than
duplicating any combinatorial logic. Also confirmed against the book's
smaller 2-piece example ("8-bar, 2-part continuity," p. 66) in
`tests/homogeneousContinuity.test.mjs`.

Chapter 12 (**Distributive Powers**, Section B: "Composition of Rhythmic
Counterthemes") keeps every product term separate rather than collapsing
like terms the way an algebraic power would — the book's own footnote:
"the algebraic square of a+b is a²+2ab+b². But the distributive square
would be a²+ab+ab+b²." For an actual duration-group this is a genuine
numeric multiplication table flattened into a sequence: `(2+1)² = 4+2+2+1`
and `(2+1)³ = 8+4+4+2+4+2+2+1` (p. 75, 77), both reproduced exactly by
`distributivePower` (`src/core/distributivePowers.ts`), which always has
`terms.length ** power` entries summing to `sum(terms) ** power`. The book
pairs the original terms (the "theme") with this distributive power (the
"countertheme") via an explicit synchronization rule — multiply the
lower-power group by `sum(terms) ** (toPower - fromPower)` — confirmed
against two more of the book's own worked numbers: `9·(2+1) = 18+9 = 27`
(synchronizing the first power with the cube) and `3·(4+2+2+1) = 12+6+6+3
= 27` (synchronizing the square with the cube), both in
`tests/distributivePowers.test.mjs`. Because both sides are built from the
same synchronization rule, they always total the same duration and play
in sync, exactly like Ch. 6's theme/countertheme.

Chapter 13 (**Evolution of Rhythm Styles**) is mostly historical/cultural
commentary — which world musical traditions favor which "determinant"
series, an analysis of "swing" — deliberately left unimplemented. Two
crisp formulas survive that commentary: the **interference-group size
sequence** `i_n = 2·i_(n-1) − 1` (the book's own five terms: 2, 3, 5, 9,
17), and **tracing a binomial's origin** back to the two-generator
resultant it came from — "take the greater number-value of the binomial
and assign it as a minor generator (b); the sum of the binomial is the
major generator [a]." The book's own example (a `5+3` fragment traces to
`r(8:5)`) is reproduced exactly by `traceOrigin` — and verified as a
*general* fact, not just that one case: for any coprime `x,y`, feeding
`traceOrigin(x,y)`'s `{a,b}` straight into the existing `generateResultant`
always reproduces `(x,y)` as the resultant's own first two segments,
confirmed in `tests/rhythmStyleEvolution.test.mjs` across six different
binomials.

Chapter 14 (**Rhythms of Variable Velocities**) is Book I's last chapter.
Section D (Fermata) is left to notational judgment in the book rather than
a fixed formula, so isn't implemented; the rest is crisp. **Section B**
(acceleration in non-uniform groups) repeats a duration-group, scaling
each repetition by the next term of a named series — the book's own
example, `(3+1+2)` scaled by the natural harmonic series `1, 2, 3`, gives
`(3+1+2)+(6+2+4)+(9+3+6)`, reproduced exactly by `accelerateGroup`.
**Section C** (Rubato) shifts a "unit of deviation" (τ) from one term of a
binomial to the other — unbalancing Chopin's `(2,2)` by τ=1 gives `(3,1)`;
balancing a swung `(3,1)` by τ=−1 gives back `(2,2)` — both the same
`shiftBalance` operation, confirmed in `tests/variableVelocity.test.mjs`
along with a cross-check that the book's own "Summation Series" list
(Section A) matches Ch. 6's `GROWTH_SERIES` values exactly.

**Book I (Theory of Rhythm) is now covered chapter by chapter, Ch. 1
through Ch. 14** — every chapter either has its own dedicated panel or is
folded into "The theory, briefly" above with its unimplemented parts
explicitly flagged rather than silently skipped.

Book II builds symmetric pitch scales the same way Book I builds
rhythms — dividing the octave into equal (or as-equal-as-possible) parts.
Dividing by 3, 4, or 6 reproduces the augmented, diminished, and whole-tone
scales exactly; other divisors spread the remainder evenly across the
octave using the same math as the rhythm side.

Book II Chapter 3 (**Evolution of Pitch-Scale Styles**) makes that
rhythm/pitch kinship completely literal: "PITCH-SCALES, like time-scales
(rhythms), are subject to serial development." **Section A** splits a
two-unit scale's interval into a binomial (a,b) and synchronizes it with
its own reverse (b,a) — unioning both orderings' attack points, exactly
Book I's interference-of-periodicities operation (Ch. 2A), just applied to
pitch intervals — producing a resultant trinomial (`5=3+2` synchronized
with `2+3` gives `2+1+2`, matching the book exactly); every permutation of
that resultant is "one family," which is just Ch. 9's `generalPermutations`
applied directly, no new code needed. **Section B**'s "displacement
scales" (d0, d1, d2, ...) are Ch. 9's `circularPermutations` applied to a
scale's own interval sequence — confirmed against the book's own
`c-d-e-g-a` example. **Sections C/D** slide a window across the interval
sequence, either summing it in place (C) or just selecting it (D) — both
confirmed against the book's own 6-interval worked example digit-for-digit
in `tests/pitchScaleEvolution.test.mjs`. Section E (historical commentary)
has no formula and isn't implemented.

## What's portable

- `src/core/resultant.ts` — the interference-of-periodicities engine:
  `generateResultant(generatorValues)` and the standalone `generatorPulse`
  helper for rendering true polyrhythm, plus the 19 canonical
  `BINARY_SYNCHRONIZATION_CASES`. Zero dependencies.
- `src/core/grouping.ts` — `computeGroupings(a, b)` (Ch. 3): the three bar
  layouts a resultant can be read in. Zero dependencies.
- `src/core/fractioning.ts` — `generateFractionedResultant(a, b)` (Ch. 4):
  expands a resultant into finer nested values. Returns the same `Resultant`
  shape as `generateResultant`, so it drops straight into `buildMelody`. Also
  `computeFractionedGroupings(a, b)`: grouping math for the fractioned grid,
  including the quotient/remainder rule for "by b". Zero dependencies.
- `src/core/groupsByPairs.ts` — `buildExpansion`, `buildContraction`,
  `buildBalance` (Ch. 5): each composes the plain and fractioned resultants
  into a longer `Resultant`-shaped sequence, so they also drop straight
  into `buildMelody`. Plus `computePairGrouping`, the single "by a" bar
  count used for all three. Zero dependencies.
- `src/core/scales.ts` — `symmetricDivisionScale` (equal/near-equal octave
  division) and `intervalCellScale` (tiling a repeating interval cell across
  the octave), plus a small named-preset list. Zero dependencies.
- `src/core/melody.ts` — `buildMelody` walks a resultant against a scale
  using a melodic contour (ascending, descending, arch, outward-expanding
  wedge, or a plain scale loop); `applyStrata` adds parallel harmony voices
  at fixed interval offsets (Schillinger's "harmonization by strata").
- `src/core/midi.ts` — a minimal Standard MIDI File (format 1) writer with
  one track per voice, so polyrhythm and harmony voices play back
  simultaneously. A voice's channel is normally derived from its track
  position, but `NoteEvent.channel` can pin it to a fixed channel instead
  (percussion uses this for GM's channel 10). Zero dependencies — no MIDI
  library involved.
- `src/core/percussion.ts` — `segmentsForSource` (the attack pattern for
  any of C.D./Generator A/Generator B/Resultant/C.P.) and
  `buildPercussionVoices` (turns an assignment map into `NoteEvent`s on
  the GM drum channel). Zero dependencies beyond `resultant.ts`.
- `src/core/midiImport.ts` — the inverse: a minimal SMF *reader* (format
  0/1, running status, meta/sysex skipped), picking the track with the
  most notes for monophonic analysis. Zero dependencies.
- `src/core/quantize.ts` — `quantizeGaps(...)`: snaps raw MIDI tick gaps
  onto the coarsest standard grid (with triplets) that explains them
  within tolerance, reporting the chosen grid and how much timing
  deviation it absorbed. Zero dependencies.
- `src/core/timeSignature.ts` — `computeTimeSignatureOptions(...)`: every
  exact beats-per-bar reading of a cycle for the active technique.
- `src/core/rhythmAnalysis.ts` — `notesToRhythmPattern` (quantizes then
  reduces), `reduceToUnits`, `findPatternOccurrences` (cyclic match),
  `findMatchingCases` (searches all 19 plain resultants).
- `src/core/pitchClassification.ts` — `classifyScaleGroup` (all 4 groups,
  from actual MIDI note range plus symmetric-scale matching against
  `scales.ts`), `matchesSymmetricDivision`, and `twoUnitScaleLabel`
  (Book II Ch. 1-2).
- `src/core/threeGenerators.ts` — Ch. 6: `GROWTH_SERIES`,
  `THREE_GENERATOR_CASES`, `commonProduct`, `complementaryFactors`,
  `buildTheme`/`buildCountertheme` (each just `generateResultant` applied
  to the generators or their complementary factors), and
  `threeGeneratorGroupings`. Depends only on `resultant.ts`.
- `src/core/instrumentalInterference.ts` — Ch. 7: `synchronizeInstrumentalGroup`
  (gcd/LCM-based repeat counts), `assignPlaces` (round-robin place index per
  attack), `segmentsFromAttackTimes` (reduces a place's own attack times to
  `generatorPulse`-style `{duration}` segments), and `ACCOMPANIMENT_FIGURES`
  (the book's named polka/fox-trot/rhumba bass-chord figures). Zero
  dependencies.
- `src/core/timeStructureCoordination.ts` — Ch. 8: `synchronizeAttackWithDuration`
  (Section A), `repeatsToCloseFinalDuration` (Section B), and
  `coordinateTimeStructures` (Section C: the full three-stage chain, exact
  `Fraction` arithmetic throughout). Zero dependencies.
- `src/core/permutations.ts` — Ch. 9: `generalPermutations` (every distinct
  reordering of a duration-group's values) and `circularPermutations` (its
  n rotations). Zero dependencies.
- `src/core/higherOrderPermutations.ts` — Ch. 10: `higherOrderElements`
  (grows n seed elements through successive orders via circular
  concatenation, generalizing Figure 120's a/b formula). Zero dependencies.
- `src/core/homogeneousContinuity.ts` — Ch. 11: `chunkIntoPieces`,
  `divisorsOf`, and `homogeneousContinuityParts` (the canon-of-rotations
  construction, built on Ch. 9's `circularPermutations`). Depends only on
  `permutations.ts`.
- `src/core/distributivePowers.ts` — Ch. 12: `distributivePower` (the
  flattened multiplication-table expansion) and `synchronizeToPower` (the
  theme/countertheme scaling rule). Zero dependencies.
- `src/core/rhythmStyleEvolution.ts` — Ch. 13: `interferenceGroupSizes`
  and `traceOrigin` (recovers the `{a,b}` generator pair behind a short
  2-attack fragment). Zero dependencies — pairs naturally with
  `resultant.ts`'s `generateResultant` but doesn't import it.
- `src/core/variableVelocity.ts` — Ch. 14: `accelerateGroup` (progressive
  scaling by a named series), `shiftBalance` (Rubato's τ-shift), plus
  `NATURAL_HARMONIC_SERIES`/`SUMMATION_SERIES`/`PRIME_NUMBER_SERIES`. Zero
  dependencies.
- `src/core/pitchScaleEvolution.ts` — Book II Ch. 3:
  `intervalInterferenceResultant` (Section A), `slidingWindowMerge`/
  `slidingWindowSelect` (Sections C/D), and `intervalsToMidiNotes`. Zero
  dependencies — Sections A/B lean on `permutations.ts`'s
  `generalPermutations`/`circularPermutations` directly from the UI layer
  rather than reimplementing them here.
- `src/core/sampleAnalysis.ts` — `notesToSignedSegments` (rest-aware
  decomposition), `findSmallestPeriod` (archetype auto-detection),
  `buildNoteEventsFromSignedSegments` (skips rests as true silence), and
  `restCombinations` (every way of choosing a fixed number of rest
  positions). Depends only on `quantize.ts` and `midiImport.ts`'s
  `ImportedNote` type.
- `src/components/SampleAnalysisPanel.tsx` — standalone top-level panel
  (upload → archetype → matching resultants → variations → preview),
  reusing `permutations.ts`, `rhythmAnalysis.ts`'s `findMatchingCases`, and
  `SchillingerPianoRoll` directly.
- `src/components/SchillingerGenerator.tsx` — the React component (generator
  inputs, scale/register/contour/harmony controls, Web Audio playback, MIDI
  download). Depends only on the core modules above and its co-located CSS
  file.
- `src/components/SchillingerPianoRoll.tsx` — a DAW-style multi-lane SVG
  preview: one lane per rhythmic voice (C.P. as a single sustained note,
  each generator's own pulse, the resultant with coincidence points
  highlighted), a bar-line ruler, and an optional playhead. Takes plain
  `{label, color, highlight, segments}` lanes, so it has no dependency on
  the core modules — any `Resultant`-shaped data can be turned into a lane.

Developed **desktop-first** — a 2-column grid at a 56rem max-width, unlike
`personal-site`'s mobile-first convention. Mobile support is deliberately
deferred to a later pass.

## Piano-roll preview

Under the Case/Technique controls, a DAW-style preview shows the actual
construction before you commit to downloading anything: **C.P.** as one
note spanning the whole cycle, **C.D.** (the finest grid — one block per
abstract unit), **Generator A**'s own pulse, **Generator B**'s (Plain
technique only — the other techniques' cycle lengths aren't generally
multiples of b), and the **Resultant** with coincidence points
highlighted in orange. These five lanes are the same five rows Figure 6
of the book draws (c.d., a, b, r, c.p.) — the "Percussion mapping" section
below turns them from a picture into an actual drum part.

`PianoRollSegment` also takes an optional `rest` flag (added for sample
analysis, below) — a rest segment renders hollow with a dashed outline and
the label "rest" instead of its duration, so silence reads as visually
distinct from a played note without needing a second visualization.

## Three or more generators

A separate panel (`ThreeGeneratorsPanel.tsx`, below the main generator)
covers Book I Ch. 6 independently, since it works from three generators at
once rather than the two the rest of the app is built around. Pick one of
the book's four "important and practical combinations" (2:3:5, 3:5:8,
3:4:7, 4:5:9), each drawn from one of the three growth series, and the
panel shows the **theme** and **countertheme** as two piano-roll lanes
sharing the common product as their cycle length, plus every bar grouping
available (by any generator or any complementary factor — six divisors for
three generators, same "group by any factor" rule Ch. 3 uses for two).
Playback and MIDI download work the same way as the main generator (theme
on one voice, countertheme on another, sine/triangle oscillators for
preview). See "The theory, briefly" above for the r/r' naming caveat.

## Resultants applied to instrumental forms

A third panel (`InstrumentalInterferencePanel.tsx`, rendered right after
the Ch. 6 panel) covers Ch. 7 — it takes the *active* resultant from the
main Case/Technique controls above it (not a separate case picker) and
cycles a fixed "instrumental group" one place per attack against it. Pick
either **Custom places** (2-6 generic places, one color-coded piano-roll
lane per place, useful for something like the book's own two-kettle-drum
example) or one of the book's three named **accompaniment figures** — the
2-attack polka (bass, chord), 4-attack fox-trot (bass, chord, bass, chord),
or 6-attack rhumba (three bass/chord pairs). Each lane shows that place's
own attacks reduced to `generatorPulse`-style segments (spanning until its
own next attack, wrapping around the full realigned cycle) — mechanically
identical to how a generator's own pulse lane already works elsewhere in
the app, just applied to an irregular (resultant-driven) attack sequence
instead of an even one. The readout states the exact repeat counts (e.g.
"4 resultant attacks against 2 places · resultant repeats 1× ·
instrumental group repeats 2×") straight from `synchronizeInstrumentalGroup`,
matching the book's own two worked examples exactly. Its own Playback
section exports the full realigned cycle as a multi-track MIDI file — one
track per place, bass/chord roles mapped to distinct pitches for the named
figures.

## Coordination of time structures

A fourth panel (`TimeStructureCoordinationPanel.tsx`, right after Ch. 7)
covers Ch. 8 as a plain numeric calculator — no piano roll or playback,
since its output is a set of repeat counts rather than a new playable
pattern. It also reads the *active* resultant for its `aT`/`T` inputs, and
lets you set the three remaining quantities the book's own chain needs:
instrumental places (`pli`), attack-group places (`pla`), attack-group
attacks (`aa`), and a final duration (`T''`, e.g. a bar length). The
readout walks through the book's own five numbered steps verbatim (pli
reduced against pla → A = aa·pli′ → A′ = A/aT → T′ = T·A′ → N(T″) = T′/T″),
stating each result as an exact fraction when it isn't a whole number, and
flags plainly when the whole system needs scaling to clear a fraction into
a final integer repeat count — reproducing the book's own worked example
(`pli=4, pla=3, aa=8`, against a resultant supplying `aT=6, T=10`, into
`T''=8`) exactly: steps `32 → 16/3 → 160/3 → 20/3`, then "scaling ×3 clears
the fraction: repeats 20 times."

## Permutations (rhythmic variation)

A fifth panel (`PermutationsPanel.tsx`, right after Ch. 8) covers Ch. 9 —
unlike Ch. 7/8, it's fully self-contained (no dependency on the active
resultant), since it works from any duration-group you type in directly.
Enter a comma-separated pattern (up to 6 values, e.g. the book's own `2,1,1`
trinomial) and pick **Circular** (always exactly n rotations) or **General**
(every distinct reordering — capped at 24 displayed rows, since an
all-distinct 5-element group already has 120). Each resulting row becomes
its own piano-roll lane and its own MIDI track, playing back together —
Schillinger's own "bi-coordinate" framing: a sequence of variations down
the page is *continuity*, stacking them as separate simultaneous parts is
*simultaneity*, and this panel shows both at once (rows = simultaneity,
each row's own sequence = continuity). Verified against the book's own
`2,1,1` (3 circular permutations) and `3,1,2` (6 general permutations, all
distinct) examples directly in the browser, matching `tests/permutations.test.mjs`.

## Higher-order variation

A sixth panel (`HigherOrderPermutationsPanel.tsx`, right after Ch. 9) covers
Ch. 10 — also fully self-contained. Enter two seed patterns (default `2`
and `1`, the book's own Figure 120 example) and an order (1-6); each seed
grows into an ever-longer variation of itself through the book's own
recursive formula, shown as 2 piano-roll lanes (labeled `a3`/`b3` etc. for
the chosen order) that double in length every order while staying at
exactly 2 simultaneous voices. Verified directly in the browser against the
book's own numbers at orders 3 and 4 (`a3=2,1,1,2` / `b3=1,2,2,1`, then
`a4=2,1,1,2,1,2,2,1` / `b4=1,2,2,1,2,1,1,2`), matching
`tests/higherOrderPermutations.test.mjs`.

## Homogeneous rhythmic continuity

A seventh panel (`HomogeneousContinuityPanel.tsx`, right after Ch. 10)
covers Ch. 11 — like Ch. 7/8, it reads the *active* resultant's own
segments rather than a separately-typed pattern. Pick a divisor of the
segment count (its "simplest divisor," or the segments themselves) and the
panel splits them into that many equal pieces, then renders one piano-roll
lane per resulting *part* — each part a canon-of-rotations of the pieces,
per `homogeneousContinuityParts` above. Verified directly in the browser
against the default 3:2 case's 4 segments: split into 2 pieces gave
`Part 1 = 2,1,1,2,1,2,2,1` / `Part 2 = 1,2,2,1,2,1,1,2`; split into 4
individual segments gave 4 parts of 16 units each, matching
`tests/homogeneousContinuity.test.mjs` and the book's own Figure 124.

## Distributive powers

An eighth panel (`DistributivePowersPanel.tsx`, right after Ch. 11) covers
Ch. 12 — fully self-contained, like Ch. 9/10. Enter terms (default `2,1`,
the book's own binomial example) and a power (2 and up, capped per input
size so the countertheme never exceeds 64 terms); the panel shows the
**Theme** (the terms scaled up via `synchronizeToPower`) and
**Countertheme** (the raw `distributivePower` expansion) as two piano-roll
lanes that always total the same duration by construction. Verified
directly in the browser against the book's own numbers at power 2
(`Theme=6,3` / `Countertheme=4,2,2,1`, both totaling 9) and power 3
(`Theme=18,9` / `Countertheme=8,4,4,2,4,2,2,1`, both totaling 27), matching
`tests/distributivePowers.test.mjs` exactly.

## Evolution of rhythm styles

A ninth panel (`RhythmStyleEvolutionPanel.tsx`, right after Ch. 12) covers
Ch. 13's two implementable formulas — fully self-contained. Enter any two
durations (default `5, 3`, the book's own example) and the panel traces
them back to the `{a, b}` generator pair via `traceOrigin`, then builds
and shows the *actual* resultant those generators produce — reusing the
core `generateResultant`/`generatorPulse` engine directly, with Generator
A/B pulse lanes alongside the Resultant lane, exactly like the main
generator's own piano roll. A small readout also lists the
interference-group size sequence (2, 3, 5, 9, 17, ...). Verified directly
in the browser against the book's own example: `5, 3` traces to `a=8,
b=5`, and `r(8:5)` really does open with segments `5, 3`, confirming the
round-trip live, not just in `tests/rhythmStyleEvolution.test.mjs`.

## Rhythms of variable velocities

A tenth and final book-chapter panel (`VariableVelocityPanel.tsx`, right
after Ch. 13) covers Ch. 14 — the last chapter of Book I — fully
self-contained, in two parts. **Acceleration**: a duration-group, a named
series (natural harmonic, one of the three summation series, or the
prime-number series), a repeat count, and a Decelerando/Accelerando toggle
(the latter just reverses the multiplier order); one piano-roll lane shows
the result, with its own Playback/Download. **Rubato**: two durations and
a τ (tau) value, shown as two small "Original"/"Shifted" lanes with no
playback (a calculator like Ch. 8, since it's a two-note comparison, not a
loopable pattern). Verified directly in the browser against the book's own
numbers: `(3,1,2)` scaled by `1,2,3` gave exactly `3,1,2,6,2,4,9,3,6`
(36 units total), and `(2,2)` shifted by τ=1 gave exactly `(3,1)` (both
totaling 4) — matching `tests/variableVelocity.test.mjs`.

## Evolution of pitch-scale styles

`PitchScaleEvolutionPanel.tsx`, appended inside the main generator right
after "Melody & harmony," covers Book II Ch. 3 — the first Book II chapter
beyond the pitch-scale-group/two-unit-scale material already in "Pitch
scale"/"Melody & harmony" above. Unlike the rhythm-side panels, results
here are shown as plain text (interval spellings + the MIDI notes they
produce) rather than forced into the time-based piano roll, since a pitch
interval isn't a duration — a shared "Preview" button per row loads that
row into one small playback control at the bottom (a plain ascending run).
Section A shows the interval-interference resultant and its full
permutation family; Section B shows the circular-permutation displacement
scales (d0, d1, ...); Sections C/D show every sliding-window
summation/selection. Verified directly in the browser against the book's
own numbers: interval 5 split 3+2 gave resultant `2+1+2` with family
`1+2+2`/`2+1+2`/`2+2+1`; the `2,2,3,2,3` displacement sequence's `d1` came
out as `2+3+2+3+2`, matching the book exactly.

Section A also *chains*, which was missed on first read: re-interfering
each stage's own resultant using its circular rotations (not every
general permutation) produces a longer resultant each time — binomial →
trinomial → quintinomial → 9-term, "the modified forms... fall into
synchronization" (p.114). `circularIntervalInterference` generalizes
`intervalInterferenceResultant` from exactly 2 terms to any N;
`intervalInterferenceChain` repeats it. Verified against the book's own
worked stages: interfering the trinomial `4,4,3` gives the quintinomial
`1,3,3,1,3` (matching the book's own listed row as a multiset); interfering
that again gives exactly 9 terms — not 11, which unioning *every* general
permutation instead of just the circular ones incorrectly produces. The
term-count growth (2→3→5→9→17...) is exactly Book I Ch.13's own
interference-group recurrence, `i_n = 2·i_(n-1) − 1`.

## Melodic modulation and variable pitch axes

`MelodicModulationPanel.tsx` (`src/core/melodicModulation.ts`), appended
right after pitch-scale evolution, covers Book II Ch. 4. Sections E
(chromatic alteration) and F (identical motifs) are compositional
guidance rather than formulas, so aren't implemented — the same scoping
call made for Book I's own judgment-call sections. Section A (Primary
Axis) is new: `findPrimaryAxis` finds the pitch-unit with the greatest
*total summed duration* in a melody, not merely the most frequent attack
(p. 125). Sections B and D need no new combinatorial math — they're
`circularPermutations` (Ch. 9) and `intervalsToMidiNotes` (Ch. 3)
composed for a new purpose: `modalRotationsAtTonic` transposes every
rotation of a scale's interval sequence to one *common* tonic instead of
letting each rotate onto its own root (Section B, p. 127); Section D
retransposes the scale's own (un-rotated) intervals onto each of its own
other degrees (p. 129). Verified directly against the book's own worked
examples: `c-d-e-g-a` (intervals `2,2,3,2,3`) transposed to tonic c gave
`d1 = c-d-f-g-bb`, `d2 = c-eb-f-ab-bb`, `d3 = c-d-f-g-a`, `d4 = c-eb-f-g-bb`,
all matching exactly; retransposing `2,2,3,2` to root d gave `d-e-f#-a-b`,
also exact.

Section C (Four Forms of Axis-Relations) was initially scoped out
entirely as compositional guidance — correct for its four qualitative
categories, but a closer re-read turned up two clean formulas hiding in
the worked U-U example (p.125-128): `axisRelationCount(N) = N²` for an
N-unit scale (5²=25, 7²=49, both stated directly), and permuting the N
*already-transposed* scales from Section B into a longer continuity via
`axialContinuityPermutations` — reusing the same general-permutations
machinery as Book I Ch. 9 (5!=120, "five elements produce 120
permutations," also stated directly). The panel's default arrangement
(`3,2,1,4,0`) matches the book's own Figure 20 example exactly. A nice
cross-chapter find alongside these: "330, the number of all five-unit
scales" is exactly `compositionCount(12, 5)` from Book II Ch. 7 (dividing
the 12-semitone octave into 5 ordered parts) = C(11,4) = 330 — built
later in this project than this chapter, never connected back until now.

## Scales in expansion

`ScalesInExpansionPanel.tsx` (`src/core/scalesInExpansion.ts`) covers
Book II Ch. 5. The first expansion (E1) of an N-unit scale walks its
units in a circle stepping by 2 positions each time; E_k steps by k+1.
When that step doesn't divide the scale evenly, the walk splits into
several passes — "the recurring unit is omitted," and the next pass
restarts from the smallest not-yet-visited unit (p. 132-133). There are
always N-1 expansions total, including the unchanged original (E0).
Sections B-D (translating melodies between expansions, modulation via
common tones or identical motifs) are workflow guidance built on this
one primitive, not additional formulas, so aren't implemented. Verified
against the book's own two worked examples, confirmed against the
rendered page image since the odd-count example's figure wasn't in the
OCR text layer: the 5-unit `c-d-e-f-g` gives E1 = `c-e-g-d-f`; the
6-unit `c-d-e-f-g-b` gives E1 = `c-e-g-d-f-b` (the second cycle
restarting at `d` once `c` recurs) — both exact.

## Symmetrical scales (third and fourth groups)

`SymmetricScalesPanel.tsx` (`src/core/symmetricScales.ts`) covers Book II
Ch. 7-8. The octave (Third Group, Ch. 7) or `tonicCount - 1` octaves
(Fourth Group, Ch. 8) splits into an evenly-spaced tonic system — 2, 3,
4, 6, or 12 tonics for the Third Group; 3, 4, 6, or 12 tonics for the
Fourth, each paired with a fixed octave range the book states directly
(2, 3, 5, 11 — always `tonicCount - 1`, giving an exact-integer semitone
gap in all four cases: 8, 9, 10, 11). A "sectional scale" fills the gap
between one tonic and the next with N positive-integer semitone steps —
the book's own Arabic "string of pearls" example tiles `(2,1,2,1)` across
a 2-tonic Third Group system's 6-semitone gap. Chapter 6 (Symmetric
Distribution of Pitch-Units) contributes no core module — it's entirely
historical/cultural commentary on tuning traditions, with no formula of
its own.

Section C's counting table (p.152-153) — badly garbled by OCR (exponents
rendered as stray digits, e.g. "62 equals 36") — decodes exactly against
two general combinatorial identities, confirmed against all 20 tabulated
numbers across all 5 Third Group tonic systems: the number of distinct
N-unit sectional scales for a gap `g` is `C(g-1, N-1)` (a composition
count), and the number of melodic forms from independently permuting an
N-unit sectional scale across `t` tonics is `(N!)^t`. Both identities are
general enough that they apply unchanged to the Fourth Group's wider
gaps too — verified live: the default Third Group view (2 tonics, 4
units) shows exactly 10 compositions and 576 melodic forms; switching to
the Fourth Group's 3-tonic (2-octave) system with 4 units shows 35
compositions and 13,824 melodic forms, both matching hand-derivation
exactly.

## Book II, Chapters 6 and 9 (no core module)

Two Book II chapters contribute no code, for different reasons. Chapter 6
(Symmetric Distribution of Pitch-Units) is entirely historical/cultural
commentary on tuning traditions — Javanese and Siamese systems, why 12
became the standard division of the octave, its influence on Bach through
Debussy — with no deterministic formula of its own; it's the frame Ch. 7
formalizes. Chapter 9 (Melody-Harmony Relationship in Symmetric Systems)
was read in full, including rendering its central table (Figure 55, book
p. 173) as a page image once the OCR text proved too garbled to trust.
That table turned out to be a **notation catalog**, not a formula with a
checkable numeric output like every other chapter built here: it
enumerates every way an `a`-tonic window (melody) can pair against a
`b`-tonic window (harmony) around a tonic cycle — the same
cyclic-sliding-window idea as `slidingWindowMerge`/`slidingWindowSelect`
(Ch. 3), just relabeled for tonics instead of intervals, with no worked
example to verify against. The rest of the chapter (building harmonic
groups via tonal expansion of a sectional scale, voice-leading by
nearest tone, a tension framework tied to specific composers' eras) is
compositional workflow built on primitives this project already
implements (`tonalExpansion`, Ch. 5), not additional math. This closes
out Book II end to end: Ch. 1-2 (pre-existing), Ch. 3-5 and Ch. 7-8 have
their own panels above; Ch. 6 and Ch. 9 are pure prose.

## Geometrical inversions and expansions (Book III)

`GeometricalInversionsPanel.tsx` (`src/core/geometricalInversions.ts` +
`src/core/geometricalExpansions.ts`) covers all of Book III (Variations
of Music by Means of Geometrical Projection) — just 2 chapters, much
shorter than Books I-II. A melody graphed as pitch vs. time has four
"geometrical positions" (Ch. 1, p.185-186): (a) the original; (b) "the
same thing backwards" — retrograde, time-reversed with pitches unchanged;
(c) backwards *and* upside-down — retrograde inversion; (d) forwards and
upside-down — inversion only. Pitch inversion reflects each note around a
chosen axis: `invertedPitch = 2·axis − pitch`, confirmed against the
book's own worked example (p.199): axis g (67), a theme note d an octave
up (74, seven semitones above the axis) inverts to c (60, seven semitones
below). Retrograde preserves each note's own duration while mirroring its
position in time, so rests stay the same width, just reflected.

Geometrical expansion (Ch. 2, p.208-214) stretches the pitch and/or time
axes by a coefficient *before* a position is chosen — distinct from Book
II Ch. 5's *tonal* expansion, which rearranges a scale's own pitch-units
without altering them. `expandedPitch = axis + (pitch − axis) ×
coefficient`; a coefficient under 1 contracts rather than expands, so one
formula covers both, matching how the book frames contraction as the
reciprocal case. Confirmed against the book's own footnote example
(p.208): expanding `c-d-e-f-g` by a coefficient of 2 gives `c-e-g#-a#-d`
exactly. Time expands independently the same way (`pt, 2t, 3t`), scaling
both a note's start position and its own duration. "All geometrical
expansions are subject to geometrical inversions as well" (p.220), so the
panel composes both directly — this is also the first panel in this
project needing genuinely non-uniform timed playback for a melody typed
in directly, rather than the synthetic uniform-duration playback used by
every Book II pitch-scale panel. A nice cross-book check: inverting the
whole-tone scale (Book II Ch. 1-2's `symmetricDivisionScale(6)`) around
its own root reproduces its own identical pitch-class set — confirming
the book's own claim (p.199) that some scales have "an axis of symmetry."
Sections on inverting/expanding harmony (each chord voice treated as its
own melody), rhythm cleanup at position boundaries, range-readjustment,
and coefficients-of-recurrence sequencing are compositional workflow
built on these primitives, not additional formulas, so aren't implemented
separately. This closes out Book III end to end.

## The axes of melody (Book IV)

`MelodicAxesPanel.tsx` (`src/core/melodicAxes.ts`) opens Book IV (Theory
of Melody) at Chapter 3 — Chapters 1-2 are pure philosophy/semantics and
notational conventions with no formula of their own. Section A's Primary
Axis ("a pitch-time maximum," p.246) is exactly Book II Ch.4's
`findPrimaryAxis`, reused directly. Section C defines five directional
axes relative to that primary axis (p.252-253): `0` stays at it; `a`
ascends away from it; `d` descends away from it; `b` and `c` always
return fully to it, from above and below respectively — the same a/b/c/d
vocabulary as Book III Ch.1's geometrical positions, reused here to
classify melodic *direction*. `buildAxialMelody` turns a sequence of
these terms into an actual melody, reverse-engineered from Figures 16 and
19 (p.262-263), which needed rendering and zooming into as page images
since the OCR text layer didn't capture them at all: `a`/`d` start at the
axis and move away using their own duration as the climb (by default,
though Section H's more general notation, p.275, allows an independent
pitch distance); `b`/`c` always travel *all the way* back to the axis —
confirmed by comparing "a2T+bT," "a3T+bT," and "a5T+b2T," where the
return always lands exactly on the axis regardless of how far the climb
went, using only whatever time is given. A reset between two `a`/`d`/`0`
terms (when the melody isn't already at the axis) is instantaneous,
matching how the figures don't spend any extra grid-width on it. Section
D's massive worked enumeration of axial combinations (monomial through
quintinomial, p.253-258) turns out to be nothing more than
`generalPermutations` (Book I Ch.9) applied to the 5-symbol alphabet —
verified directly against several of the book's own stated counts (e.g.
a 3-term pattern with one repeated pair has exactly 3 permutations,
matching the book's own "3 permutations each"). Verified live: the
default sequence `a2,b1,a3,b1` from axis c4 produces exactly
`c#4-d4-c4-c#4-d4-d#4-c4`, matching hand-derivation note for note.

## Book IV, Chapter 4 (no core module)

Chapter 4 ("Melody: Climax and Resistance") contributes no code, checked
with the same grep-for-numeric-claims rigor as everywhere else — no
hidden formula turned up. It's a psychological/aesthetic framework: a
climax is defined as "a pt (pitch-time) maximum with respect to the
primary axis" (p.279), a circle of eight named psychological categories
(abnormal → normal → supernormal → ..., 45° apart) maps trajectory shape
to listener reaction, and a catalog of "forms of resistance" (repetition,
a backswing-like contrary motion before a leap, trills/mordents, and
"variable amplitude" — simultaneous centrifugal/centripetal combinations
of two or three secondary axes) builds tension toward a climax or release
toward balance. The "variable amplitude" forms reuse the exact a/b/c/d
vocabulary from Ch. 3 unchanged, just layered as simultaneous voices
instead of one sequential melody. Section B's climax-distribution
guidance ("use a decreasing time-ratio... material from the summation or
power series") is a compositional direction pointing at already-built
Book I generators (`SUMMATION_SERIES`, `GROWTH_SERIES`,
`distributivePower`), not a new formula with a checkable numeric output.

## Composition of melodic continuity (Book IV, Ch. 5-6)

`MelodicContinuityPanel.tsx` (`src/core/melodicContinuity.ts`) covers
Book IV Ch. 5-6. Chapter 6 opens with an 8-item list of ways an
axis-built melody (Ch. 3) can be varied — permuting the axes' own order,
geometrically inverting the whole melody or individual segments, tonally
expanding the whole melody or individual segments with *different*
coefficients per segment, and any combination of these (p.313). Every
item turns out to be a thin composition of primitives already built and
tested elsewhere: permuting segment order reuses `generalPermutationsOf`
(the same tool as Book II Ch. 4's own fix); per-segment geometrical
inversion reuses Book III Ch. 1's `geometricalPosition`; per-segment
tonal expansion reuses Book III Ch. 2's `expandPitch`.
`buildMelodicContinuity` composes all three per segment, then
concatenates the results in time. The one genuinely new formula, found by
rendering the actual page (the OCR text mangled it into noise): "each of
the individual axes has four geometrical inversions... the number of
combinations of the three axes... equals 4³ = 64" (p.313) —
`axisInversionCombinationCount(N) = 4^N`, confirmed exactly. The book's
own further claim ("if any axis appears in three forms of tonal
expansion, the entire quantity will be 64³ = 262,144") isn't
implemented — the derivation of cubing 64 again for expansion wasn't
reconstructable from the surrounding text with confidence, unlike the
first (verified) formula. Chapter 5's own worked example (p.299, also
page-image verified) composes a segment's internal rhythm by citing
already-built Book I machinery directly by name ("r4÷3, or (2+1+1)²... the
permutations or the resultants" — Book I's resultants and Ch. 12's
`distributivePower`), not a new formula. Section B's sin/cos "forms of
trajectorial motion" and the "ascribed vs. inscribed" sine/cosine phase
choice are vocabulary frameworks without a checkable numeric output, the
same category as Chapter 4. Verified live: the default 4-segment sequence
(`a2/a,b1/d*2,a3/a,b1/c`) from axis c4 produces exactly
`c#4-d4-c4-c#4-d4-d#4-c4`, matching hand-derivation note for note, with
`256` combinations (4⁴) and `24` orderings (4!) both exact.

## Book IV, Chapter 7 (no core module)

Chapter 7 ("Additional Melodic Techniques") contributes no code — checked
with the same grep, no hidden formula. Section A describes how a
symmetric scale's multiple tonics (Book II Ch. 7-8) share overlapping
secondary axes with their neighbors (the b-axis of one tonic's group is
the c-axis of the tonic above it, and so on), and works through a full
melody plotted with all three Book II Ch. 4 modulation techniques
(common tones, chromatic alterations, identical motifs) at once. Section
B ("Technique of Plotting Modulations") is a step-by-step notation
procedure for a human composer, not an algorithm. Both sections are
narrative applications of primitives already built elsewhere, not new
formulas.

## Use of organic forms in melody (Book IV, Ch. 8 — Book IV complete)

`OrganicMelodyPanel.tsx` (`src/core/organicMelody.ts`) closes out Book IV.
The chapter's historical/geometric discussion of the Fibonacci/summation
series is already covered by `SUMMATION_SERIES` (Book I Ch. 14) —
confirmed the book's own three named series match exactly when extended
with the same recurrence: First (Fibonacci) to 11 terms gives
`1,2,3,5,8,13,21,34,55,89,144` (p.330, stated directly); Second gives
`1,3,4,7,11,18,29`; Third gives `1,4,5,9,14,23,37` (p.333). The chapter's
genuinely new content is three "spiral sequence" patterns for turning a
summation series into a signed-interval motif, each precisely described
in prose and confirmed against the book's own figure numbers (rendered
as a page image, since OCR mangled the formula notation into noise):
Basic (`t[i], t[i+1], -t[i+3]`, omitting `t[i+2]`) matches Figure 120/121
exactly — starting the First series at index 3 gives `5, 8, -21`, at
index 4 gives `8, 13, -34`, both exact; Developed adds one more summed
term before the flip (`t[i], t[i+1], t[i+2], -t[i+4]`); Extended adds two
(`t[i], t[i+1], t[i+2], -t[i+5]`). "Melody may start at different points
of one summation series" (p.340) — the panel shows four starting indices
per series/pattern combination. The chapter's closing list of nine
further "harmonic relations" (natural harmonic series, progressions,
logarithmic series, etc.) is a naming list, not new worked formulas —
several are already implemented (`NATURAL_HARMONIC_SERIES`,
`PRIME_NUMBER_SERIES`, Book I Ch. 14). Bilateral symmetry and
range-readjustment are compositional variations on the same three
patterns, not additional formulas, so aren't implemented separately.
Verified live: the confirmed book example (First series, index 3) plays
back as `c4-f4-c#5-e3`, matching hand-derivation exactly.

## Diatonic cycles and passing sixth-chords (Book V, Ch. 1-2, 8)

`DiatonicCyclesPanel.tsx` (`src/core/diatonicHarmony.ts`) opens Book V,
a genuinely new domain for this project — chord structures and
progressions, rather than single-voice melody/rhythm. Book V is far
larger than any prior book (24 chapters), so this covers its foundational
Chapter 1-2 machinery, which the rest of the book is expected to build
on. A root-position triad, S(5), stacks a scale's root, third, and fifth
(p.211) — this is the first panel in the project with genuine
simultaneous multi-voice playback, using the existing `NoteEvent.voice`
field (already proven by `applyStrata`'s parallel harmony). A "diatonic
cycle" steps the chord root by a constant scale-degree interval through
all 7 degrees of a 7-unit scale before repeating — confirmed against real
music theory before any code was written: the cycle of the fifth (step 4)
is exactly the circle of fifths, C-G-D-A-E-B-F; the cycle of the third
(step 2) gives C-E-G-B-D-F-A; the cycle of the seventh (step 6, i.e. -1)
is purely descending stepwise motion, matching the book's own description
of its "purely contrapuntal derivation" from leading-tone resolution
(p.363-369). A binomial progression concatenates two full cycles into 14
chords, matching the book's own stated count exactly. Chapter 1 also
gives a nice cross-book confirmation: "the total number of seven-unit
scales equals 462" is exactly `compositionCount(12, 7)` from Book II
Ch. 7 (p.206). Section B (historical cycle-style commentary — Bach,
Wagner, Palestrina) has no formula, so isn't implemented.

Sections C-D (Transformations of S(5); Voice-Leading, p.376-381) add
proper 4-part voice-leading: an S(5) triad has three "functions" — root,
third, fifth — plus a constant bass doubling the root, unaffected by
transformation. Clockwise voice-leading sends "the root of the first
chord... to the third of the next chord; the third... to the fifth...;
the fifth... to the root..." (p.379); counterclockwise is the mirror
(root→fifth→third→root). Each reassigned voice moves to the nearest
available octave of its new function (`nearestPitch`, a standard
minimal-movement voice-leading rule) — confirmed by hand before coding: a
C major triad (bass 48, root 60, third 64, fifth 67) voice-led clockwise
into the next chord of a cycle-of-thirds progression (E minor) gives
exactly `{bass 52, root 64, third 55, fifth 59}`, verified again live in
the browser. Building this surfaced a real bug (an unmemoized derived
array feeding the playback effect, the same class of issue as the
project's very first playback bug in Book I Ch. 9) — caught via the
project's standard AudioContext-instrumentation check, fixed by wrapping
the array in `useMemo`. Section E (a 4-category cycle/transformation
taxonomy) has no formula of its own — its two concrete-sounding sub-items
("24 variations of 4 elements" for voice redistribution, coefficients of
recurrence for transformation sequencing) both turn out to be reuses of
primitives already built elsewhere, the same `generalPermutations`
already confirmed for Book III Ch. 1's identical "24 permutations of 4
elements" passage.

Section F (The Negative Form, p.386-388): chords built *downward*
instead of upward. "In order to construct a negative S(5)... the next
pitch-unit downward becomes the negative third, and the next unit
downward from that becomes the negative fifth" — confirmed by hand
before coding: "if we start from c as -1, a is -3 and f is -5," and with
C=60 in the natural major scale, stepping down by thirds twice gives A
(57) then F (53), matching the book's own example exactly, verified
again live in the browser. `negativeStackedTriad` is the exact mirror of
`stackedTriad` (offsets 0,-2,-4 instead of 0,+2,+4). Negative-form
voice-leading isn't yet built, so the panel's voice-leading option is
only available for the positive form.

**Chapter 8, Section A (Groups with Passing Sixth-chords, p.415-416)**
jumped ahead of Ch. 3-7's own numbering since it builds directly on this
chapter's `Voicing`/`nearestPitch` machinery. "A group with a passing S(6)
is a pre-set combination of three chords: S(5) + S(6) + S(5)... it is
necessary to connect S(5) with the next S(5)... and add the intermediate
third of the first chord in the bass, *without moving the remaining
voices*" — a complete, unambiguous rule: `passingSixthChord` takes an
existing `Voicing` and moves only its bass to the nearest pitch sharing
the third's pitch class, leaving root/third/fifth untouched. Confirmed by
hand: a C major voicing (bass 48, root 60, third 64, fifth 67) produces a
passing bass of 52 (E3) — exactly a third above 48, matching the book's
own "3 in the bass under S(6) is a third above its preceding position"
(p.415). The classical form connects the outer chords by C-5, but "we
shall extend this principle to all cycles" (Section C generalizes to
G6(C3)/G6(C5)/G6(C7) and their negative-direction counterparts) — so
`buildPassingSixthGroups` is deliberately generic over *any* already-built
`voiceLeadProgression`, chaining `S(5)+S(6)+S(5)+S(6)+...` by inserting a
passing chord between every consecutive pair. In the panel, enabling
Voice-led reveals a "Passing sixth-chords" checkbox that does exactly
this. Not built: Section B's cadence-cycle framing and Section D's "16
forms of G6" combinatorics for Type II/III (a plain 4×4 product of
independent structure choices, confirmed by hand but not worth a
dedicated function) are compositional guidance rather than reusable
primitives.

## The symmetric system of harmony (Book V, Ch. 3)

`SymmetricHarmonyPanel.tsx` (`src/core/symmetricHarmony.ts`). Unlike
diatonic harmony (Ch. 2), symmetric chord structures are pre-selected
independent of any scale — "scale is the result... the consequence of
chords in motion" (p.388). Restricting a triad's two intervals to 3 or 4
semitones each gives exactly four structures, built directly from
semitones rather than scale degrees: S1=4+3 (major), S2=3+4 (minor),
S3=4+4 (augmented), S4=3+3 (diminished). All sharing one common root is
Section B's "symmetric zero cycle" (C0). Section A's own combinatorics
table (badly garbled by OCR, but every one of its 8 counts confirmed by
hand) turns out to be nothing more than `generalPermutations`/
`generalPermutationsOf` (Book I Ch. 9) applied to these 4 structure
labels — e.g. all 4 different gives 4!=24 forms, matching the book's own
number exactly, and every other repeat-pattern (one pair, two pairs,
3-same-1-different, and so on) checks out the same way. Another
cross-book confirmation: "the general number of three-unit scales from
one axis" (55) is exactly `compositionCount(12, 3)` from Book II Ch. 7.
Section B's full zero-cycle mechanic (coefficients of recurrence driving
position-cycling through Ch. 2's open/closed voicings) needs an
enumerable "positions" utility that Ch. 2's voice-leading work skipped
over (it only built chord-to-chord transformation) — a natural next step.

## Book V, Chapter 4 (no core module) and Chapter 5 Section A

Chapter 4 (Diatonic-Symmetric System of Harmony, Type II) contributes no
code — it's a worked example combining Ch. 2's diatonic root-motion
cycles with Ch. 3's pre-selected symmetric structures directly, no new
formula.

Chapter 5 (The Symmetric System of Harmony, Type III), Section A "Two
Tonics": the panel's "scale" mode adds `symmetricHarmonyScale`. Its own
tonic-count table ("root 2 represents two tonics, cube-root 2 represents
three...") is exactly Book II Ch. 7's own tonic systems, reused directly
via `symmetricTonics`. The genuinely new finding, decoded by rendering
the actual page since OCR mangled the formula notation into noise: "the
upper voice of harmony produces the scale... c-db-e-f#-g-a#" from a
2-tonic system using the major structure at each tonic turns out to be
exactly the *sorted union of pitch classes* across every tonic's own
triad — confirmed against both of the book's own worked examples (major
gives c-db-e-f#-g-a#/bb; minor gives c-db-eb-f#-g-a), and verified again
live in the browser, byte for byte. The exact root-motion cycle labels
connecting consecutive tonics aren't yet precisely modeled. Sections B-E
(Three/Four/Six/Twelve Tonics) need no new code — the same
`symmetricHarmonyScale` generalizes cleanly across every tonic count; the
book adds only qualitative recurrence-cycle properties there, no new
checkable formula.

## Variable doublings and inversions of S(5) (Book V, Ch. 6-7)

With the root always held in the bass, one of a chord's three functions
(root/third/fifth) can be additionally doubled among the upper three
voices — Schillinger's own comparative table (p.401): S(5)① keeps all
three functions distinct up top (`1,3,5`); S(5)③ doubles the third
instead, so the root disappears from the upper voices entirely (`3,3,5`);
S(5)⑤ doubles the fifth (`3,5,5`). "Only three positions are possible" for
③ and ⑤ — confirmed by rendering the actual page (p.401, Figure 57) since
the doubling notation didn't survive OCR — is exactly `generalPermutations`
(Ch. 9) applied to a 3-element multiset with one repeated pair (3!/2!=3);
S(5)① gets the full six, since its three functions are distinct, matching
the figure's own six-column layout. `src/core/variableDoublings.ts`:
`VARIABLE_DOUBLING_FORMS`, `doublingPositions`/`positionCount`, and
`buildDoublingVoicing`.

**Chapter 7 (Inversions of the S(5) Chord)** generalizes the same
machinery to S(6), the first inversion — "the only condition under which
S(5) becomes an S(6) is when the third (3) appears in the bass" (p.406).
The doubling notation carries over unchanged, but since the bass now
removes a "3" from the full 4-voice chord instead of a "1", the
position-count pairing *flips*: S(6)① and S(6)⑤ get only 3 positions each
("systematized through... the doubled function appears above / surrounds /
below the remaining function" — the same three orderings, just newly
named), while S(6)③ gets the full 6, matching the book's own six-column
layout for it (confirmed by rendering p.406-407 at high resolution — the
OCR badly mangled the circled-number notation here). The book's own claim
that "S(6)① is identical with S(5)① positions, except that the bass has
constant 3" checks out exactly: it's literally S(5)①'s own four pitches
(`{1,1,3,5}`) with a 3 moved into the bass instead of a 1.
`upperVoiceFunctions(doubledFunction, bassFunction)` captures this as one
general rule — "the full 4-function chord minus whatever sits in the
bass" — from which both `VARIABLE_DOUBLING_FORMS` (Ch. 6, bass=root) and
`INVERSION_DOUBLING_FORMS` (Ch. 7, bass=third) are derived.

**Honest scope limit**: both chapters' figures also draw *specific*
registral spacings for each position (including "black note"
unison-vs-octave variants and the clockwise/counterclockwise six-way
split itself) that didn't resolve unambiguously even at high render
resolution — not reproduced here. `buildDoublingVoicing` stacks each
position's functions upward from the bass in plain close position
instead, a reasonable but independent implementation choice, not a
transcription of either chapter's specific voicings. Each chapter's own
Figures 68-69 (the C3/C5/C7 transformation tables between doubling/
inversion forms) are likewise not built, for the same reason — worth
revisiting against cleaner scans. Ch. 7's Figures 77-78 (diatonic
doubling-preference tables keyed by scale degree) and its Section B
(continuity forms alternating S(5)/S(6), built from Book I's own growth
series) are compositional/stylistic guidance rather than deterministic
formulas, so they aren't built either — same treatment as every other
"compositional guidance" section scoped out project-wide.

## Percussion mapping

Each of those five structural components can be assigned to a General
MIDI percussion voice — kick, snare, rim, clap, closed/open hi-hat, ride,
crash, low/mid/high tom, cowbell (`src/core/percussion.ts`). An assignment
becomes its own track in the exported (and previewed) MIDI, pinned to
channel 10 — General MIDI's dedicated percussion channel — regardless of
how many other voices exist, via a `NoteEvent.channel` override the
writer respects per-track (`src/core/midi.ts`). Each hit is a short
staccato strike at the source's own attack points, not a held note — a
drum voice doesn't sustain the way a generator's pulse does.

Generator B is unavailable outside the Plain technique, same restriction
as its piano-roll lane and for the same reason (the longer composed
cycles aren't generally multiples of b). The other four — C.D., Generator
A, the Resultant, and C.P. — are always available, since a divides every
cycle length this app produces and c.d./resultant/c.p. are defined
directly from the cycle itself.

Assigning **Generator A → kick** and **Generator B → snare** (Plain
technique) is the most direct way to literally hear a binary-synchronization
case as the "N against M" polyrhythm it is — two independent, evenly-spaced
pulses, exactly as Ch. 2A describes them, before they're even superimposed
into the resultant.

## Time signatures

The same cycle reads as more than one valid time signature — 4:3 (c.p. 12)
is equally 12/8 (every unit its own beat), 4/4 (each beat = generator a's
own spacing, 3 units — so generator A lands exactly one note per beat),
or 3/4 (each beat = generator b's spacing, 4 units — generator B lands
one note per beat instead).
`computeTimeSignatureOptions` (`src/core/timeSignature.ts`) derives every
reading for the current technique — Plain gets all three "base" beat
sizes (1 unit, generator a, generator b); the other techniques only get
the raw view and the "by a" view, since their cycle lengths aren't
generally multiples of b.

Three curation rules, straight from how real notation is actually used:

- **Denominator 16 never appears** — an uncommon time signature
  denominator in practice. The raw/finest view is notated in eighths by
  convention instead (`12/8`, not `12/16`), independent of whatever "unit
  note value" is selected for playback.
- **Numerators are capped to 2-15** for denominators 4 and 8. A beat count
  that would exceed 15 — or simply has convenient factors, like 10 or 12 —
  is broken into multiple smaller bars instead: 12 beats becomes `3 × 4/4`
  or `4 × 3/4` rather than a single `12/4` bar, and every valid factor
  pair in range is offered (`5 : 2` in Balance offers `2 × 5/4`, matching
  the "10/4 becomes 2 measures of 5/4" convention directly).
- **Cut time (2/2)** is offered wherever a `4/4`-shaped reading exists —
  it's the exact same duration renotated with the beat doubled and the
  count halved.

Switching the **Time signature** control changes the piano roll's bar-line
ruler and its "bar.beat" labels live — `1.1 1.2 1.3 2.1 2.2 2.3 3.1 3.2
3.3` for a `3 × 3/4` reading, for instance, not just `1.1 1.2 1.3`.

## Sample analysis: rests included, plus variations

The main "Identify a rhythm" tool below measures durations start-to-start
between attacks — which means a quarter note followed by an eighth rest
and an eighth note reads the same as a dotted-quarter followed by an
eighth (both reduce to the onset-to-onset gaps `3, 1`), since gap
measurement can't distinguish a *sustained* note from a shorter note plus
silence. `SampleAnalysisPanel.tsx` (a standalone top-level panel, rendered
above the main generator) is built for exactly that distinction: it
decomposes an uploaded sample into a **signed** duration sequence — positive
units for a sounding note, negative units for the rest that follows it —
so that same quarter-eighth-eighth figure reads as `2, −1, 1`, not `3, 1`.
`notesToSignedSegments` (`src/core/sampleAnalysis.ts`) builds this by
quantizing each note's own duration *and* any gap to the next note-on
together on one shared grid (reusing `quantize.ts`'s grid-fitting
directly), rather than reducing to onset gaps the way `rhythmAnalysis.ts`
does for the simpler tool.

Real loops usually repeat a short figure many times over a longer clip, so
`findSmallestPeriod` auto-detects the shortest prefix that, repeated,
reproduces the whole imported sequence exactly — the natural "archetype"
length — with an editable override underneath. Verified against a real
1-bar bass loop (`Bass_Driving_01.mid`, 8 notes, 2 identical 2-beat
repeats): the full signed sequence decodes to `2,2,−1,1,2,2,2,−1,1,2`, and
`findSmallestPeriod` correctly detects the period as 5 (exactly the first
2 beats), all with 0% quantization error.

The archetype is then searched against all 19 canonical resultants using
only its **absolute** values (`findMatchingCases`, unchanged) — a
resultant has no rest concept of its own, so silence only matters for what
you hear and export, not for identifying which interference pattern
produced the rhythm. The sample above matches exactly three cases: 5:2,
7:2, and 9:2.

**Variations** cover both kinds the user asked for: *reordering* the
archetype's own segments (Circular = its rotations, General = every
distinct reordering — both reusing Ch. 9's `circularPermutations`/
`generalPermutations` completely unchanged, since a rest is just a
negative integer to that combinatorial code, not a special case — a
5-element archetype with three equal-magnitude notes and two singleton
rest/note values correctly yields exactly `5!/3!=20` general permutations,
confirmed live against the real sample), and *rest combinations*
(`restCombinations`, new) — holding every duration's position and
magnitude fixed and trying every way of choosing a chosen number of them
to be silent instead, i.e. literally "every combination of rests" at a
fixed rest count, defaulting to the archetype's own actual rest count.
Click any row to load it into a dedicated preview lane with its own
playback and MIDI export.

**Rests are exported as true silence, not zero-velocity note-on events**
— `buildNoteEventsFromSignedSegments` simply emits no note for a negative
segment, advancing the cursor without a sounding event. This was a
deliberate choice over the zero-velocity convention some step-sequencers
use: the MIDI spec treats a note-on with velocity 0 as equivalent to a
note-off, so many synths and DAWs would just collapse it back into
silence anyway, making it an unreliable way to mark a "muted step" rather
than a meaningfully different signal. If a specific downstream workflow
actually needs literal zero-velocity events, that would need to be a
separate, explicit export mode.

## Identify a rhythm and pitch scale

A pattern (typed as comma-separated durations, e.g. `2,1,1` for the Greek
*sousta* — quarter, eighth, eighth) or an uploaded monophonic `.mid` file
gets checked against every resultant in the same cyclic sense a resultant
actually repeats (a match may wrap past the last segment back to the
first). `findMatchingCases` (`src/core/rhythmAnalysis.ts`) narrows the
**Case** dropdown down to only the cases that contain it — sousta's 2,1,1
occurs in exactly 3:2, 5:2, 7:2, and 9:2 among the 19 canonical cases — and
every occurrence is outlined in magenta in the Resultant lane of whichever
technique/time-signature you're currently viewing. Durations are measured
start-to-start between attacks (not by each note's own note-off point),
matching how a resultant's own durations work, and reduced to the smallest
integer ratio so `4,2,2` and `2,1,1` are recognized as the same pattern.

Uploaded MIDI files are parsed with a small dependency-free reader
(`src/core/midiImport.ts`, the inverse of the writer in `midi.ts`) that
picks the track with the most notes as "the" melody — analysis is
monophonic-only for now, chords come later. Raw tick timing is real-world
messy — performed or humanized MIDI rarely lands exactly on a subdivision
— so `src/core/quantize.ts` snaps note-to-note gaps onto the coarsest
standard grid (quarter/eighth/sixteenth/etc., including triplets) that
explains them within a small tolerance before reducing to a duration
pattern, rather than taking the GCD of raw ticks directly (which turns a
few ticks of drift into a huge, meaningless pattern). The chosen grid and
how much deviation it absorbed are both shown, so quantization stays
visible rather than silent.

Pitch content is classified per Book II Ch. 1 (p. 101)'s four scale
groups and, for exactly two pitch classes, the specific interval from
Ch. 2B's eleven-entry table (`src/core/pitchClassification.ts`) — both
confirmed verbatim against the book. The One/Two split is decided from
the music's *actual* performed range (not pitch class alone — two notes a
ninth apart are Group Two even though they're "the same" pitch classes as
two notes a second apart); the Three/Four split ("more than one
root-tone") is decided by matching the pitch-class set against an exact
equal division of the octave — the same symmetric scales `scales.ts`
already generates — at any rotation, since that's literally what makes a
scale read the same from more than one of its own notes. A collection
that doesn't match any equal division defaults to Group One or Two, the
general case Book II Ch. 2 covers, rather than declining to answer.

## Controls

Laid out in the order each topic appears across the two books — every
Book I (rhythm) control before any Book II (pitch) control, each with its
own Playback section immediately after the controls it plays back:

- **Case** — one of the 19 canonical binary-synchronization generator
  pairs, narrowed to only the matches when a rhythm pattern is active.
- **Technique** — Plain (Ch. 2A), Fractioned (Ch. 4), or one of Expansion /
  Contraction / Balance (Ch. 5). Disables Generator B in the percussion
  mapping below for anything but Plain, since a single even pulse for the
  minor generator no longer fits those longer, composed grids.
- **Time signature** — every exact beats-per-bar reading of the current
  cycle (see "Time signatures" above).
- **Percussion mapping** — assigns any of the five structural components
  the piano roll already shows (C.D., Generator A, Generator B, the
  Resultant, C.P.) to a General MIDI drum voice (kick, snare, hi-hat,
  ride, ...). Each assignment becomes its own track, pinned to the GM
  percussion channel, so the polyrhythm underneath the resultant is
  audible directly as an actual drum part instead of only implied by the
  merged rhythm — see "Percussion mapping" below.
- **Three or More Generators (Ch. 6)** — its own Case (one of the book's
  four combinations) and Bar grouping, with its own "Playback (theme /
  countertheme)" section right after — see "Three or more generators"
  above.
- **Resultants Applied to Instrumental Forms (Ch. 7)** — Instrumental
  group (custom place count or a named accompaniment figure), synced
  against the *active* resultant above, with its own "Playback
  (instrumental interference)" section — see "Resultants applied to
  instrumental forms" above.
- **Coordination of Time Structures (Ch. 8)** — a plain calculator: pli,
  pla, aa, and a final duration, synced against the *active* resultant's
  own aT/T — see "Coordination of time structures" above.
- **Permutations (Ch. 9)** — a duration pattern and Circular/General
  permutation type, fully self-contained — see "Permutations (rhythmic
  variation)" above.
- **Higher-order variation (Ch. 10)** — two seed patterns and an order,
  fully self-contained — see "Higher-order variation" above.
- **Homogeneous continuity (Ch. 11)** — a divisor of the active
  resultant's segment count — see "Homogeneous rhythmic continuity" above.
- **Distributive powers (Ch. 12)** — terms and a power, fully
  self-contained — see "Distributive powers" above.
- **Evolution of rhythm styles (Ch. 13)** — two durations to trace to
  their generator pair, fully self-contained — see "Evolution of rhythm
  styles" above.
- **Rhythms of variable velocities (Ch. 14)** — a group/series/repeats/
  direction for Acceleration, plus x/y/τ for Rubato, fully self-contained
  — see "Rhythms of variable velocities" above.
- **Scale** — a symmetric-division or interval-cell preset (Book II).
- **Register** — which octave the scale's root anchors to.
- **Contour** — how successive notes move through the scale.
- **Harmony (strata)** — optional parallel voices at fixed intervals.
- **Evolution of pitch-scale styles (Book II Ch. 3)** — interval/split,
  displacement-scale sequence, and summation/selection window controls,
  each with a "Preview" button — see "Evolution of pitch-scale styles"
  above.
- **Tempo / unit note value** — maps the resultant's abstract duration units
  onto real time (e.g. "1 unit = a sixteenth note" at a given bpm).

`Play` loops the full resultant cycle via Web Audio oscillators (sine for
the melody voice, triangle for harmony, square for percussion voices) —
it becomes `Stop` while playing. Changing any control while
playing restarts the loop from the top with the new settings, rather than
finishing out the old cycle first. `Download MIDI` writes an actual
multi-track `.mid` file you can drag into a DAW, `midi-drum-composer`, or
`audio-player`.

## Tests

```bash
npm test
```

Covers the resultant math against all 19 published binary-synchronization
cases and their fractioned expansions, coincidence-point detection,
three-generator resultants, grouping bar math (plain, fractioned, and
pairs), Expansion/Contraction/Balance against the book's own worked
examples, time-signature option derivation, MIDI round-tripping (writer →
reader, including running status and multi-voice track selection), cyclic
pattern search (including the sousta example against all 19 cases), pitch
group/interval classification, the symmetric scale divisions
(augmented/diminished/whole-tone/chromatic) and uneven-division remainder
spreading, interval-cell tiling and octave clipping, melody/contour
assembly and strata harmonization, and the exported `.mid` file's byte
structure (header, format, track count, `MTrk` framing).

## Reference material

`~/Desktop/schillinger-midi-artifacts/` has two full scans of the book;
use `Schillinger System of Musical Composition_text.pdf` (43MB) — it has a
real OCR text layer, unlike the other 92MB image-only scan. Extract text or
render any page to PNG fully offline via macOS's built-in PDFKit, no
network install needed:

```bash
swift schillinger-midi-artifacts/tools/pdftext.swift "<pdf path>" <firstPage> <lastPage>
swift schillinger-midi-artifacts/tools/pdfrender.swift "<pdf path>" <pageNum> out.png [scale]
```
