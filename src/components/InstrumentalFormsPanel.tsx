import { useMemo, useState } from "react";
import { attackFormCounts, distributions, coefficientSplits, splitSequences, arpeggiate, strataAllowed } from "../core/instrumentalForms";
import { diatonicCycle, S5_POSITIONS, voiceLeadProgression } from "../core/diatonicHarmony";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const ATTACKS = [2, 3, 4, 5, 6, 7, 8, 12];

export default function InstrumentalFormsPanel() {
  const [parts, setParts] = useState<2 | 3 | 4>(3);
  const [attacks, setAttacks] = useState(4);
  const [splitIndex, setSplitIndex] = useState(0);
  const [circular, setCircular] = useState(true);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [doubled, setDoubled] = useState(false);

  const counts = attackFormCounts(attacks, parts);
  const table = useMemo(() => distributions(attacks, parts), [attacks, parts]);
  const splits = useMemo(() => coefficientSplits(attacks, parts), [attacks, parts]);
  const split = splits[Math.min(splitIndex, splits.length - 1)] ?? [];
  const sequences = useMemo(() => (split.length ? splitSequences(split, circular) : []), [split, circular]);
  const sequence = sequences[Math.min(sequenceIndex, sequences.length - 1)] ?? "";

  // The theme: four chords through C5, each broken by the chosen sequence; the parts a, b, c, d from the bottom.
  const notes = useMemo<NoteEvent[]>(() => {
    if (!sequence) return [];
    const roots = [0, ...diatonicCycle(5).slice(1, 3), 0];
    const chords = voiceLeadProgression(MAJOR, 60, roots, "clockwise", S5_POSITIONS.close[1]).map((v) => {
      const upper = [v.root, v.third, v.fifth].sort((x, y) => x - y);
      return parts === 2 ? [upper[0], upper[2]] : parts === 3 ? upper : [v.bass + 12, ...upper];
    });
    const unit = 4 / attacks;
    return chords.flatMap((chord, k) => {
      const broken = arpeggiate(chord, [...sequence], unit).map((n) => ({ ...n, startUnits: n.startUnits + 4 * k, velocity: 88, voice: 0 }));
      // Octave duplication in an identical position, one stratum above (Ch.6).
      return doubled ? [...broken, ...broken.map((n) => ({ ...n, midiNote: n.midiNote + 12, voice: 1, velocity: 70 }))] : broken;
    });
  }, [sequence, parts, attacks, doubled]);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Instrumental Forms (Book VIII)</h3>
      <p className="schillinger__hint">
        "Multiplication of attacks" — every form of arpeggio. A attacks shared among the parts a, b, c, d of
        a stratum, each part used at least once: every split into coefficients (2a + b + c …) has A!/(k₁!k₂!…)
        general permutations or A circular ones. Summed, the general forms are every assignment of A attacks
        to the parts that uses them all, and the circular forms A·C(A−1, parts−1). The book's tables agree
        throughout except four of its own sums: for three parts and 12 attacks it prints 443,312 (two
        products are wrong; the count is 519,156), and for four parts 14,646,024 and 1960 where its own
        summands add to 14,676,024 and 1980.
      </p>
      <div className="schillinger__row">
        <label>
          Parts
          <select value={parts} onChange={(e) => { setParts(Number(e.target.value) as 2 | 3 | 4); setSplitIndex(0); setSequenceIndex(0); }}>
            <option value={2}>S = 2p</option>
            <option value={3}>S = 3p</option>
            <option value={4}>S = 4p</option>
          </select>
        </label>
        <label>
          Attacks
          <select value={attacks} onChange={(e) => { setAttacks(Number(e.target.value)); setSplitIndex(0); setSequenceIndex(0); }}>
            {ATTACKS.filter((a) => a >= parts).map((a) => (
              <option key={a} value={a}>
                A = {a}a
              </option>
            ))}
          </select>
        </label>
        <label>
          Coefficients
          <select value={splitIndex} onChange={(e) => { setSplitIndex(Number(e.target.value)); setSequenceIndex(0); }}>
            {splits.slice(0, 300).map((s, i) => (
              <option key={s.join()} value={i}>
                {s.map((k, j) => `${k === 1 ? "" : k}${"abcd"[j]}`).join(" + ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={circular} onChange={(e) => { setCircular(e.target.checked); setSequenceIndex(0); }} />
          Circular only
        </label>
        <label>
          Form
          <select value={Math.min(sequenceIndex, sequences.length - 1)} onChange={(e) => setSequenceIndex(Number(e.target.value))}>
            {sequences.slice(0, 500).map((s, i) => (
              <option key={s} value={i}>
                {i + 1}: {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={doubled} onChange={(e) => setDoubled(e.target.checked)} />
          Double an octave above (identical positions)
        </label>
      </div>
      <div className="schillinger__readout">
        A = {attacks}a over {parts} parts: {counts.general.toLocaleString()} general, {counts.circular.toLocaleString()} circular
        forms — {table.map((d) => `${d.form.join("+")}: ${d.general.toLocaleString()}`).join(" · ")}
        <br />
        Playing {sequence} on C, F, B°, C ({sequences.length.toLocaleString()} forms of these coefficients)
        <br />
        Strata from the bottom: open under close {strataAllowed(["open", "close"]) ? "allowed" : "not allowed"}; close under open{" "}
        {strataAllowed(["close", "open"]) ? "allowed" : "never"} ("there must never be an open position above a close").
      </div>
      <NotePlayback notes={notes} lengthUnits={16} fileName="schillinger-instrumental-form.mid" defaultBpm={90} />
    </section>
  );
}
