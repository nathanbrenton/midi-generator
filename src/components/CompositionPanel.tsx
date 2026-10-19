import { useMemo, useState } from "react";
import {
  SEQUENCE_GROUPS,
  PROGRESSIVE_SIZES,
  thematicSequence,
  coordinate,
  subjectsOf,
  subjectTotals,
  adjacentResultant,
  reciprocatingBinomials,
  binomialParts,
  binomialEffect,
  resourceScales,
  DYNAMIC_DEGREES,
  ATTACK_DEGREES,
  QUALITY_DEGREES,
  climaxPositions,
  POLYTHEMATIC_EXAMPLE,
  DIAL,
  reciprocalPosition,
  zoneOf,
  stimulusFor,
  cellScale,
  gravity,
  patternCombinations,
  configurationalModulation,
  type SequenceGroup,
} from "../core/composition";
import { generateResultant } from "../core/resultant";
import { generateFractionedResultant } from "../core/fractioning";
import { buildCountertheme } from "../core/threeGenerators";
import { distributivePower } from "../core/distributivePowers";
import { diatonicCycle, voiceLeadProgression } from "../core/diatonicHarmony";
import { intervalCellScale, midiNoteForDegree } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const durations = (r: { segments: { duration: number }[] }) => r.segments.map((s) => s.duration);
const COEFFICIENT_GROUPS: { label: string; values: number[] }[] = [
  { label: "1 (monomial)", values: [1] },
  { label: "3+1", values: [3, 1] },
  { label: "r4÷3", values: durations(generateResultant([4, 3])) },
  { label: "fractional 4÷3", values: durations(generateFractionedResultant(4, 3)) },
  { label: "r7÷4", values: durations(generateResultant([7, 4])) },
  { label: "(3+1)²", values: distributivePower([3, 1], 2) },
  { label: "(2+1+1)²", values: distributivePower([2, 1, 1], 2) },
  { label: "(3+1)³", values: distributivePower([3, 1], 3) },
  { label: "1+2+3", values: [1, 2, 3] },
  { label: "3+1+2", values: [3, 1, 2] },
  { label: "growth 1+2+…+8", values: [1, 2, 3, 4, 5, 6, 7, 8] },
  { label: "decline 8+4+2+1", values: [8, 4, 2, 1] },
  { label: "summation 1+3+4+7", values: [1, 3, 4, 7] },
  { label: "r(3÷4÷7)", values: durations(buildCountertheme([3, 4, 7])) },
];
// One motif per subject, in scale degrees, each a little higher than the last.
const MOTIFS = [
  [0, 2, 4, 2],
  [4, 3, 2, 1],
  [0, 4, 2, 5],
  [7, 6, 5, 4],
  [2, 4, 6, 4],
  [0, 1, 2, 0],
  [4, 7, 9, 7],
];
const VELOCITY: Record<string, number> = { pp: 40, p: 55, mf: 75, f: 95, ff: 112 };
const ATTACK_LENGTH = [1, 0.9, 0.7, 0.4, 0.15];
const NOTE_NAMES = ["c", "db", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const names = (ps: readonly number[]) => ps.map((p) => NOTE_NAMES[((p % 12) + 12) % 12]).join(" ");
const fraction = (x: number) => {
  for (let d = 2; d <= 64; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) return `${Math.round(x * d)}/${d}`;
  return x.toFixed(3);
};

/** A subject's motif, looped through `length` units from `start`. */
function motifNotes(subjectIndex: number, start: number, length: number, velocity: number, step = 0.5, transpose = 0): NoteEvent[] {
  const motif = MOTIFS[subjectIndex % MOTIFS.length];
  const base = 60 + transpose + (subjectIndex % 3) * 5 - 5;
  const out: NoteEvent[] = [];
  for (let k = 0; k * step < length - 1e-9; k++) {
    out.push({ midiNote: midiNoteForDegree(MAJOR, base, motif[k % motif.length]), startUnits: start + k * step, durationUnits: step * 0.9, velocity, voice: subjectIndex });
  }
  return out;
}

export default function CompositionPanel() {
  // Ch.11-13: thematic sequence and temporal coordination.
  const [subjects, setSubjects] = useState(3);
  const [group, setGroup] = useState<SequenceGroup>(3);
  const [variant, setVariant] = useState(0);
  const [coefficientIndex, setCoefficientIndex] = useState(9);
  const sequence = useMemo(() => thematicSequence(group, subjects, variant), [group, subjects, variant]);
  const coefficients = COEFFICIENT_GROUPS[coefficientIndex].values;
  const appearances = useMemo(() => coordinate(sequence.flat(), coefficients), [sequence, coefficients]);
  const maximal = useMemo(() => subjectsOf(appearances), [appearances]);
  const totals = subjectTotals(appearances);
  const sequenceLength = appearances.reduce((a, b) => a + b.coefficient, 0);
  const sequenceNotes = useMemo<NoteEvent[]>(() => {
    let t = 0;
    return appearances.flatMap((a) => {
      const s = a.subject.charCodeAt(0) - 65;
      const notes = motifNotes(s, t, a.coefficient * 2, maximal[a.subject] === a.exposition ? 100 : 70);
      notes.push({ midiNote: midiNoteForDegree(MAJOR, 36, MOTIFS[s % MOTIFS.length][0]), startUnits: t, durationUnits: a.coefficient * 2 - 0.1, velocity: 70, voice: 8 });
      t += a.coefficient * 2;
      return notes;
    });
  }, [appearances, maximal]);

  // Ch.14/16: the polythematic miniature, T" = 4 units, t = 1/4 unit.
  const [climaxRatio, setClimaxRatio] = useState("3+1");
  const climaxTerms = climaxRatio.split("+").map(Number).filter((n) => n > 0);
  const miniature = useMemo(() => {
    const { sequence: seq, periods, tPrime, keys, dynamics } = POLYTHEMATIC_EXAMPLE;
    const expositionOf: Record<string, number> = { A: 0, B: 0, C: 0 };
    const notes: NoteEvent[] = [];
    const rows: string[] = [];
    let t = 0;
    seq.forEach((termSubjects, term) => {
      const transpose = { C: 0, E: 4, G: 7 }[keys[term]];
      for (const s of termSubjects) {
        const k = expositionOf[s]++;
        const length = periods[s as "A"][k] * 4;
        const dynamic = dynamics[s as "A"][k];
        notes.push(...motifNotes(s.charCodeAt(0) - 65, t, length, VELOCITY[dynamic], tPrime[s as "A"] / 4, transpose));
        rows.push(`${s}${k + 1} ${periods[s as "A"][k]}T" ${dynamic} in ${keys[term]}`);
        t += length;
      }
    });
    return { notes, rows, length: t };
  }, []);

  // Ch.5: harmony rhythmized by reciprocating binomials.
  const [binomialSource, setBinomialSource] = useState(6);
  const binomialGroup = useMemo(() => adjacentResultant(binomialSource), [binomialSource]);
  const parts = useMemo(() => binomialParts(binomialGroup, 4), [binomialGroup]);
  const binomialNotes = useMemo<NoteEvent[]>(() => {
    const pairs = parts[0].length;
    const cycle = diatonicCycle(5);
    const roots = Array.from({ length: 2 * pairs }, (_, k) => cycle[k % 7]);
    const chords = voiceLeadProgression(MAJOR, 60, roots, "clockwise").map((v) => [v.bass - 12, ...[v.root, v.third, v.fifth].sort((a, b) => a - b)]);
    const out: NoteEvent[] = [];
    // Parts from the top: S, A, T over the rotations, B on the balanced binomial (or the last rotation).
    parts.forEach((part, p) => {
      const voice = 3 - p;
      part.forEach(([a, b], k) => {
        const start = k * binomialSource;
        out.push({ midiNote: chords[2 * k][voice], startUnits: start, durationUnits: a * 0.95, velocity: 85, voice });
        out.push({ midiNote: chords[2 * k + 1][voice], startUnits: start + a, durationUnits: b * 0.95, velocity: 80, voice });
      });
    });
    return out;
  }, [parts, binomialSource]);
  const binomialInfo = reciprocatingBinomials(binomialGroup);

  // Ch.9: scales of dynamics and attacks.
  const [resource, setResource] = useState<"dynamics" | "attacks" | "quality">("dynamics");
  const [scaleUnits, setScaleUnits] = useState<1 | 2 | 3 | 5>(3);
  const scales = resourceScales(scaleUnits);
  const [scaleIndex, setScaleIndex] = useState(0);
  const chosenScale = scales.all[Math.min(scaleIndex, scales.all.length - 1)];
  const degreeNames = resource === "dynamics" ? DYNAMIC_DEGREES : resource === "attacks" ? ATTACK_DEGREES : QUALITY_DEGREES;
  const resourceNotes = useMemo<NoteEvent[]>(() => {
    // A phrase repeated once per degree of the scale, each repetition in that degree.
    const phrase = [0, 2, 4, 5, 4, 2, 1, 0];
    return chosenScale.flatMap((degree, g) =>
      phrase.map((d, k) => ({
        midiNote: midiNoteForDegree(MAJOR, 60, d),
        startUnits: g * 4 + k * 0.5,
        durationUnits: 0.5 * (resource === "attacks" ? ATTACK_LENGTH[degree - 1] : 0.9),
        velocity: resource === "dynamics" ? VELOCITY[DYNAMIC_DEGREES[degree - 1]] : 85,
        voice: 0,
      })),
    );
  }, [chosenScale, resource]);

  // Ch.17-19: the psychological dial.
  const [dialAngle, setDialAngle] = useState(225);
  const [individualNormal, setIndividualNormal] = useState(150);
  const [modulate, setModulate] = useState(false);
  const dialNotes = useMemo<NoteEvent[]>(() => {
    const out: NoteEvent[] = [];
    const push = (midiNote: number, startUnits: number, durationUnits: number, velocity: number, voice = 0) =>
      out.push({ midiNote, startUnits, durationUnits: durationUnits * 0.92, velocity, voice });
    if (modulate) {
      // From the positive pattern a (rising, upper gravity) to the negative b (falling, lower gravity) by r5÷4.
      const a = cellScale([4, 3], 4, 60);
      const b = cellScale([1, 2], 4, 0).map((p) => 72 - p);
      let t = 0;
      for (const { pattern, count } of configurationalModulation(durations(generateResultant([5, 4])))) {
        for (let r = 0; r < count; r++) for (const p of pattern === "a" ? a : b) push(p, (t += 0.25) - 0.25, 0.25, pattern === "a" ? 95 : 60);
      }
      return out;
    }
    const lowScale = cellScale([1, 2], 9, 0);
    const highScale = cellScale([4, 3], 9, 0);
    switch (dialAngle) {
      case 180: // balance: uniform, long, one chord, oscillating
        for (let k = 0; k < 8; k++) push(k % 2 ? 67 : 64, k * 2, 2, 70);
        [48, 55, 64].forEach((p) => push(p, 0, 16, 55, 1));
        break;
      case 135: // lower gravity, falling, uniform groups ending long
        [0, 1, 2, 3, 4, 5, 6, 8].forEach((d, k) => push(72 - lowScale[d], k, k === 7 ? 4 : 1, 60));
        [36, 48, 51].forEach((p) => push(p, 0, 11, 45, 1));
        break;
      case 90: { // loss of momentum: fewer attacks, longer durations, low
        let t = 0;
        [4, 3, 2, 1].forEach((attacks, g) => {
          for (let k = 0; k < attacks; k++) push(60 - lowScale[g * 2 + k], t, (g + 1) * 0.75, 50 - g * 6), (t += (g + 1) * 0.75);
        });
        push(36, 0, t, 40, 1);
        break;
      }
      case 45: // the subnatural: time magnified, very long and very low
        [0, 1, 3, 4].forEach((d, k) => push(36 + lowScale[d], k * 4, 4, 55));
        break;
      case 225: // upper gravity, rising binomials 2+1, down-beat stress
        [0, 1, 2, 3, 4, 5].forEach((d, k) => push(60 + highScale[d], k * 1.5, k % 2 ? 0.5 : 1, k % 2 ? 75 : 100));
        [48, 52, 55].forEach((p) => push(p, 0, 9, 70, 1));
        break;
      case 270: { // gain of momentum: more attacks, shorter durations, high, loud
        let t = 0;
        [1, 2, 3, 4, 6, 8].forEach((attacks, g) => {
          for (let k = 0; k < attacks; k++) push(72 + cellScale([3, 1], 12, 0)[(g + k) % 12], t, 2 / attacks, 80 + g * 6), (t += 2 / attacks);
        });
        push(48, 0, t, 90, 1);
        break;
      }
      case 315: // the supernatural: accelerated far beyond any performer
        for (let k = 0; k < 48; k++) push(84 + highScale[k % 9], k * 0.125, 0.125, 90);
        break;
      default: // abnormal: both extremes at once
        [0, 1, 3, 4].forEach((d, k) => push(36 + lowScale[d], k * 4, 4, 60, 1));
        for (let k = 0; k < 64; k++) push(84 + highScale[k % 9], k * 0.25, 0.25, 90);
    }
    return out;
  }, [dialAngle, modulate]);
  const dialLength = dialNotes.reduce((m, n) => Math.max(m, n.startUnits + n.durationUnits), 0);
  const dialName = DIAL.find((d) => d.angle === dialAngle)?.name ?? "";
  const reciprocal = DIAL.find((d) => d.angle === reciprocalPosition(dialAngle))?.name ?? "";
  const combos = patternCombinations();

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Theory of Composition (Book XI)</h3>
      <p className="schillinger__hint">
        A thematic unit grows from one major component (rhythm, scale, melody, harmony, melodization,
        counterpoint, density or instrumental resources), with the others as minor components. Thematic
        continuity is planned from the whole: the form of thematic sequence, its temporal coefficients, the
        subjects and their expositions, then key-axes, climaxes and instrumentation.
      </p>

      <h4>Thematic sequence and temporal coordination (Ch. 11-13)</h4>
      <p className="schillinger__hint">
        Four groups of sequence: direct, symmetric, and modified recurrence (circular permutations), and
        progressive symmetry. Here subjects enter in growing groups and leave in shrinking ones, "like the
        interpolation of generations." A coefficient group is laid over the appearances in order; "the use of
        interference necessitates the recurrence of the entire thematic sequence" until both close. Each
        subject is its longest exposition; that one plays louder.
      </p>
      <div className="schillinger__row">
        <label>
          Subjects
          <select value={subjects} onChange={(e) => { setSubjects(Number(e.target.value)); setVariant(0); }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Group
          <select value={group} onChange={(e) => setGroup(Number(e.target.value) as SequenceGroup)}>
            {([1, 2, 3, 4] as SequenceGroup[]).map((g) => (
              <option key={g} value={g}>
                {g}: {SEQUENCE_GROUPS[g]}
              </option>
            ))}
          </select>
        </label>
        {group === 4 && PROGRESSIVE_SIZES[subjects].length > 1 && (
          <label>
            Form
            <select value={variant} onChange={(e) => setVariant(Number(e.target.value))}>
              {PROGRESSIVE_SIZES[subjects].map((sizes, i) => (
                <option key={i} value={i}>
                  {sizes.join("+")}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Temporal coefficients
          <select value={coefficientIndex} onChange={(e) => setCoefficientIndex(Number(e.target.value))}>
            {COEFFICIENT_GROUPS.map((g, i) => (
              <option key={g.label} value={i}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {sequence.map((g) => (g.length > 1 ? `(${g.join("+")})` : g[0])).join(" + ")} × {coefficients.join("+")}
        <br />
        {appearances.map((a) => `${a.subject}${a.exposition}·${a.coefficient}T`).join(" + ")}
        <br />
        Subjects (longest exposition): {Object.entries(maximal).map(([s, e]) => `${s}${e}`).join(", ")} · totals{" "}
        {Object.entries(totals).map(([s, v]) => `${s} ${v}T`).join(", ")}
      </div>
      <NotePlayback notes={sequenceNotes} lengthUnits={sequenceLength * 2} fileName="schillinger-thematic-sequence.mid" defaultBpm={200} />

      <h4>Planning a composition (Ch. 14, 16)</h4>
      <p className="schillinger__hint">
        The book's polythematic miniature uses progressive symmetry of three subjects. A grows 4 + 8 + 16
        T″, B stays at its maximum of 14 T″, and C declines 16 + 8 + 4: 28 + 42 + 28 = 98 T″ in the ratio
        2 : 3 : 2. One T″ is 2 seconds (16t at t = ⅛ s), with t′ = t for A, 4t for B and 2t for C, so A is
        the most eventful. That gives 196 seconds, "3 minutes, 16 seconds." The book prints the sum as
        "96·2 = 196", but its own total is 98. Key-axes C–E–G–E–C change with each term, and the dynamics
        make A and C reciprocate while B balances. Below, the climaxes of a ratio fall where its terms meet.
      </p>
      <div className="schillinger__row">
        <label>
          Climax ratio
          <input type="text" value={climaxRatio} onChange={(e) => setClimaxRatio(e.target.value)} />
        </label>
      </div>
      <div className="schillinger__readout">
        {miniature.rows.join(" · ")}
        <br />
        Climaxes of {climaxTerms.join("+") || "—"}: {climaxPositions(climaxTerms).map(fraction).join(", ") || "none"} of the whole
      </div>
      <NotePlayback notes={miniature.notes} lengthUnits={miniature.length} fileName="schillinger-polythematic.mid" defaultBpm={240} />

      <h4>Harmony rhythmized by reciprocating binomials (Ch. 5)</h4>
      <p className="schillinger__hint">
        A duration-group of reciprocating binomials, such as a resultant whose generators are a unit apart, is
        given to each part in its own circular permutation; the balanced binomial goes to the bass. Every
        chord in an odd place falls on all parts together; between, a binomial with the longer term first
        suspends into the next chord and the shorter first anticipates it (Figure 19).
      </p>
      <div className="schillinger__row">
        <label>
          Source
          <select value={binomialSource} onChange={(e) => setBinomialSource(Number(e.target.value))}>
            {[3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                r{n}÷{n - 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {binomialGroup.join("+")}: {binomialInfo.reciprocating ? "reciprocating" : "not reciprocating"}
        {binomialInfo.balanced.length > 0 && `, balanced ${binomialInfo.balanced[0].join("+")}`}
        <br />
        {["S", "A", "T", "B"].map((v, i) => `${v} ${(parts[i] ?? []).map((b) => `(${b.join("+")})`).join("")}`).join(" · ")}
        <br />
        {(parts[0] ?? []).map((b) => `${b.join("+")} ${binomialEffect(b)}`).join(", ")}
      </div>
      <NotePlayback notes={binomialNotes} lengthUnits={(parts[0]?.length ?? 0) * binomialSource} fileName="schillinger-binomial-harmony.mid" defaultBpm={180} />

      <h4>Scales of instrumental resources (Ch. 9)</h4>
      <p className="schillinger__hint">
        Five degrees each of dynamics (pp p mf f ff), tone-quality (open, single-reed, stopped,
        double-reed, muted) and attack (legatissimo to staccatissimo). That gives {resourceScales(1).all.length}{" "}
        one-unit, {resourceScales(2).all.length} two-unit, {resourceScales(3).all.length} three-unit and 1 five-unit
        scales; four-unit scales are left out. The best are symmetric: vI + vV, vII + vIV; vI + vIII + vV,
        vII + vIII + vIV. Below, a phrase plays once per degree of the chosen scale.
      </p>
      <div className="schillinger__row">
        <label>
          Resource
          <select value={resource} onChange={(e) => setResource(e.target.value as typeof resource)}>
            <option value="dynamics">Dynamics (V)</option>
            <option value="attacks">Attacks (A)</option>
            <option value="quality">Tone-quality (Q, listed only)</option>
          </select>
        </label>
        <label>
          Units
          <select value={scaleUnits} onChange={(e) => { setScaleUnits(Number(e.target.value) as 1 | 2 | 3 | 5); setScaleIndex(0); }}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scale
          <select value={Math.min(scaleIndex, scales.all.length - 1)} onChange={(e) => setScaleIndex(Number(e.target.value))}>
            {scales.all.map((s, i) => (
              <option key={s.join()} value={i}>
                {s.map((d) => degreeNames[d - 1]).join(" + ")}
                {scales.symmetric.some((x) => x.join() === s.join()) && scaleUnits > 1 ? " (symmetric)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <NotePlayback notes={resourceNotes} lengthUnits={chosenScale.length * 4} fileName="schillinger-resource-scale.mid" defaultBpm={140} />

      <h4>Semantic composition: the psychological dial (Ch. 17-19)</h4>
      <p className="schillinger__hint">
        Responses run around a dial: normal at 180°, with the negative zone (decline, defense) to the left and
        the positive (growth, aggression) to the right, out to the abnormal at 0°/360°. Reciprocal patterns
        mirror across the vertical axis. The negative zone's scales and chords put the smaller intervals below
        (1 + 2, 3 + 3 + 5); the positive zone's put them above (4 + 3, 3 + 1). Durations lengthen with loss of
        momentum and shorten with gain. The lower quadrants magnify or hasten time, like a record re-dubbed to
        about ⅕ or 2⅓ of its speed. Eight patterns give {combos.byCount.join(" + ")} = {combos.total}{" "}
        combinations ({combos.total - 1} without all eight, as the book counts first).
      </p>
      <div className="schillinger__row">
        <label>
          Position
          <select value={dialAngle} onChange={(e) => setDialAngle(Number(e.target.value))} disabled={modulate}>
            {DIAL.map((d) => (
              <option key={d.angle} value={d.angle}>
                {d.angle}° {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Listener's own balance
          <input type="number" min={0} max={360} step={15} value={individualNormal} onChange={(e) => setIndividualNormal(Number(e.target.value) || 0)} />°
        </label>
        <label>
          <input type="checkbox" checked={modulate} onChange={(e) => setModulate(e.target.checked)} />
          Modulate a → b by r5÷4 (4a + b + 3a + 2b + 2a + 3b + a + 4b)
        </label>
      </div>
      <div className="schillinger__readout">
        {modulate
          ? `a: ${names(cellScale([4, 3], 4))} (${gravity([4, 3])} gravity) giving way to b: ${names(cellScale([1, 2], 4).map((p) => 12 - p))} (${gravity([1, 2])} gravity)`
          : `${dialAngle}° ${dialName}: ${zoneOf(dialAngle)} zone, reciprocal ${reciprocal}`}
        <br />A listener balanced at {individualNormal}° needs a {stimulusFor(individualNormal)}° stimulus to reach normal.
      </div>
      <NotePlayback notes={dialNotes} lengthUnits={Math.ceil(dialLength)} fileName="schillinger-sonic-symbol.mid" defaultBpm={100} />
    </section>
  );
}
