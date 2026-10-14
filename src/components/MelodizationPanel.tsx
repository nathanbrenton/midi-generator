import { useMemo, useState } from "react";
import {
  SCALE_OF_TENSION,
  rootsUnderHeldTone,
  melodize,
  melodizingFunctions,
  melodizationCount,
  type Tension,
} from "../core/melodization";
import { chordDurations } from "../core/melodicAttackGroups";
import { SIGMA_13, sigmaScale, sigmaStyles } from "../core/masterStructures";
import { diatonicCycle, positionVoicing, S5_POSITIONS, voiceLeadProgression, type SignedCycleType } from "../core/diatonicHarmony";
import { generateResultant } from "../core/resultant";
import { generateFractionedResultant } from "../core/fractioning";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const name = (n: number) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const READINGS = {
  3: { label: "1 3 5 7 9 11 13 — C3", functions: [1, 3, 5, 7, 9, 11, 13, 1] },
  5: { label: "1 5 9 13 3 7 11 — C5", functions: [1, 5, 9, 13, 3, 7, 11, 1] },
  7: { label: "1 7 13 5 11 3 9 — C7", functions: [1, 7, 13, 5, 11, 3, 9, 1] },
} as const;
const RANGES: readonly { label: string; range: [number, number] }[] = [
  { label: "1-5 (archaic, conservative)", range: [1, 5] },
  { label: "1-13 (fully flexible)", range: [1, 13] },
  { label: "7-13 (Debussy, Ravel)", range: [7, 13] },
  { label: "5-9 (intermediate)", range: [5, 9] },
];

export default function MelodizationPanel() {
  // The scale of tension over a held c.
  const [reading, setReading] = useState<3 | 5 | 7>(3);
  const heldRoots = useMemo(() => rootsUnderHeldTone(0, READINGS[reading].functions), [reading]);
  const heldChords = useMemo(
    () => heldRoots.map((d) => [...positionVoicingArray(d), 72]),
    [heldRoots],
  );
  const heldNotes = useMemo(() => chordsToNotes(heldChords), [heldChords]);

  // Diatonic melodization, M/H = 1.
  const [cycle, setCycle] = useState<SignedCycleType>(5);
  const [rangeIndex, setRangeIndex] = useState(1);
  const [axis, setAxis] = useState<"a" | "b" | "0" | "a+b" | "b+a">("a+b");
  const [tension, setTension] = useState<Tension>("S(5)");
  const progression = useMemo(() => {
    const roots = Array.from({ length: 8 }, (_, k) => diatonicCycle(cycle)[k % 7]);
    return { roots, voicings: voiceLeadProgression(MAJOR, 60, roots, "clockwise") };
  }, [cycle]);
  const melody = useMemo(() => {
    try {
      return melodize(MAJOR, 60, progression.roots.map((rootDegree) => ({ rootDegree, tension })), RANGES[rangeIndex].range, axis, 72, [67, 91]);
    } catch {
      return null;
    }
  }, [progression, tension, rangeIndex, axis]);
  const melodyNotes = useMemo<NoteEvent[]>(() => {
    const chords = progression.voicings.map((v) => [v.bass, v.root, v.third, v.fifth]);
    return [
      ...chordsToNotes(chords, 2).map((n) => ({ ...n, velocity: 70 })),
      ...(melody?.pitches ?? []).map((midiNote, i) => ({ midiNote, startUnits: 2 * i, durationUnits: 1.9, velocity: 100, voice: 4 })),
    ];
  }, [progression, melody]);

  // Attack groups interfering with durations (Figure 23).
  const interference = useMemo(() => {
    const attacks = generateResultant([5, 4]).segments.map((s) => s.duration);
    const durations = generateFractionedResultant(4, 3).segments.map((s) => s.duration);
    return chordDurations(attacks, durations);
  }, []);
  const interferenceNotes = useMemo<NoteEvent[]>(() => {
    const notes: NoteEvent[] = [];
    let t = 0;
    const roots = Array.from({ length: interference.perChord.length }, (_, k) => diatonicCycle(5)[k % 7]);
    const voicings = voiceLeadProgression(MAJOR, 60, roots, "clockwise");
    let previous = 76;
    interference.perAttack.forEach((group, k) => {
      const v = voicings[k];
      [v.bass, v.root, v.third, v.fifth].forEach((midiNote, voice) =>
        notes.push({ midiNote, startUnits: t / 2, durationUnits: interference.perChord[k] / 2 - 0.05, velocity: 65, voice }),
      );
      const pitches = melodize(MAJOR, 60, Array.from({ length: group.length }, () => ({ rootDegree: roots[k], tension: "S(5)" as Tension })), [1, 13], "0", previous, [67, 88]).pitches;
      group.forEach((d, i) => {
        notes.push({ midiNote: pitches[i], startUnits: t / 2, durationUnits: d / 2 - 0.05, velocity: 100, voice: 4 });
        previous = pitches[i];
        t += d;
      });
    });
    return notes;
  }, [interference]);

  // Σ(13).
  const [sigmaIndex, setSigmaIndex] = useState(12);
  const sigma = SIGMA_13[sigmaIndex];
  const sigmaNotes = useMemo<NoteEvent[]>(
    () => [
      ...sigma.offsets.map((o, k) => ({ midiNote: 48 + o, startUnits: 0, durationUnits: 3.8, velocity: 75, voice: k })),
      ...sigmaScale(sigma).concat(12).map((pc, i) => ({ midiNote: 60 + pc, startUnits: 4 + i * 0.5, durationUnits: 0.45, velocity: 95, voice: 7 })),
    ],
    [sigma],
  );

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Melodization of Harmony (Book VI, Ch. 1-2)</h3>
      <p className="schillinger__hint">
        "If melody can be expressed in terms of harmony, i.e., as a sequence of chordal functions and
        their respective tensions, then a scientific and universal method for the harmonization of
        melody can well be formulated by reversing the whole system of operations." A melodic tone is one
        of the seven functions of the scale of tension, {SCALE_OF_TENSION.join(", ")}. "Clockwise
        functioning of the consecutive pitch-units of a melody obtains the positive form of tonal
        cycles": a held c read as 1, 3, 5 … lies over C A F D B G E C (p.620-621).
      </p>
      <div className="schillinger__row">
        <label>
          Held c read as
          <select value={reading} onChange={(e) => setReading(Number(e.target.value) as 3 | 5 | 7)}>
            {([3, 5, 7] as const).map((c) => (
              <option key={c} value={c}>
                {READINGS[c].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">Chords under the held c: {heldRoots.map((d) => "CDEFGAB"[d]).join(" ")}</div>
      <NotePlayback notes={heldNotes} lengthUnits={heldChords.length} fileName="schillinger-scale-of-tension.mid" />

      <h4>Diatonic melodization, M/H = 1 (Section A, Table I)</h4>
      <p className="schillinger__hint">
        "The two fundamental factors which determine the quality and the character of melodization
        are: (a) the range of tension; (b) the melodic pattern, i.e., the axial combinations." Table I
        lists the functions each tension accepts — S(5) takes 1, 3, 5 and 7 or 13 ("by sonority it converts
        an S(5) into S(7)") but not 9 or 11 ("without support from the immediately preceding function").
        About five usable functions a chord give {melodizationCount(8).toLocaleString()} melodizations of
        eight chords.
      </p>
      <div className="schillinger__row">
        <label>
          Cycle
          <select value={cycle} onChange={(e) => setCycle(Number(e.target.value) as SignedCycleType)}>
            {([3, 5, 7, -3, -5, -7] as SignedCycleType[]).map((c) => (
              <option key={c} value={c}>
                C{c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tension
          <select value={tension} onChange={(e) => setTension(e.target.value as Tension)}>
            {(["S(5)", "S(7)", "S(9)", "S(11)"] as Tension[]).map((t) => (
              <option key={t} value={t}>
                {t}: {melodizingFunctions(t).join(", ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Range of tension
          <select value={rangeIndex} onChange={(e) => setRangeIndex(Number(e.target.value))}>
            {RANGES.map((r, i) => (
              <option key={r.label} value={i}>
                R = {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Axis
          <select value={axis} onChange={(e) => setAxis(e.target.value as "a" | "b" | "0" | "a+b" | "b+a")}>
            <option value="a+b">a + b — rising, then falling</option>
            <option value="b+a">b + a — falling, then rising</option>
            <option value="0">0 — nearest</option>
            <option value="a">a — ascending</option>
            <option value="b">b — descending</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {melody
          ? melody.pitches.map((p, i) => `${name(p)} (${melody.functions[i]})`).join(" · ")
          : "No function of this tension lies in that range."}
      </div>
      <NotePlayback notes={melodyNotes} lengthUnits={16} fileName="schillinger-melodization.mid" />

      <h4>Attack-groups interfering with durations (Ch. 2, Figure 23)</h4>
      <p className="schillinger__hint">
        "The final and most refined technique": attacks per chord A = r5÷4 = 4a + a + 3a + 2a + 2a + 3a + a +
        4a against durations T = r̲4÷3, each chord lasting "the sum of durations during the time of attacks
        corresponding to such an H" — {interference.perChord.map((d) => `${d}t`).join(" + ")} ={" "}
        {interference.perChord.reduce((a, b) => a + b, 0)}t, four bars of 8t.
      </p>
      <NotePlayback notes={interferenceNotes} lengthUnits={16} fileName="schillinger-attack-interference.mid" />

      <h4>The master-structures Σ(13) (Section D, Figure 27)</h4>
      <p className="schillinger__hint">
        The 36 master-structures: six thirds of 3 or 4 semitones, seven different pitch classes — "1, 3, 5
        and 7... the lower structure [as S(7)], with 9, 11 and 13... the upper structure [as S(5)]." Every
        substructure and melodic tone of a symmetric style comes from one Σ; blends of two or three give{" "}
        {sigmaStyles(2).toLocaleString()} and {sigmaStyles(3).toLocaleString()} styles. Play: the Σ, then the
        scale it expands (E0).
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
      </div>
      <div className="schillinger__readout">
        {sigma.roman}: {sigma.lower} S(7) + {sigma.upper} S(5) · scale {[0, 4, 1, 5, 2, 6, 3].map((k) => sigma.spelled.split(" ")[k]).join("-")}
      </div>
      <NotePlayback notes={sigmaNotes} lengthUnits={8} fileName="schillinger-sigma-13.mid" />
    </section>
  );
}

/** The chord on a degree in close position below the held c5, its root doubled in the bass. */
function positionVoicingArray(degree: number): number[] {
  const v = positionVoicing(MAJOR, 48, degree, S5_POSITIONS.close[1]);
  return [v.bass, v.root, v.third, v.fifth];
}
