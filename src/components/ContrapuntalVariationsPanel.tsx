import { useMemo, useState } from "react";
import { contrapuntalVariationCount, entrancePlan, partOrders, soundingVoices } from "../core/contrapuntalVariations";
import { diatonicCycle, voiceLeadProgression } from "../core/diatonicHarmony";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const PARTS = ["S", "A", "T", "B"];

export default function ContrapuntalVariationsPanel() {
  const [orderIndex, setOrderIndex] = useState(0);
  const [circular, setCircular] = useState(false);
  const [attackText, setAttackText] = useState("4+3+2+2");
  const [mode, setMode] = useState<"enter" | "drop">("enter");

  const orders = useMemo(() => partOrders(PARTS, circular), [circular]);
  const order = orders[Math.min(orderIndex, orders.length - 1)];
  const attacks = useMemo(() => {
    const terms = attackText.split(/[+\s,]+/).filter(Boolean).map(Number);
    return terms.length === PARTS.length && terms.every((n) => Number.isInteger(n) && n > 0 && n <= 16) ? terms : null;
  }, [attackText]);
  const plan = useMemo(() => (attacks ? entrancePlan(order, attacks) : []), [order, attacks]);

  // The theme: as many chords as attacks, through C5, in four parts (B, T, A, S from the bottom).
  const notes = useMemo<NoteEvent[]>(() => {
    if (!attacks) return [];
    const sounding = soundingVoices(order, attacks, mode);
    const roots = sounding.map((_, k) => diatonicCycle(5)[k % 7]);
    const voicings = voiceLeadProgression(MAJOR, 60, roots, "counterclockwise");
    return voicings.flatMap((v, t) => {
      const byPart: Record<string, number> = {
        B: v.bass,
        ...Object.fromEntries(["T", "A", "S"].map((p, k) => [p, [v.root, v.third, v.fifth].sort((x, y) => x - y)[k]])),
      };
      return sounding[t].map((part) => ({ midiNote: byPart[part], startUnits: t, durationUnits: 0.9, velocity: 88, voice: PARTS.indexOf(part) }));
    });
  }, [order, attacks, mode]);
  const total = attacks ? attacks.reduce((a, b) => a + b, 0) : 0;

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Contrapuntal Variations of Harmony (Book V, Ch. 24)</h3>
      <p className="schillinger__hint">
        "When different parts of a harmonic continuity enter and drop out at different time
        intervals, the continuity acquires contrapuntal characteristics... subject to permutations":
        three parts give {contrapuntalVariationCount(3)} variations ({contrapuntalVariationCount(3, true)} by circular
        permutations), four {contrapuntalVariationCount(4)} ({contrapuntalVariationCount(4, true)}), five{" "}
        {contrapuntalVariationCount(5)} ({contrapuntalVariationCount(5, true)}). "The number of attacks for each voice may be
        rhythmically arranged": the part-sequence in one-to-one correspondence with an attack group, each
        voice playing the group from its own entrance — S, A, T, B under 4a + 3a + 2a + 2a gives "S4a +
        S3a + S2a + S2a; A3a + A2a + A2a; T2a + T2a; B2a" over an 11-chord theme (Figure 368).
      </p>
      <div className="schillinger__row">
        <label>
          <input type="checkbox" checked={circular} onChange={(e) => { setCircular(e.target.checked); setOrderIndex(0); }} />
          Circular orders only
        </label>
        <label>
          Order of entrance
          <select value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))}>
            {orders.map((o, i) => (
              <option key={o.join("")} value={i}>
                {o.join(" ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Attack group
          <input type="text" value={attackText} onChange={(e) => setAttackText(e.target.value)} />
        </label>
        <label>
          Voices
          <select value={mode} onChange={(e) => setMode(e.target.value as "enter" | "drop")}>
            <option value="enter">enter one by one</option>
            <option value="drop">drop out one by one</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {attacks
          ? plan.map((p) => `${p.voice}: ${p.attacks.map((a) => `${p.voice}${a}a`).join(" + ")}`).join("; ") + ` — ${total} chords`
          : "Write an attack group of four terms, such as 4+3+2+2."}
      </div>
      <NotePlayback notes={notes} lengthUnits={total} fileName="schillinger-contrapuntal-variation.mid" />
    </section>
  );
}
