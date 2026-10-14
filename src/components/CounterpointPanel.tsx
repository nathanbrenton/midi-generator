import { useMemo, useState } from "react";
import {
  DIATONIC_INTERVALS,
  CHROMATIC_INTERVALS,
  bySonority,
  tendencyOf,
  resolutions,
  harmonicPatterns,
  positionRelation,
  balanceForms,
  axialCombinationCounts,
  expositionCombinations,
  modalRelations,
} from "../core/counterpoint";
import { canon, canonTemporalStructure, expositionAxes, expositionForms } from "../core/canonAndFugue";
import { intervalCellScale, midiNoteForDegree } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const name = (n: number) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
const SCALES = {
  ionian: { label: "natural major", cells: [2, 2, 1, 2, 2, 2, 1] },
  aeolian: { label: "natural minor", cells: [2, 1, 2, 2, 1, 2, 2] },
  dorian: { label: "Dorian", cells: [2, 1, 2, 2, 2, 1, 2] },
} as const;
type ScaleKey = keyof typeof SCALES;
const CANON_TYPES = {
  I: { label: "I unitonal-unimodal: the octave below", follower: { scale: "ionian" as ScaleKey, tonic: 48 } },
  II: { label: "II unitonal-polymodal: a minor in the same key", follower: { scale: "aeolian" as ScaleKey, tonic: 45 } },
  III: { label: "III polytonal-unimodal: A♭ major", follower: { scale: "ionian" as ScaleKey, tonic: 44 } },
  IV: { label: "IV polytonal-polymodal: f minor", follower: { scale: "aeolian" as ScaleKey, tonic: 41 } },
} as const;
type CanonType = keyof typeof CANON_TYPES;
const LETTERS = "cdefgab";

export default function CounterpointPanel() {
  // Ch.1.
  const [interval, setIntervalSemitones] = useState(2);
  const resolved = useMemo(() => resolutions(interval), [interval]);
  const resolutionNotes = useMemo<NoteEvent[]>(
    () =>
      resolved.flatMap((r, i) => [
        { midiNote: 60, startUnits: 2 * i, durationUnits: 0.95, velocity: 85, voice: 0 },
        { midiNote: 60 + interval, startUnits: 2 * i, durationUnits: 0.95, velocity: 85, voice: 1 },
        { midiNote: 60 + r.lower, startUnits: 2 * i + 1, durationUnits: 0.95, velocity: 85, voice: 0 },
        { midiNote: 60 + interval + r.upper, startUnits: 2 * i + 1, durationUnits: 0.95, velocity: 85, voice: 1 },
      ]),
    [resolved, interval],
  );

  // Ch.2.
  const [attacks, setAttacks] = useState(3);
  const patterns = useMemo(() => harmonicPatterns(attacks), [attacks]);
  // Heard: CF holds c; CP sounds each pattern, c a consonance and d a dissonance, moving to the nearest one.
  const patternNotes = useMemo<NoteEvent[]>(() => {
    const consonant = [64, 67, 69, 72, 76];
    const dissonant = [62, 65, 71, 74, 77];
    const out: NoteEvent[] = [];
    let prev = 67;
    patterns.forEach((pattern, bar) => {
      out.push({ midiNote: 48, startUnits: 2 * bar, durationUnits: 1.95, velocity: 75, voice: 0 });
      [...pattern].forEach((x, k) => {
        const pool = (x === "c" ? consonant : dissonant).filter((p) => p !== prev);
        const pitch = pool.reduce((best, q) => (Math.abs(q - prev) < Math.abs(best - prev) ? q : best));
        prev = pitch;
        out.push({ midiNote: pitch, startUnits: 2 * bar + (2 / pattern.length) * k, durationUnits: (2 / pattern.length) * 0.9, velocity: x === "d" ? 100 : 85, voice: 1 });
      });
    });
    return out;
  }, [patterns]);

  // Ch.7.
  const [melodyText, setMelodyText] = useState("c d e c e f g e d c b c");
  const [canonType, setCanonType] = useState<CanonType>("I");
  const [delay, setDelay] = useState(4);
  // Letters to scale degrees, each in the octave nearest the previous tone.
  const degrees = useMemo(() => {
    const letters = melodyText.trim().toLowerCase().split(/\s+/).map((t) => LETTERS.indexOf(t)).filter((d) => d >= 0);
    const out: number[] = [];
    for (const d of letters) {
      const prev = out[out.length - 1] ?? d;
      const candidates = [d - 7, d, d + 7].map((x) => x + 7 * Math.round((prev - d) / 7));
      out.push(candidates.reduce((best, x) => (Math.abs(x - prev) < Math.abs(best - prev) ? x : best)));
    }
    return out;
  }, [melodyText]);
  const canonParts = useMemo(() => {
    const f = CANON_TYPES[canonType].follower;
    return canon(degrees, degrees.map(() => 1), delay, [
      { scale: intervalCellScale([...SCALES.ionian.cells]), tonic: 60, degreeShift: 0 },
      { scale: intervalCellScale([...SCALES[f.scale].cells]), tonic: f.tonic, degreeShift: 0 },
    ]);
  }, [degrees, canonType, delay]);
  const canonNotes = useMemo<NoteEvent[]>(
    () => canonParts.flatMap((part, voice) => part.map((n) => ({ ...n, durationUnits: n.durationUnits * 0.95, velocity: 90, voice }))),
    [canonParts],
  );
  const canonLength = degrees.length + delay;

  // Ch.8.
  const [fugueType, setFugueType] = useState<"II" | "III">("II");
  const axes = useMemo(
    () =>
      fugueType === "II"
        ? expositionAxes("II", 0, 2, 4, intervalCellScale([...SCALES.ionian.cells]))
        : expositionAxes("III", 0, 3, 4),
    [fugueType],
  );
  const counts = axialCombinationCounts();
  // Heard: a short theme on each exposition's CF axis, its inversion on CP's axis above.
  const fugueNotes = useMemo<NoteEvent[]>(() => {
    const theme = [0, 1, 2, 3, 4, 2, 0];
    const major = intervalCellScale([...SCALES.ionian.cells]);
    const majorPcs = [0, 2, 4, 5, 7, 9, 11];
    const pitch = (axis: number, step: number, base: number) =>
      fugueType === "II"
        ? midiNoteForDegree(major, base, majorPcs.indexOf(axis) + step)
        : base + axis + [0, 2, 4, 5, 7, 9, 11][((step % 7) + 7) % 7] + 12 * Math.floor(step / 7);
    return axes.flatMap((e, x) =>
      theme.flatMap((step, k) => [
        { midiNote: pitch(e.cf, step, 48), startUnits: 8 * x + k, durationUnits: 0.9, velocity: 85, voice: 0 },
        { midiNote: pitch(e.cp, -step, 60), startUnits: 8 * x + k, durationUnits: 0.9, velocity: 85, voice: 1 },
      ]),
    );
  }, [axes, fugueType]);
  const forms = expositionForms();

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Theory of Counterpoint (Book VII)</h3>
      <p className="schillinger__hint">
        Harmonic intervals first (Ch. 1). Chromatic intervals sound like diatonic ones — "the following
        'dissonant' intervals are actually consonances by sonority:{" "}
        {CHROMATIC_INTERVALS.filter((c) => bySonority(c.semitones)?.consonant).map((c) => c.name).join(", ")}." Resolutions: "each moving
        voice moves by a semitone or whole tone," 2nds expanding, 7ths and 9ths contracting, 4ths and 5ths
        either way, and "a resolution obtained through oblique motion may be replaced by one in which the
        formerly sustained voice leaps by... a perfect 4th." A major 2nd has twelve resolutions, "as compared
        to" the usual four.
      </p>
      <div className="schillinger__row">
        <label>
          Interval above c
          <select value={interval} onChange={(e) => setIntervalSemitones(Number(e.target.value))}>
            {DIATONIC_INTERVALS.filter((d) => d.semitones > 0).map((d) => (
              <option key={d.semitones} value={d.semitones}>
                {d.name} ({tendencyOf(d.semitones)})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {resolved.length} resolutions:{" "}
        {resolved
          .map((r) => `${name(60 + r.lower)}+${name(60 + interval + r.upper)}${r.leap ? " (leap)" : ""}`)
          .join(" · ")}
      </div>
      <NotePlayback notes={resolutionNotes} lengthUnits={resolved.length * 2} fileName="schillinger-resolutions.mid" />

      <h4>Two-part counterpoint (Ch. 2-5)</h4>
      <p className="schillinger__hint">
        With several attacks of CP to one of CF, each bar is a sequence of consonances and dissonances. For
        two, three and four attacks the book lists exactly those with at most two dissonances; five and more
        add delayed resolutions. The four types of harmonic correlation are unitonal-unimodal,
        unitonal-polymodal, polytonal-unimodal and polytonal-polymodal. A two-part exposition, with its parts
        exchanged and turned through ⓐ ⓑ ⓒ ⓓ, has 8 variants: ⓐ and ⓑ are "identical in intonation and
        converse in temporal structure" ({Object.values(positionRelation("a", "b")).join(", ")}). Melodic
        forms correlate as axial combinations: {counts.binomial} binomials and {counts.trinomial} trinomials
        against a monomial, with {balanceForms(2).withoutZero} + {balanceForms(2).withZero} and{" "}
        {balanceForms(3).forms.length} forms of balance.
      </p>
      <div className="schillinger__row">
        <label>
          Attacks of CP to one of CF
          <select value={attacks} onChange={(e) => setAttacks(Number(e.target.value))}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                CP/CF = {n}a
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {patterns.length} patterns: {patterns.map((p) => [...p].join("-")).join(" · ")}
      </div>
      <NotePlayback notes={patternNotes} lengthUnits={2 * patterns.length} fileName="schillinger-cp-patterns.mid" />

      <h4>Canon (Ch. 7)</h4>
      <p className="schillinger__hint">
        "Continuous imitation consists of one melody coexisting in two or more different parts in its
        different phases and at a velocity that remains constant." Types I and III keep the intonation; II
        and IV change it with the scale. The temporal structure is two elements in reciprocal permutation:{" "}
        {canonTemporalStructure(4).leader.join(" + ")} over {canonTemporalStructure(4).follower.join(" + ")}.
      </p>
      <div className="schillinger__row">
        <label>
          Melody (letters)
          <input type="text" value={melodyText} onChange={(e) => setMelodyText(e.target.value)} />
        </label>
        <label>
          Type
          <select value={canonType} onChange={(e) => setCanonType(e.target.value as CanonType)}>
            {(Object.keys(CANON_TYPES) as CanonType[]).map((t) => (
              <option key={t} value={t}>
                {CANON_TYPES[t].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Follower enters after
          <input type="number" min={1} max={12} value={delay} onChange={(e) => setDelay(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          beats
        </label>
      </div>
      <div className="schillinger__readout">
        Leader: {canonParts[0].map((n) => name(n.midiNote)).join(" ")}
        <br />
        Follower: {canonParts[1].map((n) => name(n.midiNote)).join(" ")}
      </div>
      <NotePlayback notes={canonNotes} lengthUnits={canonLength} fileName="schillinger-canon.mid" />

      <h4>Fugue (Ch. 8) and two-part melodization (Ch. 9-12)</h4>
      <p className="schillinger__hint">
        "Quadrant rotation applied to theme and reply produces altogether {forms.length} geometrical forms of
        exposition," {forms.filter((f) => f.diagonal).length} on the diagonal. Successive expositions move the
        theme's axis so the first part keeps its own: "if P.A. of CF1 is c and P.A. of CP1 is e, the axis of
        CF2 must be a and CP2 must have P.A. on c." Two melodies over harmony give{" "}
        {expositionCombinations().length} forms of exposition, {modalRelations().threeParts} modal relations
        and {modalRelations().twoMelodies} two-part melodizations of one progression.
      </p>
      <div className="schillinger__row">
        <label>
          Fugue type
          <select value={fugueType} onChange={(e) => setFugueType(e.target.value as "II" | "III")}>
            <option value="II">II: CP a third above, in one scale</option>
            <option value="III">III: ∜2, CP three semitones above</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {axes.map((e, i) => `E${i + 1}: CF on ${NOTE_NAMES[e.cf]}, CP on ${NOTE_NAMES[e.cp]}`).join(" · ")}
        <br />
        Heard: a theme on each CF axis with its inversion on the CP axis, exposition by exposition.
      </div>
      <NotePlayback notes={fugueNotes} lengthUnits={8 * axes.length} fileName="schillinger-fugue-axes.mid" defaultBpm={140} />
    </section>
  );
}
