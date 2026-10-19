import { useMemo, useState } from "react";
import {
  INSTRUMENTS,
  instrument,
  sounding,
  pythagoreanStrings,
  harmonicNodes,
  harmonicPitch,
  contactDeviation,
  artificialHarmonic,
  harmonicsGlissando,
  valveCombinations,
  hornNaturalTones,
  tromboneNotes,
  tromboneSpan,
  harpPedals,
  HAMMOND_DRAWBARS,
  RANGE_TABLE,
  TIMBRAL_SIMILARITY,
  ATTACK_FORMS,
  NATURAL_TONE_SEMITONES,
} from "../core/orchestration";
import { SIGMA_13, sigmaScale } from "../core/masterStructures";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const NAMES = ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const nm = (p: number) => `${NAMES[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}`;
const LETTERS = ["c", "d", "e", "f", "g", "a", "b"];
const ordinal = (n: number) => `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const CONTACT_POINTS: [string, number][] = [["2/1", 2], ["3/2", 3 / 2], ["4/3", 4 / 3], ["16/9", 16 / 9], ["5/4", 5 / 4], ["25/16", 25 / 16], ["8/5", 8 / 5], ["12/5", 12 / 5]];
const ACCIDENTAL = { "-1": "♭", "0": "♮", "1": "♯" } as Record<string, string>;
const C_MAJOR_WRITTEN = [60, 62, 64, 65, 67, 69, 71, 72];
const line = (pitches: readonly number[], step: number, velocity = 85, voice = 0): NoteEvent[] =>
  pitches.map((midiNote, i) => ({ midiNote, startUnits: i * step, durationUnits: step * 0.9, velocity, voice }));

const HARP_SCALES: { label: string; pcs: number[] }[] = [
  { label: "C major", pcs: [0, 2, 4, 5, 7, 9, 11] },
  { label: "C harmonic minor", pcs: [0, 2, 3, 5, 7, 8, 11] },
  { label: "C double-harmonic", pcs: [0, 1, 4, 5, 7, 8, 11] },
  ...SIGMA_13.map((s) => ({ label: `Σ(13) ${s.roman}: ${s.spelled}`, pcs: sigmaScale(s) })),
];

export default function OrchestrationPanel() {
  // Instruments and transposition.
  const [instName, setInstName] = useState("clarinet in Bb");
  const inst = instrument(instName);
  const writtenLine = useMemo(() => {
    if (!inst.written) return C_MAJOR_WRITTEN;
    const [lo, hi] = inst.written;
    const out: number[] = [];
    for (let p = lo; p <= hi; p += 2) out.push(p);
    return out;
  }, [inst]);
  const instNotes = useMemo(() => line(writtenLine.map((p) => sounding(inst, p)), 0.5), [writtenLine, inst]);

  // String harmonics.
  const [stringInst, setStringInst] = useState("'cello");
  const [stringIndex, setStringIndex] = useState(1);
  const [harmonicMode, setHarmonicMode] = useState<"series" | "glissando" | "artificial">("series");
  const open = instrument(stringInst).strings![stringIndex];
  const harmonicNotes = useMemo<NoteEvent[]>(() => {
    if (harmonicMode === "series") return [open, ...[2, 3, 4, 5, 6, 8].map((n) => harmonicPitch(open, n))].flatMap((p, i) => line([p], 1, i === 0 ? 70 : 90).map((n) => ({ ...n, startUnits: i })));
    if (harmonicMode === "glissando") return line([...harmonicsGlissando(open, 8), ...harmonicsGlissando(open, 8).reverse().slice(1)], 0.25);
    // A melody pressed a step at a time on this string, each touched a fourth above: two octaves up.
    return line([0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => artificialHarmonic(open + d).sounds), 0.75);
  }, [open, harmonicMode]);

  // Brass.
  const [brass, setBrass] = useState<"horn" | "trumpet" | "trombone" | "trombone-valve">("trombone");
  const brassData = useMemo(() => {
    if (brass === "horn") {
      const tones = hornNaturalTones();
      return { notes: line(tones.map((t) => t.sounds), 0.75), text: tones.map((t) => `${t.tone}: ${nm(t.written)}→${nm(t.sounds)}`).join(" · ") };
    }
    if (brass === "trumpet") {
      // Each natural tone of the Bb trumpet (written in C) lowered through the valve combinations, down to the tone below.
      const tones = [2, 3, 4, 5, 6, 8];
      const pitches: number[] = [];
      for (const t of tones) for (const lower of [6, 5, 4, 3, 2, 1, 0]) pitches.push(48 + NATURAL_TONE_SEMITONES[t] - lower - 2);
      const unique = [...new Set(pitches)].sort((a, b) => a - b);
      return { notes: line(unique, 0.3), text: `sounding ${nm(unique[0])} to ${nm(unique[unique.length - 1])}; ${valveCombinations().map((c) => `${c.valves.join("+")} = −${c.lowers}`).join(", ")}` };
    }
    const withValve = brass === "trombone-valve";
    const span = tromboneSpan(withValve);
    const available = new Set(tromboneNotes(withValve).map((n) => n.pitch));
    const notes: NoteEvent[] = [];
    // The chromatic scale from the lowest pedal tone up two octaves: missing pitches fall silent.
    for (let p = 31, i = 0; p <= 31 + 26; p++, i++) if (available.has(p)) notes.push({ midiNote: p, startUnits: i * 0.4, durationUnits: 0.36, velocity: 90, voice: 0 });
    return { notes, text: `${span.pedal} + (−${span.gap.length} gap: ${span.gap.map(nm).join(" ")}) + ${span.continuous}` };
  }, [brass]);

  // Harp.
  const [harpIndex, setHarpIndex] = useState(0);
  const harpScale = HARP_SCALES[harpIndex];
  const pedals = harpPedals(harpScale.pcs);
  const harpNotes = useMemo<NoteEvent[]>(() => {
    const sorted = [...harpScale.pcs].sort((a, b) => a - b);
    const up = [0, 1, 2].flatMap((o) => sorted.map((p) => 48 + p + 12 * o));
    return line([...up, ...up.slice(0, -1).reverse()], 0.125, 80);
  }, [harpScale]);

  // Hammond levers.
  const [levers, setLevers] = useState<boolean[]>([false, false, true, true, true, false, false, false, false]);
  const hammondNotes = useMemo<NoteEvent[]>(() => {
    const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]];
    return chords.flatMap((chord, k) =>
      chord.flatMap((root) =>
        HAMMOND_DRAWBARS.filter((_, i) => levers[i]).map((d, i) => ({
          midiNote: root + Math.round((1200 * Math.log2(d.ratio)) / 100),
          startUnits: k * 2,
          durationUnits: 1.9,
          velocity: Math.max(40, 80 - i * 6),
          voice: i,
        })),
      ),
    );
  }, [levers]);

  // Ch.8: ranges of the string group, played in turn.
  const rangeNotes = useMemo<NoteEvent[]>(() => {
    let t = 0;
    return ["violin", "viola", "'cello", "double-bass"].flatMap((name) => {
      const i = instrument(name);
      const [lo, hi] = i.written!;
      const pitches: number[] = [];
      for (let p = lo; p <= hi; p += 3) pitches.push(sounding(i, p));
      const notes = line(pitches, 0.25).map((n) => ({ ...n, startUnits: n.startUnits + t }));
      t += pitches.length * 0.25 + 1;
      return notes;
    });
  }, []);
  const rangeLength = rangeNotes.reduce((m, n) => Math.max(m, n.startUnits + 1), 0);

  const pyth = pythagoreanStrings();

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Theory of Orchestration (Book XII)</h3>
      <p className="schillinger__hint">
        The last book surveys the instruments, then turns to combination and to an "Acoustical Basis of
        Orchestration" that the editors cut short. Everything here is checked against the rendered figures:
        tunings, positions, harmonics, transpositions, valves and slide positions, harp pedals, organ
        registers, and the semitone tables of Chapter 8.
      </p>

      <h4>Instruments and transposition (Ch. 1-6)</h4>
      <p className="schillinger__hint">
        Written pitch plus the transposition gives the sound. The clarinet in B♭ is a tone lower, the horn in F
        and the English horn a fifth, the double-bass an octave, and the orchestra bells two octaves higher.
        Where the book's figures fix the range, it plays as written, sounding.
      </p>
      <div className="schillinger__row">
        <label>
          Instrument
          <select value={instName} onChange={(e) => setInstName(e.target.value)}>
            {INSTRUMENTS.map((i) => (
              <option key={i.name} value={i.name}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {inst.name}: sounds {inst.transposition === 0 ? "as written" : `${Math.abs(inst.transposition)} semitones ${inst.transposition > 0 ? "higher" : "lower"}`}
        {inst.written
          ? ` · written ${nm(inst.written[0])}–${nm(inst.written[1])} (${inst.written[1] - inst.written[0]} semitones), sounding ${nm(sounding(inst, inst.written[0]))}–${nm(sounding(inst, inst.written[1]))}`
          : ` · written c4–c5 sounds ${nm(sounding(inst, 60))}–${nm(sounding(inst, 72))}`}
      </div>
      <NotePlayback notes={instNotes} lengthUnits={writtenLine.length * 0.5} fileName="schillinger-instrument-range.mid" defaultBpm={160} />

      <h4>String harmonics (Ch. 1)</h4>
      <p className="schillinger__hint">
        Tuned in pure fifths from a, the violin's e, d and g lie {pyth.filter((s) => s.name !== "a").map((s) => `${s.name} ${s.deviation > 0 ? "+" : ""}${s.deviation.toFixed(1)}¢`).join(", ")}{" "}
        from equal temperament. The nth harmonic divides the string into n parts, and "every node in the same
        subdivision produces identical harmonics." The "artificial" harmonic presses with the first finger
        and touches a fourth above, two octaves up. The glissando runs from the nut to the middle node and back:
        "a rapidly moving arpeggio of a large seventh-chord."
      </p>
      <div className="schillinger__row">
        <label>
          Instrument
          <select value={stringInst} onChange={(e) => { setStringInst(e.target.value); setStringIndex(0); }}>
            {["violin", "viola", "'cello", "double-bass"].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          String
          <select value={stringIndex} onChange={(e) => setStringIndex(Number(e.target.value))}>
            {instrument(stringInst).strings!.map((s, i) => (
              <option key={s} value={i}>
                {nm(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Play
          <select value={harmonicMode} onChange={(e) => setHarmonicMode(e.target.value as typeof harmonicMode)}>
            <option value="series">Natural harmonics 2-8</option>
            <option value="glissando">Harmonics glissando</option>
            <option value="artificial">Artificial harmonics melody</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {[2, 3, 4, 5, 6].map((n) => `${ordinal(n)} at ${harmonicNodes(n).map((x) => `${Math.round(x * n)}/${n}`).join(", ")} → ${nm(harmonicPitch(open, n))}`).join(" · ")}
        <br />
        Contact points: {CONTACT_POINTS.map(([label, r]) => `${label} ${contactDeviation(r).verdict} (${contactDeviation(r).cents.toFixed(0)}¢)`).join(", ")}
      </div>
      <NotePlayback notes={harmonicNotes} lengthUnits={harmonicNotes.reduce((m, n) => Math.max(m, n.startUnits + n.durationUnits), 0) + 0.5} fileName="schillinger-harmonics.mid" defaultBpm={120} />

      <h4>Brass: natural tones, valves, slide (Ch. 3)</h4>
      <p className="schillinger__hint">
        Valves lower a natural tone by 2, 1 and 3 semitones, or 3, 5, 4 and 6 together. The trombone's seven
        positions each lower the series a semitone, but from the fifth position the fundamental fails, leaving a
        gap below the seventh position's second tone. The F-valve fills all of it but b1. Missing pitches play
        as silence.
      </p>
      <div className="schillinger__row">
        <label>
          Instrument
          <select value={brass} onChange={(e) => setBrass(e.target.value as typeof brass)}>
            <option value="horn">Horn in F: natural tones</option>
            <option value="trumpet">Trumpet in B♭: valves through the series</option>
            <option value="trombone">Trombone (slide only)</option>
            <option value="trombone-valve">Trombone with F-valve</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">{brassData.text}</div>
      <NotePlayback notes={brassData.notes} lengthUnits={brassData.notes.reduce((m, n) => Math.max(m, n.startUnits + n.durationUnits), 0) + 0.5} fileName="schillinger-brass.mid" defaultBpm={140} />

      <h4>Harp pedals (Ch. 4)</h4>
      <p className="schillinger__hint">
        Seven strings an octave, one per letter, each pedal flat, natural or sharp. The book says all 36 Σ(13)
        can be set because none has an interval over 4 semitones (the largest is 3), but that condition isn't
        enough. Σ XXX (c e♭ e g a♭ b♭ b) cannot be set: g must take g, a♭ falls to a, b♭ to b, b to c, and c
        has no string left.
      </p>
      <div className="schillinger__row">
        <label>
          Scale
          <select value={harpIndex} onChange={(e) => setHarpIndex(Number(e.target.value))}>
            {HARP_SCALES.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {pedals ? `Pedals: ${pedals.map((a, i) => `${LETTERS[i]}${ACCIDENTAL[String(a)]}`).join(" ")}` : "Cannot be set: no string is left for one of its tones."}
      </div>
      <NotePlayback notes={harpNotes} lengthUnits={harpNotes.length * 0.125 + 0.5} fileName="schillinger-harp.mid" defaultBpm={100} />

      <h4>Organ registers and Hammond levers (Ch. 4-5)</h4>
      <p className="schillinger__hint">
        A stop sounds by its pipe-length: 4′ an octave above 8′, 16′ an octave below, 2⅔′ a twelfth above. The
        Hammond's levers are the sub-fundamental, the sub-third harmonic and harmonics 1-6 and 8, tempered.
        Choose levers and hear a progression built from those partials.
      </p>
      <div className="schillinger__row">
        {HAMMOND_DRAWBARS.map((d, i) => (
          <label key={d.label}>
            <input type="checkbox" checked={levers[i]} onChange={(e) => setLevers(levers.map((v, j) => (j === i ? e.target.checked : v)))} />
            {d.feet} {d.label}
          </label>
        ))}
      </div>
      <NotePlayback notes={hammondNotes} lengthUnits={8} fileName="schillinger-hammond.mid" defaultBpm={90} />

      <h4>Instrumental combination (Ch. 8)</h4>
      <p className="schillinger__hint">
        The book measures ranges in semitones to show how little they correspond. Its string table, violins{" "}
        {RANGE_TABLE.strings.violins.orchestra}, violas {RANGE_TABLE.strings.violas.orchestra}, 'cellos{" "}
        {RANGE_TABLE.strings.cellos.orchestra}, basses {RANGE_TABLE.strings.basses.orchestra}, matches its own figures
        except the viola, whose figure and text give 40 (and 45 solo, against the table's 40), and the 'cello
        solo (45, not 47). The trombone's spans come out exactly from the slide model. Blending scales: woodwinds{" "}
        {TIMBRAL_SIMILARITY.woodwind.join(" > ")}; brass {TIMBRAL_SIMILARITY.brass.join(" > ")}. Attack-forms:
        trumpets {ATTACK_FORMS.trumpets.join(", ")}; the strings answer each with more than one bowing. Below,
        the four string ranges play in turn, as figured.
      </p>
      <NotePlayback notes={rangeNotes} lengthUnits={rangeLength} fileName="schillinger-string-ranges.mid" defaultBpm={180} />
    </section>
  );
}
