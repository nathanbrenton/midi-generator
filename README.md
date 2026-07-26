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

Book II builds symmetric pitch scales the same way Book I builds
rhythms — dividing the octave into equal (or as-equal-as-possible) parts.
Dividing by 3, 4, or 6 reproduces the augmented, diminished, and whole-tone
scales exactly; other divisors spread the remainder evenly across the
octave using the same math as the rhythm side.

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
- **Scale** — a symmetric-division or interval-cell preset (Book II).
- **Register** — which octave the scale's root anchors to.
- **Contour** — how successive notes move through the scale.
- **Harmony (strata)** — optional parallel voices at fixed intervals.
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
