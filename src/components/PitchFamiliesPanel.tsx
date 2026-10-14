import { useMemo, useState } from "react";
import {
  BALINESE,
  PRIMITIVE,
  pitchUnitPermutations,
  toAxis,
  intervalPermutations,
  intervalTranspositions,
  modernizedScale,
  sigmaE1,
  cycleDegrees,
  cadences,
  strataRoots,
  stratifySigma,
  potentialAuxiliaries,
  melodizingFunctions,
} from "../core/pitchFamilies";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "db", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const names = (ps: readonly number[]) => ps.map((p) => NOTE_NAMES[((p % 12) + 12) % 12]).join(" ");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const SCALES = {
  balinese: { label: "Balinese c db eb g ab (Ch. 2-3)", pcs: BALINESE },
  primitive: { label: "Primitive c d f (Ch. 1)", pcs: PRIMITIVE },
} as const;
type ScaleKey = keyof typeof SCALES;
type Form = "cycle" | "cadence" | "symmetric" | "strata";

export default function PitchFamiliesPanel() {
  const [scaleKey, setScaleKey] = useState<ScaleKey>("balinese");
  const pcs = SCALES[scaleKey].pcs;
  const units = pcs.length;

  const derivatives = useMemo(() => {
    const units = pitchUnitPermutations(pcs);
    const onAxis = units.map((s) => toAxis(s));
    const intervals = intervalPermutations(pcs);
    return {
      units,
      onAxis,
      intervals,
      transpositions: intervalTranspositions(pcs),
      modernized: modernizedScale(pcs, pcs.length === 3 ? 4 : 3),
      unitAux: potentialAuxiliaries(pcs, onAxis),
      intervalAux: potentialAuxiliaries(pcs, intervals),
    };
  }, [pcs]);

  // Heard: every derivative scale in turn, from c4 -- (1), (2), (3), (4), then the modernized scale.
  const derivativeRows = useMemo(
    () => [...derivatives.units, ...derivatives.onAxis, ...derivatives.intervals, ...derivatives.transpositions, derivatives.modernized],
    [derivatives],
  );
  const derivativeNotes = useMemo<NoteEvent[]>(() => {
    const out: NoteEvent[] = [];
    let t = 0;
    for (const row of derivativeRows) {
      row.forEach((p, k) => out.push({ midiNote: 60 + p, startUnits: t + k * 0.5, durationUnits: 0.45, velocity: k === 0 ? 100 : 80, voice: 0 }));
      t += row.length * 0.5 + 1;
    }
    return out;
  }, [derivativeRows]);
  const derivativeLength = derivativeRows.reduce((a, r) => a + r.length * 0.5 + 1, 0);

  const [form, setForm] = useState<Form>("cycle");
  const [cycle, setCycle] = useState(1);
  const [cadenceType, setCadenceType] = useState<"initial" | "final" | "compound">("compound");
  const [melodize, setMelodize] = useState(true);

  // Each chord: bass (a, an octave down) and upper voices from Σ(E1).
  const chords = useMemo(() => {
    if (form === "cycle" || form === "cadence") {
      const degrees = form === "cycle" ? cycleDegrees(cycle, units) : cadences(cycle, units)[cadenceType];
      return degrees.map((d) => ({ label: ROMAN[d], sigma: sigmaE1(pcs, d, 60) }));
    }
    if (form === "symmetric") {
      // Type III: one Σ moved by ∜2, c a f# eb c -- "justified by the relationship c - eb".
      return [0, -3, -6, -9, -12].map((r) => ({ label: names([r]), sigma: sigmaE1(pcs, 0, 60 + r) }));
    }
    return strataRoots([3, 5]).map((r) => ({ label: names([r]), sigma: sigmaE1(pcs, 0, 60 + r) }));
  }, [form, cycle, cadenceType, pcs, units]);

  const notes = useMemo<NoteEvent[]>(() => {
    const out: NoteEvent[] = [];
    chords.forEach((c, k) => {
      const start = 4 * k;
      const [a, ...rest] = c.sigma;
      const harmony =
        form === "strata"
          ? stratifySigma(c.sigma, [1, 2, 2]).flatMap((s, i) => s.map((p) => (i === 0 ? p - 12 : p)))
          : [a - 12, a, ...rest.slice(0, 1)]; // hybrid 3-part: constant a in the bass, a and b above
      harmony.forEach((midiNote, voice) => out.push({ midiNote, startUnits: start, durationUnits: 3.9, velocity: 78, voice }));
      if (melodize) {
        // Melody of n + 1 functions over the n of the harmony: a, b, c, then the added d (Ch. 3).
        const functions = melodizingFunctions(form === "strata" ? 4 : 2).length;
        const line = c.sigma.slice(0, functions).map((p) => p + 12);
        line.forEach((midiNote, i) =>
          out.push({ midiNote, startUnits: start + (4 / line.length) * i, durationUnits: (4 / line.length) * 0.95, velocity: 92, voice: 8 }),
        );
      }
    });
    return out;
  }, [chords, form, melodize]);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Evolution of Pitch-Families (Book X)</h3>
      <p className="schillinger__hint">
        Unity of style comes from "(1) the identity of pitch-units, and (2) the identity of intervals." A
        primitive scale yields derivative scales: (1) its pitch-units permuted, (2) moved to one axis, (3) its
        intervals permuted, (4) its intervals moved onto its own units. Its modernized form repeats it at the
        interval between its extreme units. Pitch-units the derivatives add become "potential leading units."
      </p>
      <div className="schillinger__row">
        <label>
          Scale
          <select value={scaleKey} onChange={(e) => { setScaleKey(e.target.value as ScaleKey); setCycle(1); }}>
            {(Object.keys(SCALES) as ScaleKey[]).map((k) => (
              <option key={k} value={k}>
                {SCALES[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        (1) {derivatives.units.map(names).join(" · ")}
        <br />
        (2) {derivatives.onAxis.map(names).join(" · ")}
        <br />
        (3) {derivatives.intervals.map(names).join(" · ")}
        <br />
        (4) {derivatives.transpositions.map(names).join(" · ")}
        <br />
        Modernized: {names(derivatives.modernized)}
        <br />
        Leading units from (2): {names(derivatives.unitAux)}; from (3): {names(derivatives.intervalAux)}
        {scaleKey === "balinese" && " (the book's Figure 11 lists six and leaves out a, though a is in its own d2)"}
      </div>
      <NotePlayback notes={derivativeNotes} lengthUnits={derivativeLength} fileName="schillinger-derivative-scales.mid" defaultBpm={140} />

      <h4>Harmony and melodization (Ch. 2-3)</h4>
      <p className="schillinger__hint">
        The harmony scale is E1, the first tonal expansion. Σ(E1) stacks every unit on each degree, and diads,
        triads and tetrads are its partial forms. The cycles are numbered: C1 is the harmony scale read
        downward, and C2 and C3 are its expansions, so Ck steps 2k degrees down. Cadences use the chords next to
        I in the cycle. Symmetric (Type III) harmony moves one Σ by ∜2. Strata harmony splits Σ into a; b, c;
        d, e, with roots falling by Σ's own 3 + 5 semitones (the book labels them "8 + 5"). The melody adds one
        function to the harmony's.
      </p>
      <div className="schillinger__row">
        <label>
          Form
          <select value={form} onChange={(e) => setForm(e.target.value as Form)}>
            <option value="cycle">Diatonic cycle (hybrid 3-part)</option>
            <option value="cadence">Cadence</option>
            <option value="symmetric">Type III: Σ by ∜2</option>
            <option value="strata">Strata, roots 3 + 5</option>
          </select>
        </label>
        {(form === "cycle" || form === "cadence") && (
          <label>
            Cycle
            <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))}>
              {[1, 2, 3].filter((k) => (2 * k) % units !== 0).map((k) => (
                <option key={k} value={k}>
                  C{k}
                </option>
              ))}
            </select>
          </label>
        )}
        {form === "cadence" && (
          <label>
            Cadence
            <select value={cadenceType} onChange={(e) => setCadenceType(e.target.value as typeof cadenceType)}>
              <option value="initial">Initial</option>
              <option value="final">Final</option>
              <option value="compound">Compound</option>
            </select>
          </label>
        )}
        <label>
          <input type="checkbox" checked={melodize} onChange={(e) => setMelodize(e.target.checked)} />
          Melodize ({melodizingFunctions(form === "strata" ? 4 : 2).join(", ")})
        </label>
      </div>
      <div className="schillinger__readout">
        {chords.map((c) => `${c.label}: ${names(c.sigma)}`).join(" · ")}
      </div>
      <NotePlayback notes={notes} lengthUnits={4 * chords.length} fileName="schillinger-pitch-family.mid" defaultBpm={110} />
    </section>
  );
}
