import { useMemo, useState } from "react";
import {
  FIGURATION_ELEMENTS,
  suspension,
  triplePassingTones,
  doublePassingTones,
  auxiliaryTone,
  auxiliaryClassification,
  directionalSequence,
  analyzeMotif,
  assignSystem,
  FUNCTION_SYSTEMS,
  type FiguredChord,
  type SuspendedSet,
} from "../core/melodicFiguration";
import { applyCoefficients } from "../core/symmetricHarmony";
import { generateResultant } from "../core/resultant";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const name = (n: number) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const SCALES = {
  major: { label: "natural major (c)", scale: MAJOR, tonic: 60 },
  harmonicMinor: { label: "harmonic minor (a)", scale: intervalCellScale([2, 1, 2, 2, 1, 3, 1]), tonic: 57 },
  lydianDominant: { label: "Σ c-d-e-f#-g-a-b♭", scale: intervalCellScale([2, 2, 2, 1, 2, 1, 2]), tonic: 60 },
  mixolydian: { label: "Σ c-d-e-f-g-a-b♭", scale: intervalCellScale([2, 2, 1, 2, 2, 1, 2]), tonic: 60 },
} as const;
type ScaleKey = keyof typeof SCALES;
const HELD: readonly { label: string; held: SuspendedSet; cycles: readonly (0 | 3 | 5 | 7)[] }[] = [
  { label: "1 → 7 (single)", held: [1], cycles: [3, 5, 7] },
  { label: "3 → 7 (single)", held: [3], cycles: [3, 5, 7] },
  { label: "5 → 7 (single)", held: [5], cycles: [3, 5, 7] },
  { label: "1, 3 → 7, 9 (double)", held: [1, 3], cycles: [0, 3, 5, 7] },
  { label: "3, 5 → 7, 9 (double)", held: [3, 5], cycles: [0, 3, 5, 7] },
  { label: "5, 7 → 7, 9 (double)", held: [5, 7], cycles: [0, 3, 5, 7] },
  { label: "1, 3, 5 → 7, 9, 11 (triple)", held: [1, 3, 5], cycles: [3, 5] },
  { label: "3, 5, 7 → 7, 9, 11 (triple)", held: [3, 5, 7], cycles: [3, 5] },
];
const MOTIF = [68, 69, 72, 76, 77, 76]; // Figure 357: g#-a-c-e-f-e
const r = (a: number, b: number) => generateResultant([a, b]).segments.map((s) => s.duration);

/** Chords, one per two beats, with a voice that keeps its pitch held over as one note (a tie). */
function tiedNotes(chords: readonly FiguredChord[]): NoteEvent[] {
  const notes: NoteEvent[] = [];
  const voices = [(c: FiguredChord) => c.bass, ...chords[0].upper.map((_, k) => (c: FiguredChord) => c.upper[k])];
  voices.forEach((pitchOf, voice) => {
    let start = 0;
    for (let i = 1; i <= chords.length; i++) {
      if (i === chords.length || pitchOf(chords[i]) !== pitchOf(chords[start])) {
        notes.push({ midiNote: pitchOf(chords[start]), startUnits: 2 * start, durationUnits: 2 * (i - start) - 0.1, velocity: 88, voice });
        start = i;
      }
    }
  });
  return notes;
}

const chordText = (c: FiguredChord) =>
  `${c.label}: ${name(c.bass)} | ${c.upper.map((p, i) => `${name(p)}(${c.functions[i]})`).join(" ")}`;

export default function MelodicFigurationPanel() {
  // Ch.21 A.
  const [heldIndex, setHeldIndex] = useState(0);
  const [cycle, setCycle] = useState<0 | 3 | 5 | 7>(5);
  const held = HELD[heldIndex];
  const resolution = held.cycles.includes(cycle) ? cycle : held.cycles[held.cycles.length - 1];
  const suspended = useMemo(() => suspension(MAJOR, 48, 0, held.held, resolution), [held, resolution]);
  const suspensionNotes = useMemo(() => tiedNotes(suspended.chords), [suspended]);

  // Ch.21 B.
  const [passingCycle, setPassingCycle] = useState<3 | 5>(5);
  const [passingKind, setPassingKind] = useState<"double" | "triple">("double");
  const [doubleFrom, setDoubleFrom] = useState<1 | 3 | 5>(1);
  const [doubleCycle, setDoubleCycle] = useState<"C0" | "C3" | "C5" | "C7">("C7");
  const passing = useMemo(
    () => (passingKind === "triple" ? triplePassingTones(MAJOR, 48, 0, passingCycle) : doublePassingTones(MAJOR, 48, 0, doubleFrom, doubleCycle)),
    [passingKind, passingCycle, doubleFrom, doubleCycle],
  );
  const passingNotes = useMemo(() => tiedNotes(passing), [passing]);

  // Ch.22.
  const [scaleKey, setScaleKey] = useState<ScaleKey>("lydianDominant");
  const [fn, setFn] = useState(5);
  const [direction, setDirection] = useState<"↗" | "↘">("↗");
  const [chromatic, setChromatic] = useState(false);
  const { scale, tonic } = SCALES[scaleKey];
  const aux = useMemo(() => auxiliaryTone(scale, tonic, 0, fn, direction, chromatic), [scale, tonic, fn, direction, chromatic]);
  const auxNotes = useMemo<NoteEvent[]>(
    () => [
      { midiNote: aux.auxiliary, startUnits: 0, durationUnits: 0.9, velocity: 90, voice: 1 },
      { midiNote: aux.chordTone, startUnits: 1, durationUnits: 2.9, velocity: 90, voice: 1 },
      { midiNote: tonic - 12, startUnits: 0, durationUnits: 3.9, velocity: 80, voice: 0 },
    ],
    [aux, tonic],
  );

  // Ch.23.
  const [systemIndex, setSystemIndex] = useState(2);
  const motifReading = useMemo(() => analyzeMotif(MOTIF, [9, 0, 4]), []);
  const system = FUNCTION_SYSTEMS[systemIndex];
  const assignment = assignSystem(2, system[2]);
  const motifNotes = useMemo<NoteEvent[]>(
    () => [
      ...MOTIF.map((midiNote, i) => ({ midiNote, startUnits: i * 0.5, durationUnits: i === MOTIF.length - 1 ? 1.4 : 0.45, velocity: 90, voice: 1 })),
      { midiNote: 45, startUnits: 0, durationUnits: 3.9, velocity: 75, voice: 0 },
    ],
    [],
  );

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Melodic Figuration (Book V, Ch. 20-23)</h3>
      <p className="schillinger__hint">
        "The technique of melodic figuration consists mainly of the process of evolving leading tones
        for chordal tones in a given harmonic continuity... transforming neutral units (chordal tones)
        into directional units" (p.569). Its one firm rule: the result must be a crystallized
        structure — "a single suspension requires an S(7) in which the suspended tone is a prepared
        7th. A double suspension requires an S(9)... a triple suspension... an S(11)"; the old "S(11) =
        1, 5, 11" does not qualify. The elements (Figure 322):
      </p>
      <div className="schillinger__readout">
        {FIGURATION_ELEMENTS.map((e, i) => (
          <div key={i}>
            {e.element} ×{e.number}: {e.direction} {e.functions} {e.scale && `(${e.scale})`}
          </div>
        ))}
      </div>

      <h4>Suspensions (Ch. 21 A, p.573)</h4>
      <p className="schillinger__hint">
        "The 1, the 3 or the 5 become a prepared 7. The functions, 1, 3 and 5, serve as the
        preparation; the 7th, as a suspension; and the nearest function one step lower, as a
        resolution" — doubles from 1-3, 3-5, 5-7 into 7 and 9, triples from 1-3-5 or 3-5-7 into 7, 9,
        11. Which tone is held decides the cycle into the suspension (Ch. 9-11's preparation tables);
        the resolution follows their resolution tables. Held voices are tied.
      </p>
      <div className="schillinger__row">
        <label>
          Held
          <select value={heldIndex} onChange={(e) => setHeldIndex(Number(e.target.value))}>
            {HELD.map((h, i) => (
              <option key={h.label} value={i}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resolution
          <select value={resolution} onChange={(e) => setCycle(Number(e.target.value) as 0 | 3 | 5 | 7)}>
            {held.cycles.map((c) => (
              <option key={c} value={c}>
                C{c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        Into the suspension by C{suspended.preparationCycle}
        {suspended.chords.map((c, i) => (
          <div key={i}>{chordText(c)}</div>
        ))}
      </div>
      <NotePlayback notes={suspensionNotes} lengthUnits={6} fileName="schillinger-suspension.mid" />

      <h4>Passing tones (Ch. 21 B, p.575-576)</h4>
      <p className="schillinger__hint">
        Single passing tones are the passing seventh of Ch. 15 (the walking bass). Double ones are "the
        passing 7 and 9 obtained by means of downward motion from the 1 and 3, or the 3 and 5, or the 5 and
        7": in Figure 330 the pair stands twice, held below while its doubling steps down, so the passing
        chord is the crystallized S(9), 1-3-7-9, resolving by Ch. 10's table. "Triple passing tones are 7, 9
        and 11 obtained by means of downward motion from the 1, 3 and 5; this corresponds to a preparation
        of S(11) in C0."
      </p>
      <div className="schillinger__row">
        <label>
          Kind
          <select value={passingKind} onChange={(e) => setPassingKind(e.target.value as "double" | "triple")}>
            <option value="double">Double (S(9))</option>
            <option value="triple">Triple (S(11))</option>
          </select>
        </label>
        {passingKind === "double" ? (
          <>
            <label>
              From
              <select value={doubleFrom} onChange={(e) => setDoubleFrom(Number(e.target.value) as 1 | 3 | 5)}>
                <option value={1}>the 1 and 3</option>
                <option value={3}>the 3 and 5</option>
                <option value={5}>the 5 and 7</option>
              </select>
            </label>
            <label>
              Resolution
              <select value={doubleCycle} onChange={(e) => setDoubleCycle(e.target.value as typeof doubleCycle)}>
                {(["C0", "C3", "C5", "C7"] as const).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label>
            Resolution
            <select value={passingCycle} onChange={(e) => setPassingCycle(Number(e.target.value) as 3 | 5)}>
              <option value={5}>C5 — to S(7)</option>
              <option value={3}>C3 — to S(6), the bass held</option>
            </select>
          </label>
        )}
      </div>
      <div className="schillinger__readout">
        {passing.map((c, i) => (
          <div key={i}>{chordText(c)}</div>
        ))}
      </div>
      <NotePlayback notes={passingNotes} lengthUnits={6} fileName="schillinger-passing-tones.mid" />

      <h4>Auxiliary tones (Ch. 22, p.584-589)</h4>
      <p className="schillinger__hint">
        "Any chordal function may be preceded by an upper or lower auxiliary tone. The interval
        between the auxiliary and the chordal tone depends on the type of harmony": the neighbor in
        the scale, or in the master-structure Σ — "in Σ c-d-e-f#-g-a-b♭... ↗5, i = 1 (f# → g), whereas
        in c-d-e-f-g-a-b♭... i = 2" — or a semitone when chromatic. Figure 349 classifies{" "}
        {[1, 2, 3].map((n) => auxiliaryClassification(n as 1 | 2 | 3).length).join(", ")} single, double and
        triple forms over 1, 3, 5, 7, and coefficients of recurrence order them: r3÷2{" "}
        {directionalSequence([[6, 1]], r(3, 2)).join(" ")}; r4÷3{" "}
        {directionalSequence(applyCoefficients([1, 3, 5, 7, 3, 1], r(4, 3)), [1, 1, 2, 2, 2, 2, 1, 1]).join(" ")}.
      </p>
      <div className="schillinger__row">
        <label>
          Scale or Σ
          <select value={scaleKey} onChange={(e) => setScaleKey(e.target.value as ScaleKey)}>
            {(Object.keys(SCALES) as ScaleKey[]).map((k) => (
              <option key={k} value={k}>
                {SCALES[k].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Function
          <select value={fn} onChange={(e) => setFn(Number(e.target.value))}>
            {[1, 3, 5, 7, 9, 11, 13].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direction
          <select value={direction} onChange={(e) => setDirection(e.target.value as "↗" | "↘")}>
            <option value="↗">↗ lower auxiliary</option>
            <option value="↘">↘ upper auxiliary</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={chromatic} onChange={(e) => setChromatic(e.target.checked)} />
          Chromatic
        </label>
      </div>
      <div className="schillinger__readout">
        {direction}
        {fn} on the chord of the scale's first degree: {name(aux.auxiliary)} → {name(aux.chordTone)}, i = {aux.interval}
      </div>
      <NotePlayback notes={auxNotes} lengthUnits={4} fileName="schillinger-auxiliary.mid" />

      <h4>Thematic figuration (Ch. 23, p.597-605)</h4>
      <p className="schillinger__hint">
        A motif is read as chordal and non-chordal tones — "in every seven-unit scale, either the first
        or the second pitch-unit is a chordal tone" — and its chordal tones are assigned one of "the
        seven possible systems" of functions (Figure 358). Figure 357's motif g#-a-c-e-f-e reads{" "}
        {motifReading.map((t, i) => `${name(MOTIF[i])} ${t}`).join(", ")}. Its axis is e: "if e becomes
        assigned to function as the ninth, we must start on the fifth," and every chord needs at least
        that tension.
      </p>
      <div className="schillinger__row">
        <label>
          a-c-e as
          <select value={systemIndex} onChange={(e) => setSystemIndex(Number(e.target.value))}>
            {FUNCTION_SYSTEMS.map((s, i) => (
              <option key={i} value={i}>
                {s.join("-")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        e is {system[2]}: start on {assignment.startingFunction}; chords of at least {assignment.minimumTension}
      </div>
      <NotePlayback notes={motifNotes} lengthUnits={4} fileName="schillinger-motif.mid" />
    </section>
  );
}
