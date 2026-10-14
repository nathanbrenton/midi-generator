import { useMemo, useState } from "react";
import {
  AXIS_TECHNIQUES,
  axisOfMotion,
  classicalPedalPoint,
  CLASSICAL_CADENCES,
  keysOverPedal,
  keyTendencies,
  modulatingPedalPoint,
  PEDAL_POINT_LOCATIONS,
  seventhMotion,
  symmetricPedalPoint,
  triadMotion,
  type PedalChord,
} from "../core/pedalPoints";
import { intervalCellScale } from "../core/scales";
import type { TransformDirection } from "../core/diatonicHarmony";
import type { NoteEvent } from "../core/melody";
import NotePlayback from "./NotePlayback";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const name = (n: number) => `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
const UNITS_PER_CHORD = 2;

/** Upper voices one chord each; a bass held across consecutive chords on the same pitch, as a pedal. */
function pedalNotes(chords: readonly PedalChord[]): NoteEvent[] {
  const notes: NoteEvent[] = chords.flatMap((c, i) =>
    c.upper.map((midiNote, k) => ({ midiNote, startUnits: i * UNITS_PER_CHORD, durationUnits: UNITS_PER_CHORD * 0.9, velocity: 85, voice: k + 1 })),
  );
  let start = 0;
  for (let i = 1; i <= chords.length; i++) {
    if (i === chords.length || chords[i].bass !== chords[start].bass) {
      notes.push({ midiNote: chords[start].bass, startUnits: start * UNITS_PER_CHORD, durationUnits: (i - start) * UNITS_PER_CHORD - 0.1, velocity: 95, voice: 0 });
      start = i;
    }
  }
  return notes;
}

const chordText = (c: PedalChord) => `${c.upper.map(name).join("-")} / ${name(c.bass)}`;

export default function PedalPointsPanel() {
  // Introduction: axes against the pedal.
  const [techniqueIndex, setTechniqueIndex] = useState(0);
  const technique = AXIS_TECHNIQUES[techniqueIndex];
  const axisChords: PedalChord[] = useMemo(() => {
    const upper =
      technique.transformation === null
        ? seventhMotion(MAJOR, 60, technique.cycle as 7 | -5)
        : triadMotion(MAJOR, 60, technique.cycle, technique.transformation as TransformDirection);
    return upper.map((u, k) => ({ label: `${k + 1}`, bass: 36, upper: [...u].sort((x, y) => x - y), onPedal: true }));
  }, [technique]);
  const axis = useMemo(() => axisOfMotion(axisChords.map((c) => c.upper)), [axisChords]);
  const axisNotes = useMemo(() => pedalNotes(axisChords), [axisChords]);

  // Section A.
  const [classical, setClassical] = useState<"PPT" | "PPD">("PPT");
  const classicalChords = useMemo(() => classicalPedalPoint(classical, MAJOR, 60), [classical]);
  const classicalNotes = useMemo(() => pedalNotes(classicalChords), [classicalChords]);

  // Section C.
  const [modulating, setModulating] = useState<"PPT" | "PPD">("PPT");
  const [keyCount, setKeyCount] = useState(5);
  const [approach, setApproach] = useState<"V" | "VII">("VII");
  const pedal = modulating === "PPT" ? 48 : 43;
  const modulation = useMemo(() => modulatingPedalPoint(modulating, pedal, keyCount, approach), [modulating, pedal, keyCount, approach]);
  const modulationNotes = useMemo(() => pedalNotes(modulation.chords), [modulation]);
  const tendencies = useMemo(() => keyTendencies(modulating), [modulating]);
  const verdicts = useMemo(() => keysOverPedal(pedal % 12), [pedal]);

  // Section D.
  const [tonics, setTonics] = useState<2 | 3 | 4 | 6>(2);
  const [symmetricTransform, setSymmetricTransform] = useState<TransformDirection>("clockwise");
  const [extended, setExtended] = useState(false);
  const symmetricChords = useMemo(
    () => symmetricPedalPoint(48, tonics, [[1, 1]], symmetricTransform, extended),
    [tonics, symmetricTransform, extended],
  );
  const symmetricNotes = useMemo(() => pedalNotes(symmetricChords), [symmetricChords]);

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Pedal Points (Book V, Ch. 19)</h3>
      <p className="schillinger__hint">
        "Pedal Point or Organ Point (P.P.) is a primary axis about which chord progressions are
        formed. The various patterns of motion which the remaining voices produce in relation to the
        pedal point consequently result in different effects corresponding to the axial
        combinations" — Book IV's axes. Each technique below is the book's own (p.559-560), held over a
        pedal c and measured: the axis the upper voices actually describe, and their largest move.
      </p>
      <div className="schillinger__row">
        <label>
          Technique
          <select value={techniqueIndex} onChange={(e) => setTechniqueIndex(Number(e.target.value))}>
            {AXIS_TECHNIQUES.map((t, i) => (
              <option key={i} value={i}>
                {t.axis === "alternating" ? "alternating" : `${t.axis}-axis`}: {t.technique} ({t.parts} parts, {t.motion})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        Measured: {axis.axis === "alternating" ? "alternating" : `${axis.axis}-axis`} without range control, largest single move{" "}
        {axis.largestMove} semitones · {axisChords.map((c) => c.upper.map(name).join("-")).join(" · ")}
      </div>
      <NotePlayback notes={axisNotes} lengthUnits={axisChords.length * UNITS_PER_CHORD} fileName="schillinger-pedal-axis.mid" />

      <h4>Classical pedal points (Section A, p.561-563)</h4>
      <p className="schillinger__hint">
        P.P.T. "affirms the harmonic axis of the composition, i.e., it establishes the key... an
        extension of the ecclesiastic plagal cadence": {CLASSICAL_CADENCES.PPT.degrees} ({CLASSICAL_CADENCES.PPT.formula}).
        P.P.D. "is a climactic pedal point... an extension of the compound authentic cadence":{" "}
        {CLASSICAL_CADENCES.PPD.degrees} ({CLASSICAL_CADENCES.PPD.formula}); it "is prepared by a
        subdominant (S), starts with T_D (I 6/4) and ends with an authentic cadence (D + T)." Their
        traditional locations in A + A1 + B + A1 (Figure 311):
      </p>
      <div className="schillinger__readout">
        {PEDAL_POINT_LOCATIONS.map((row, i) => (
          <div key={i}>
            ({i + 1}) {row.map((c) => c || "—").join(" | ")}
          </div>
        ))}
      </div>
      <div className="schillinger__row">
        <label>
          Pedal point
          <select value={classical} onChange={(e) => setClassical(e.target.value as "PPT" | "PPD")}>
            <option value="PPT">P.P.T. — on the tonic</option>
            <option value="PPD">P.P.D. — on the dominant</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {classicalChords.map((c) => `${c.label}: ${chordText(c)}${c.onPedal ? "" : " (off the pedal)"}`).join(" → ")}
      </div>
      <NotePlayback notes={classicalNotes} lengthUnits={classicalChords.length * UNITS_PER_CHORD} fileName="schillinger-classical-pedal.mid" />

      <h4>The modulating pedal point (Section C, p.565-566)</h4>
      <p className="schillinger__hint">
        P.P.D. tends toward the sharps by C-5, P.P.T. toward the flats by C5 (Figure 315: {tendencies.map((t) => t.major).join(" — ")}).
        But "only those keys may be selected... in which I S(5) taken together with P.P. produces a
        crystallized structure acceptable in the established four-part harmony": the tonic triad over
        the pedal must be an S(5), S(6), S(4/6), a seventh chord with the pedal as root or seventh, or
        an S(11). The keys of the tendency the pedal accepts follow one another, each reached "by means
        of the chord on the VII or V of the following key."
      </p>
      <div className="schillinger__row">
        <label>
          Pedal point
          <select value={modulating} onChange={(e) => setModulating(e.target.value as "PPT" | "PPD")}>
            <option value="PPT">P.P.T. on c — toward the flats</option>
            <option value="PPD">P.P.D. on g — toward the sharps</option>
          </select>
        </label>
        <label>
          Each key reached by its
          <select value={approach} onChange={(e) => setApproach(e.target.value as "V" | "VII")}>
            <option value="VII">VII</option>
            <option value="V">V</option>
          </select>
        </label>
        <label>
          Keys
          <input type="number" min={1} max={8} value={keyCount} onChange={(e) => setKeyCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
        </label>
      </div>
      <div className="schillinger__readout">
        Keys: {modulation.keys.join(" → ")}
        <br />
        {modulation.chords.map((c) => `${c.label} ${c.upper.map(name).join("-")}`).join(" · ")}
        <br />
        Over {NOTE_NAMES[pedal % 12]}, not accepted: {verdicts.filter((v) => !v.accepted).map((v) => v.key).join(", ")}
      </div>
      <NotePlayback notes={modulationNotes} lengthUnits={modulation.chords.length * UNITS_PER_CHORD} fileName="schillinger-modulating-pedal.mid" />

      <h4>The symmetric pedal point (Section D, p.566-567)</h4>
      <p className="schillinger__hint">
        Type III progressions over the pedal: "the pedal point itself is the main (original) tonic."
        The extended form is "a group of pedal points, each tonic becoming a pedal point in
        succession," the upper parts moving "through the same system of symmetry" (Figure 318).
      </p>
      <div className="schillinger__row">
        <label>
          Tonics
          <select value={tonics} onChange={(e) => setTonics(Number(e.target.value) as 2 | 3 | 4 | 6)}>
            {[2, 3, 4, 6].map((n) => (
              <option key={n} value={n}>
                {n} tonics
              </option>
            ))}
          </select>
        </label>
        <label>
          Transformation
          <select value={symmetricTransform} onChange={(e) => setSymmetricTransform(e.target.value as TransformDirection)}>
            <option value="clockwise">↻ clockwise</option>
            <option value="counterclockwise">↺ counterclockwise</option>
            <option value="const3">const. 3</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} />
          Extended: each tonic becomes the pedal
        </label>
      </div>
      <div className="schillinger__readout">{symmetricChords.map(chordText).join(" · ")}</div>
      <NotePlayback notes={symmetricNotes} lengthUnits={symmetricChords.length * UNITS_PER_CHORD} fileName="schillinger-symmetric-pedal.mid" />
    </section>
  );
}
