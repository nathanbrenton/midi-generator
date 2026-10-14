import { useMemo, useState } from "react";
import { harmonize, placements, chordsForNote, triadPlacements, assignmentCount, HARMONIZATION_FORMS } from "../core/harmonization";
import { SIGMA_13 } from "../core/masterStructures";
import { stackedTriad } from "../core/diatonicHarmony";
import { intervalCellScale, midiNoteForDegree } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const LETTERS = "cdefgab";
const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const GROUPINGS = {
  "1": [1],
  "2": [2],
  "3": [3],
  "4": [4],
  "6": [6],
  "12": [12],
  "r4÷3": [3, 1, 2, 2, 1, 3],
} as const;
type Grouping = keyof typeof GROUPINGS;

function parsePitch(token: string): number | null {
  const m = token.trim().toLowerCase().match(/^([a-g])(#|b|♯|♭)?$/);
  if (!m) return null;
  return (PC[m[1]] + (m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0) + 12) % 12;
}

export default function HarmonizationPanel() {
  // Section A.
  const [melodyText, setMelodyText] = useState("e d c b a g f e d c b c");
  const [grouping, setGrouping] = useState<Grouping>("2");
  const [low, setLow] = useState(3);
  const degrees = useMemo(
    () => melodyText.trim().toLowerCase().split(/\s+/).map((t) => LETTERS.indexOf(t)).filter((d) => d >= 0),
    [melodyText],
  );
  const groups = useMemo(() => {
    const pattern = GROUPINGS[grouping];
    const out: number[] = [];
    let total = 0;
    for (let k = 0; total < degrees.length; k++) {
      const size = pattern[k % pattern.length];
      out.push(size);
      total += size;
    }
    return out;
  }, [grouping, degrees]);
  const harmony = useMemo(() => (degrees.length ? harmonize(degrees, groups, [low, 13]) : null), [degrees, groups, low]);
  const notes = useMemo<NoteEvent[]>(() => {
    if (!harmony) return [];
    const out: NoteEvent[] = [];
    let t = 0;
    harmony.forEach((chord, k) => {
      const size = groups[k];
      stackedTriad(MAJOR, 48, chord.rootDegree).forEach((midiNote, voice) =>
        out.push({ midiNote: midiNote - (midiNote > 59 ? 12 : 0), startUnits: t, durationUnits: size - 0.05, velocity: 65, voice }),
      );
      degrees.slice(t, t + size).forEach((d, i) =>
        out.push({ midiNote: midiNoteForDegree(MAJOR, 72, d - (d > 4 ? 7 : 0)), startUnits: t + i, durationUnits: 0.95, velocity: 100, voice: 3 }),
      );
      t += size;
    });
    return out;
  }, [harmony, groups, degrees]);

  // Section C.
  const [sigmaIndex, setSigmaIndex] = useState(12);
  const [formText, setFormText] = useState("c eb bb");
  const [note, setNote] = useState(0);
  const sigma = SIGMA_13[sigmaIndex];
  const form = useMemo(() => formText.split(/\s+/).map(parsePitch), [formText]);
  const fits = useMemo(() => (form.every((p) => p !== null) ? placements(sigma, form as number[]) : null), [sigma, form]);
  const counts = assignmentCount(7);
  // Heard: the Σ arpeggiated from 1 to 13, then held under the melodic form at its first placement.
  const sigmaNotes = useMemo<NoteEvent[]>(() => {
    const out: NoteEvent[] = sigma.offsets.map((o, i) => ({ midiNote: 48 + o, startUnits: i * 0.5, durationUnits: 0.45, velocity: 80, voice: i }));
    const start = sigma.offsets.length * 0.5;
    const placement = fits?.[0];
    const length = Math.max(placement?.length ?? 0, 3);
    sigma.offsets.forEach((o, i) => out.push({ midiNote: 48 + o, startUnits: start, durationUnits: length - 0.1, velocity: 60, voice: i }));
    let prev = 72;
    placement?.forEach((fn, k) => {
      const pc = sigma.offsets[[1, 3, 5, 7, 9, 11, 13].indexOf(fn)] % 12;
      const pitch = [60, 72, 84].map((b) => b + pc).reduce((best, x) => (Math.abs(x - prev) < Math.abs(best - prev) ? x : best));
      prev = pitch;
      out.push({ midiNote: pitch, startUnits: start + k, durationUnits: 0.95, velocity: 100, voice: 8 });
    });
    return out;
  }, [sigma, fits]);
  const sigmaLength = sigma.offsets.length * 0.5 + Math.max(fits?.[0]?.length ?? 0, 3);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Harmonization of Melody (Book VI, Ch. 3)</h3>
      <p className="schillinger__hint">
        Melodization reversed, in nine forms: {HARMONIZATION_FORMS.map((f) => `${f.harmony} harmonization of a ${f.melody} melody`).join("; ")}.
        A diatonic melody takes two decisions: "the number of attacks of melody to be harmonized by one
        chord" and "the range of tension." Each group of tones becomes functions of one root — "13-7-1-9"
        over C — and "we will give preference to those forming a positive cycle of roots" (p.666-671).
      </p>
      <div className="schillinger__row">
        <label>
          Melody (letters)
          <input type="text" value={melodyText} onChange={(e) => setMelodyText(e.target.value)} />
        </label>
        <label>
          Tones per chord
          <select value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)}>
            {(Object.keys(GROUPINGS) as Grouping[]).map((g) => (
              <option key={g} value={g}>
                M/H = {g}
              </option>
            ))}
          </select>
        </label>
        <label>
          Range of tension from
          <select value={low} onChange={(e) => setLow(Number(e.target.value))}>
            {[1, 3, 5, 7].map((f) => (
              <option key={f} value={f}>
                {f} to 13
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {harmony
          ? harmony
              .map((c, k) => {
                const start = groups.slice(0, k).reduce((a, b) => a + b, 0);
                return `${LETTERS[c.rootDegree].toUpperCase()}: ${degrees.slice(start, start + groups[k]).map((d) => LETTERS[d]).join(" ")} = ${c.functions.join("-")}`;
              })
              .join(" · ")
          : "Some group has no root with every tone inside that range of tension."}
      </div>
      <NotePlayback notes={notes} lengthUnits={degrees.length} fileName="schillinger-harmonization.mid" />

      <h4>Symmetric harmonization through a master-structure (Sections C-D)</h4>
      <p className="schillinger__hint">
        "A preselected Σ(13) implies a definite harmonic style." Each melodic form is placed where its
        intervals fit the Σ: with XIII, "c - e♭ - b♭ may be placed... as 3-5-9 or 13-1-5. No other location
        of this melodic form is possible" — the search also finds 11-13-3 (f♯-a-e), which the book
        overlooks. The first method reads a sectional scale's tones as each of the Σ's seven consecutive
        triples: {counts.constant} + {counts.twoEqual} + {counts.variable} = {counts.total} harmonizations of three groups.
      </p>
      <div className="schillinger__row">
        <label>
          Σ(13)
          <select value={sigmaIndex} onChange={(e) => setSigmaIndex(Number(e.target.value))}>
            {SIGMA_13.map((s, i) => (
              <option key={s.roman} value={i}>
                {s.roman}: {s.spelled}
              </option>
            ))}
          </select>
        </label>
        <label>
          Melodic form
          <input type="text" value={formText} onChange={(e) => setFormText(e.target.value)} />
        </label>
        <label>
          A note
          <select value={note} onChange={(e) => setNote(Number(e.target.value))}>
            {NAMES.map((n, pc) => (
              <option key={pc} value={pc}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {fits === null ? "Write pitch names such as c eb bb." : fits.length ? `Fits as ${fits.map((p) => p.join("-")).join(", ")}` : "Does not fit this Σ."}
        <br />
        {NAMES[note]} is satisfied by {chordsForNote(sigma, note).map((c) => `${NAMES[c.root]} (${c.function})`).join(", ")}
        <br />
        Minor triads in this Σ: {triadPlacements(sigma, [3, 4]).map((p) => p.join("-")).join(", ") || "none"}; major:{" "}
        {triadPlacements(sigma, [4, 3]).map((p) => p.join("-")).join(", ") || "none"}
        <br />
        Heard: the Σ from 1 to 13, then held under the melodic form{fits?.length ? ` at ${fits[0].join("-")}` : " (it does not fit this Σ, so the Σ alone)"}
      </div>
      <NotePlayback notes={sigmaNotes} lengthUnits={sigmaLength} fileName="schillinger-master-structure.mid" defaultBpm={90} />
    </section>
  );
}
