import { useMemo, useState } from "react";
import {
  STRUCTURE_COUNTS,
  sigmaCounts,
  sigmaLimit,
  structureFamilies,
  familyMembers,
  directionalUnitCounts,
  directionalManifold,
  fourthsCycle,
  fourthsTetrad,
  reciprocatingStrata,
  canonSchemes,
  rotatePhase,
  alternatingSigns,
} from "../core/generalHarmony";
import { diatonicCycle } from "../core/diatonicHarmony";
import { intervalCellScale, midiNoteForDegree } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const NOTE_NAMES = ["c", "c#", "d", "eb", "e", "f", "f#", "g", "ab", "a", "bb", "b"];
const pcName = (n: number) => NOTE_NAMES[((n % 12) + 12) % 12];
const DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"];
// Intonations of one part: neutral, or led into from below (+) or above (-) by i or 2i.
const INTONATIONS = [
  { label: "neutral", offset: 0 },
  { label: "↑ i", offset: -1 },
  { label: "↑ 2i", offset: -2 },
  { label: "↓ i", offset: 1 },
  { label: "↓ 2i", offset: 2 },
];

export default function GeneralHarmonyPanel() {
  // Ch.5-6: the harmony of fourths, and reciprocating strata.
  const [fourthsCycleType, setFourthsCycleType] = useState(4);
  const [reciprocate, setReciprocate] = useState(false);
  const roots = useMemo(() => [...fourthsCycle(fourthsCycleType), 0], [fourthsCycleType]);
  const recipRoots = useMemo(() => [...diatonicCycle(5), 0], []);
  const strataNotes = useMemo<NoteEvent[]>(() => {
    if (!reciprocate) {
      return roots.flatMap((d, k) =>
        fourthsTetrad(MAJOR, 48, d).map((midiNote, voice) => ({ midiNote, startUnits: 2 * k, durationUnits: 1.9, velocity: 84, voice })),
      );
    }
    // Upper S(7) through C5 upward from c4; the lower its tonal inversion about c, read downward from c3.
    return recipRoots.flatMap((d, k) => [
      ...[0, 2, 4, 6].map((o, voice) => ({ midiNote: midiNoteForDegree(MAJOR, 60, d + o), startUnits: 2 * k, durationUnits: 1.9, velocity: 84, voice })),
      ...[0, -2, -4, -6].map((o, i) => ({ midiNote: midiNoteForDegree(MAJOR, 48, -d + o), startUnits: 2 * k, durationUnits: 1.9, velocity: 72, voice: 4 + i })),
    ]);
  }, [reciprocate, roots, recipRoots]);
  const strataLength = 2 * (reciprocate ? recipRoots.length : roots.length);

  // Ch.8: directional units into an S3p chord.
  const [chordText, setChordText] = useState("4 3");
  const [intonations, setIntonations] = useState([1, 0, 3]);
  const chord = useMemo(() => {
    const groups = chordText.trim().split(/[\s+]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const valid = groups.length === 2 && groups[0] + groups[1] <= 11;
    const [a, b] = valid ? groups : [4, 3];
    return { valid, pitches: [60, 60 + a, 60 + a + b] };
  }, [chordText]);
  const directionalNotes = useMemo<NoteEvent[]>(
    () =>
      [0, 1].flatMap((rep) =>
        chord.pitches.flatMap((p, voice) => {
          const offset = INTONATIONS[intonations[voice]].offset;
          const start = rep * 4;
          const resolution = { midiNote: p, startUnits: start + 1, durationUnits: 1.9, velocity: 86, voice };
          return offset === 0
            ? [{ midiNote: p, startUnits: start, durationUnits: 2.9, velocity: 86, voice }]
            : [{ midiNote: p + offset, startUnits: start, durationUnits: 0.95, velocity: 80, voice }, resolution];
        }),
      ),
    [chord, intonations],
  );

  // Ch.15: phasic rotation.
  const [rotationText, setRotationText] = useState("2 -3 5 1 -4 3 -1");
  const [theta, setTheta] = useState(8);
  const [startPhase, setStartPhase] = useState(0);
  const rotations = useMemo(() => rotationText.trim().split(/\s+/).map(Number).filter((n) => Number.isInteger(n)), [rotationText]);

  const counts = sigmaCounts();
  const triads = structureFamilies(2);
  const tetrads = structureFamilies(3);
  const r54 = [4, 1, 3, 2, 2, 3, 1, 4];

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>General Theory of Harmony: Strata (Book IX)</h3>
      <p className="schillinger__hint">
        Harmony for "groups of instruments": a score Σ of strata S, each of 1-4 parts. The twelve-unit octave
        gives {STRUCTURE_COUNTS[2]} two-part, {STRUCTURE_COUNTS[3]} three-part and {STRUCTURE_COUNTS[4]} four-part
        structures; a seven-unit scale gives the expansions E0-E5, reciprocal in pairs under octave inversion
        (E0-E5, E1-E4, E2-E3). Two strata of two parts make {counts.twoStrataOfTwoParts.general.toLocaleString()} general
        and {counts.twoStrataOfTwoParts.diatonic} diatonic structures, two of four parts{" "}
        {counts.twoStrataOfFourParts.general.toLocaleString()} with {counts.twoStrataOfFourParts.transformations}{" "}
        transformations. A compound sigma of two-part strata reaches {sigmaLimit(12, 2, 12).parts} parts ("a score
        of {sigmaLimit(12, 2, 12).withRoot} parts" with the root), of four-part strata {sigmaLimit(12, 4, 12).parts}.
      </p>

      <h4>Harmony of fourths and reciprocating strata (Ch. 5-6)</h4>
      <p className="schillinger__hint">
        E2 of the seven-unit scale stacks fourths, functions 1, 4, 7, 10, and moves through the cycles C4,
        C7 and C10. Reciprocating strata: an S(7) stratum and its tonal inversion about c, moving through one
        cycle with opposite signs; they "coincide in structure on the dominant... which is always an S(7)" —
        here on V, {reciprocatingStrata(MAJOR, 4).upper.map(pcName).join("-")}.
      </p>
      <div className="schillinger__row">
        <label>
          <input type="checkbox" checked={reciprocate} onChange={(e) => setReciprocate(e.target.checked)} />
          Reciprocating strata (C5 above, inverted below)
        </label>
        {!reciprocate && (
          <label>
            Cycle
            <select value={fourthsCycleType} onChange={(e) => setFourthsCycleType(Number(e.target.value))}>
              {[4, 7, 10].map((c) => (
                <option key={c} value={c}>
                  C{c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="schillinger__readout">
        {reciprocate
          ? recipRoots
              .map((d) => {
                const { upper, lower } = reciprocatingStrata(MAJOR, d);
                return `${upper.map(pcName).join("")} / ${lower.map(pcName).join("")}`;
              })
              .join(" · ")
          : roots.map((d) => `${DEGREES[d]} ${fourthsTetrad(MAJOR, 48, d).map(pcName).join("-")}`).join(" · ")}
      </div>
      <NotePlayback notes={strataNotes} lengthUnits={strataLength} fileName="schillinger-strata.mid" defaultBpm={100} />

      <h4>Families and directional units (Ch. 7-8)</h4>
      <p className="schillinger__hint">
        A family is the permutations of a structure's interval-groups. Counting the interval-groups "not
        exceeding eleven semitones as a sum" gives {triads.families} triad families ({triads.singleMember} with one
        member) and {tetrads.families} tetrad families ({tetrads.singleMember} with one), whose members are exactly
        the {triads.members} and {tetrads.members} structures. The book prints 29 and 40, one short each. Each part of a
        chord may be approached from below or above by a semitone or a whole tone, so there are{" "}
        {directionalUnitCounts(3).intonations} intonations of an S3p structure over {directionalUnitCounts(3).forms}{" "}
        forms, {directionalUnitCounts(4).intonations} of an S4p, and {directionalManifold().toLocaleString()} "forms of the c-chord."
      </p>
      <div className="schillinger__row">
        <label>
          Interval-groups (semitones, sum ≤ 11)
          <input type="text" value={chordText} onChange={(e) => setChordText(e.target.value)} />
        </label>
        {["Lower", "Middle", "Upper"].map((label, voice) => (
          <label key={label}>
            {label}
            <select
              value={intonations[voice]}
              onChange={(e) => setIntonations(intonations.map((v, i) => (i === voice ? Number(e.target.value) : v)))}
            >
              {INTONATIONS.map((t, i) => (
                <option key={t.label} value={i}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="schillinger__readout">
        {chord.valid ? "" : "Two interval-groups summing to at most 11 — using 4 + 3. "}
        Family of {chordText.trim() && chord.valid ? chordText.trim() : "4 3"}:{" "}
        {familyMembers([chord.pitches[1] - chord.pitches[0], chord.pitches[2] - chord.pitches[1]])
          .map((m) => [60, 60 + m[0], 60 + m[0] + m[1]].map(pcName).join("-"))
          .join(" · ")}
        <br />
        Directional unit:{" "}
        {chord.pitches
          .map((p, v) => (INTONATIONS[intonations[v]].offset ? `${pcName(p + INTONATIONS[intonations[v]].offset)}→${pcName(p)}` : pcName(p)))
          .join(", ")}
      </div>
      <NotePlayback notes={directionalNotes} lengthUnits={8} fileName="schillinger-directional-unit.mid" defaultBpm={80} />

      <h4>Canons and density (Ch. 13-15)</h4>
      <p className="schillinger__hint">
        Canons from three-part strata follow {canonSchemes(3)} schemes: the 3! orders of imitation, clockwise or
        counterclockwise. Density-groups rotate through phases φ0 … φ(θ−1), and "the addition of positive or
        negative phases... follows the rules of algebraic addition." A resultant from the theory of rhythm
        with alternating signs ({alternatingSigns(r54).join(" ")}) sums to zero, so it returns to its first phase.
      </p>
      <div className="schillinger__row">
        <label>
          Rotations
          <input type="text" value={rotationText} onChange={(e) => setRotationText(e.target.value)} />
        </label>
        <label>
          From φ
          <input type="number" min={0} max={theta - 1} value={startPhase} onChange={(e) => setStartPhase(Math.max(0, Math.min(theta - 1, Number(e.target.value) || 0)))} />
        </label>
        <label>
          θ =
          <input type="number" min={2} max={24} value={theta} onChange={(e) => setTheta(Math.max(2, Math.min(24, Number(e.target.value) || 2)))} />
          φ
        </label>
      </div>
      <div className="schillinger__readout">
        φ{startPhase} {rotations.map((r) => `${r < 0 ? "−" : "+"} ${Math.abs(r)}φ`).join(" ")} = φ{rotatePhase(startPhase, rotations, theta)}
      </div>
    </section>
  );
}
