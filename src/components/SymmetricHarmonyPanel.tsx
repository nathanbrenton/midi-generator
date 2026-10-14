import { useEffect, useMemo, useRef, useState } from "react";
import {
  S5_STRUCTURES,
  symmetricStructureProgression,
  symmetricHarmonyScale,
  SYMMETRIC_CYCLE_FOR_TONIC_COUNT,
  expandStructuralGroup,
  zeroCyclePositions,
  symmetricZeroCycle,
  diatonicSymmetricProgression,
  symmetricProgression,
  symmetricRoots,
  recurrenceCycles,
  type StructureId,
  type TonicCount,
} from "../core/symmetricHarmony";
import { voicingPosition, type TransformDirection, type Voicing } from "../core/diatonicHarmony";
import { parseCycleGroup, parseStructuralGroup, formatCycleGroup, formatStructuralGroup } from "../core/notation/harmony";
import { intervalCellScale } from "../core/scales";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import { TONIC_COUNTS, symmetricTonics } from "../core/symmetricScales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function chordLabel(triad: readonly number[]): string {
  return triad.map(noteName).join("-");
}

const TYPE_II_SCALES = {
  mixolydian: { label: "c-d-e-f-g-a-b♭ (Figure 47)", cells: [2, 2, 1, 2, 2, 1, 2] },
  major: { label: "natural major", cells: [2, 2, 1, 2, 2, 2, 1] },
  aeolian: { label: "natural minor (Aeolian)", cells: [2, 1, 2, 2, 1, 2, 2] },
  harmonicMinor: { label: "harmonic minor", cells: [2, 1, 2, 2, 1, 3, 1] },
} as const;
type TypeIIScale = keyof typeof TYPE_II_SCALES;
const TRANSFORM_LABELS: Record<TransformDirection, string> = {
  clockwise: "↻ clockwise",
  counterclockwise: "↺ counterclockwise",
  const3: "const. 3",
};

/** Bass first, then the upper voices from low to high. */
function voicingArray(v: Voicing): number[] {
  return [v.bass, ...[v.root, v.third, v.fifth].sort((x, y) => x - y)];
}

function parseStructures(text: string): StructureId[] {
  return text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((n): n is StructureId => n === 1 || n === 2 || n === 3 || n === 4);
}

export default function SymmetricHarmonyPanel() {
  const [root, setRoot] = useState(60);
  const [structuresText, setStructuresText] = useState("1,2,3,4");
  const [mode, setMode] = useState<"chords" | "scale">("chords");
  const [tonicCount, setTonicCount] = useState(2);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const structures = useMemo(() => parseStructures(structuresText), [structuresText]);
  const chordProgression = useMemo(() => symmetricStructureProgression(structures, root), [structures, root]);

  const tonics = useMemo(() => symmetricTonics(tonicCount, root), [tonicCount, root]);
  const octaveBase = root - (((root % 12) + 12) % 12);
  const scaleStructure = structures[0] ?? 1;
  const scale = useMemo(() => symmetricHarmonyScale(tonics, scaleStructure), [tonics, scaleStructure]);
  const scaleAsNotes = useMemo(() => scale.map((pc) => [octaveBase + pc]), [scale, octaveBase]);

  const progression: number[][] = mode === "scale" ? scaleAsNotes : chordProgression;

  // Ch.3 B: the symmetric zero cycle.
  const [c0Text, setC0Text] = useState("3S1 + S3 + 2S2");
  const [c0Direction, setC0Direction] = useState<TransformDirection>("counterclockwise");
  const c0Group = useMemo(() => parseStructuralGroup(c0Text), [c0Text]);
  const c0Structures = useMemo(() => (c0Group ? expandStructuralGroup(c0Group) : []), [c0Group]);
  const c0Chords = useMemo(
    () => (c0Structures.length > 0 ? symmetricZeroCycle(c0Structures, root, c0Direction).map(voicingArray) : []),
    [c0Structures, root, c0Direction],
  );
  const c0Notes = useMemo(() => chordsToNotes(c0Chords), [c0Chords]);

  // Ch.4: Type II.
  const [t2Scale, setT2Scale] = useState<TypeIIScale>("mixolydian");
  const [t2CyclesText, setT2CyclesText] = useState("2C7 + C3 + C5");
  const [t2StructuresText, setT2StructuresText] = useState("S1");
  const t2Cycles = useMemo(() => parseCycleGroup(t2CyclesText), [t2CyclesText]);
  const t2Structures = useMemo(() => parseStructuralGroup(t2StructuresText), [t2StructuresText]);
  const t2 = useMemo(() => {
    if (!t2Cycles || !t2Structures || t2Structures.some(([, s]) => s > 4)) return null;
    try {
      return diatonicSymmetricProgression(intervalCellScale([...TYPE_II_SCALES[t2Scale].cells]), root - 12, t2Cycles, t2Structures);
    } catch {
      return null;
    }
  }, [t2Cycles, t2Structures, t2Scale, root]);
  const t2Notes = useMemo(() => chordsToNotes(t2?.chords ?? []), [t2]);

  // Ch.5: Type III.
  const [t3Tonics, setT3Tonics] = useState<Exclude<TonicCount, 1>>(2);
  const [t3Form, setT3Form] = useState<"positive" | "negative">("positive");
  const [t3Transform, setT3Transform] = useState<TransformDirection>("clockwise");
  const [t3StructuresText, setT3StructuresText] = useState("S1");
  const t3Group = useMemo(() => parseStructuralGroup(t3StructuresText), [t3StructuresText]);
  const t3Roots = useMemo(() => symmetricRoots(t3Tonics, t3Form), [t3Tonics, t3Form]);
  const t3 = useMemo(
    () =>
      t3Group && t3Group.every(([, s]) => s <= 4)
        ? symmetricProgression(root, t3Tonics, t3Group, t3Transform, {
            form: t3Form,
            chords: Math.max(recurrenceCycles(t3Tonics, t3Transform) * t3Tonics, expandStructuralGroup(t3Group).length) + 1,
          })
        : null,
    [root, t3Tonics, t3Group, t3Transform, t3Form],
  );
  const t3Chords = useMemo(() => (t3 ? t3.voicings.map(voicingArray) : []), [t3]);
  const t3Notes = useMemo(() => chordsToNotes(t3Chords), [t3Chords]);

  const notes: NoteEvent[] = useMemo(() => {
    return progression.flatMap((chord, i) =>
      chord.map((midiNote, voice) => ({
        midiNote,
        startUnits: i,
        durationUnits: 0.9,
        velocity: 90,
        voice,
      })),
    );
  }, [progression]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = progression.length * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || notes.length === 0) return;

    const cycleStart = context.currentTime;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit;
      gain.gain.setValueAtTime(0.1, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
    }

    window.setTimeout(() => {
      if (token === playTokenRef.current) scheduleLoopPass(token);
    }, cycleSeconds * 1000);
  }

  function stopPlayback() {
    playTokenRef.current += 1;
    setIsPlaying(false);
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (notes.length === 0) return;
    audioContextRef.current = new AudioContext();
    setIsPlaying(true);
    scheduleLoopPass(++playTokenRef.current);
  }

  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) return;
    audioContextRef.current.close();
    audioContextRef.current = new AudioContext();
    scheduleLoopPass(++playTokenRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, secondsPerUnit, cycleSeconds]);

  function downloadMidi() {
    if (notes.length === 0) return;
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit: 480 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-symmetric-harmony.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Symmetric System of Harmony (Book V, Ch. 3-5)</h3>
      <p className="schillinger__hint">
        Unlike diatonic harmony, symmetric chord structures are pre-selected independent of any
        scale, built directly from semitone intervals — "scale is the result... the consequence of
        chords in motion" (p.388). Restricting a triad's two intervals to 3 or 4 semitones each gives
        exactly four structures: S1=4+3 (major), S2=3+4 (minor), S3=4+4 (augmented), S4=3+3
        (diminished). All sharing one common root produces a "symmetric zero cycle" (C0, p.391). The
        book's own combinatorics table (badly garbled by OCR, but every one of its 8 counts confirmed
        by hand) is just <code>generalPermutations</code> applied to these 4 structure-labels — e.g.
        all 4 different gives 4!=24 forms, matching exactly. "The general number of three-unit scales
        from one axis" (55) is exactly Book II Ch. 7's <code>compositionCount(12,3)</code>. Ch. 5's own
        tonic-count table reuses Book II Ch. 7's tonic systems directly; the "scale" mode below shows
        the sorted union of pitch classes across every tonic's own triad — confirmed against the
        book's own worked examples: S1 on 2 tonics gives c-db-e-f#-g-a#(bb); S2 gives c-db-eb-f#-g-a.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as "chords" | "scale")}>
            <option value="chords">Chord progression (common root)</option>
            <option value="scale">Symmetric scale (Ch. 5, multi-tonic)</option>
          </select>
        </label>
      </div>
      {mode === "chords" ? (
        <div className="schillinger__row">
          <label>
            Structures (1=major, 2=minor, 3=augmented, 4=diminished)
            <input type="text" value={structuresText} onChange={(e) => setStructuresText(e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="schillinger__row">
          <label>
            Tonics
            <select value={tonicCount} onChange={(e) => setTonicCount(Number(e.target.value))}>
              {TONIC_COUNTS.map((t) => (
                <option key={t} value={t}>
                  {t} tonics
                </option>
              ))}
            </select>
          </label>
          <label>
            Structure (1=major, 2=minor, 3=augmented, 4=diminished)
            <input type="text" value={structuresText} onChange={(e) => setStructuresText(e.target.value)} />
          </label>
        </div>
      )}
      <div className="schillinger__readout">
        {mode === "chords" ? (
          chordProgression.length > 0 ? (
            <>
              {chordProgression.length} chords, common root {noteName(root)}:{" "}
              {chordProgression
                .map((triad, i) => `${S5_STRUCTURES[structures[i]].name}(${chordLabel(triad)})`)
                .join(" · ")}
            </>
          ) : (
            "Enter structure numbers 1-4 above."
          )
        ) : (
          <>
            {tonicCount}-tonic system ({SYMMETRIC_CYCLE_FOR_TONIC_COUNT[tonicCount]} between tonics),{" "}
            {S5_STRUCTURES[scaleStructure].name} structure: tonics{" "}
            {tonics.map(noteName).join(", ")} → scale {scaleAsNotes.map((n) => noteName(n[0])).join("-")}
          </>
        )}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>
      </div>
      <div className="schillinger__actions">
        <button type="button" onClick={togglePlayback} disabled={notes.length === 0 && !isPlaying}>
          {isPlaying ? "Stop" : "Play"}
        </button>
        <button type="button" onClick={downloadMidi} disabled={notes.length === 0}>
          Download MIDI
        </button>
      </div>

      <h4>The symmetric zero cycle, C0 (Ch. 3, Section B)</h4>
      <p className="schillinger__hint">
        "A group of chords with a common root-tone but with variable positions and variable
        structures." Coefficients of recurrence decide the positions: "a structure with a coefficient
        greater than one changes its positions until the next structure appears. The change of
        structure requires the preservation of the position" (p.391) — S const., position var.; S
        var., position const. Write the structural group as the book does: 3S1 + S3 + 2S2.
      </p>
      <div className="schillinger__row">
        <label>
          Structural group
          <input type="text" value={c0Text} onChange={(e) => setC0Text(e.target.value)} />
        </label>
        <label>
          Position change by
          <select value={c0Direction} onChange={(e) => setC0Direction(e.target.value as TransformDirection)}>
            {(Object.keys(TRANSFORM_LABELS) as TransformDirection[]).map((t) => (
              <option key={t} value={t}>
                {TRANSFORM_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {c0Group ? (
          <>
            {formatStructuralGroup(c0Group)} = {c0Structures.map((k) => `S${k}`).join(" + ")}
            <br />
            Positions: {zeroCyclePositions(c0Structures).join(", ") || "—"}
            <br />
            {c0Chords.map(chordLabel).join(" · ")}
          </>
        ) : (
          "Write a structural group such as 3S1 + S3 + 2S2 (structures 1-4)."
        )}
      </div>
      <NotePlayback notes={c0Notes} lengthUnits={c0Chords.length} fileName="schillinger-zero-cycle.mid" />

      <h4>Diatonic-symmetric harmony, Type II (Ch. 4)</h4>
      <p className="schillinger__hint">
        "All root-tones... must belong to one scale of the First Group" and "all chord structures must
        be pre-selected; they are not affected by the intonation of scale formed by the root-tones"
        (p.393). The roots move through the scale by a group of tonal cycles with coefficients; the
        structural group runs over them independently. Figure 47: in c-d-e-f-g-a-b♭, 2C7 + C3 + C5
        under S1 const.
      </p>
      <div className="schillinger__row">
        <label>
          Scale of roots
          <select value={t2Scale} onChange={(e) => setT2Scale(e.target.value as TypeIIScale)}>
            {(Object.keys(TYPE_II_SCALES) as TypeIIScale[]).map((k) => (
              <option key={k} value={k}>
                {TYPE_II_SCALES[k].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tonal cycles
          <input type="text" value={t2CyclesText} onChange={(e) => setT2CyclesText(e.target.value)} />
        </label>
        <label>
          Structural group
          <input type="text" value={t2StructuresText} onChange={(e) => setT2StructuresText(e.target.value)} />
        </label>
      </div>
      <div className="schillinger__readout">
        {t2 && t2Cycles && t2Structures ? (
          <>
            {formatCycleGroup(t2Cycles)}; {formatStructuralGroup(t2Structures)} — {t2.chords.length} chords
            <br />
            Roots: {t2.chords.map((c) => noteName(c[0]).replace(/\d+$/, "")).join(" ")}
            <br />
            {t2.chords.map(chordLabel).join(" · ")}
          </>
        ) : (
          "Write tonal cycles such as 2C7 + C3 + C5 and a structural group such as S1 or S1 + 2S2 (structures 1-4)."
        )}
      </div>
      <NotePlayback notes={t2Notes} lengthUnits={t2?.chords.length ?? 0} fileName="schillinger-type-ii.mid" />

      <h4>Symmetric harmony, Type III (Ch. 5)</h4>
      <p className="schillinger__hint">
        Roots on the points of symmetry of the octave, each step a tonal cycle (p.396): two tonics
        C-F#-C by C5 and C-5; three C-A♭-E by C3; four C-A-F#-E♭ by C3; six and twelve by C7 — the
        negative form runs the other way. The voices keep their positions through one transformation,
        so the original position returns on the first tonic after lcm(transformation period,
        tonics) ÷ tonics rounds: "two tonics produce a triple recurrence-cycle" for ↻ and ↺, and
        "const. 3 produces a closed system" (p.397-399). The structural group runs alongside the
        tonics, "S changes with each tonic."
      </p>
      <div className="schillinger__row">
        <label>
          Tonics
          <select value={t3Tonics} onChange={(e) => setT3Tonics(Number(e.target.value) as Exclude<TonicCount, 1>)}>
            {([2, 3, 4, 6, 12] as const).map((n) => (
              <option key={n} value={n}>
                {n} tonics
              </option>
            ))}
          </select>
        </label>
        <label>
          Form
          <select value={t3Form} onChange={(e) => setT3Form(e.target.value as "positive" | "negative")}>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        </label>
        <label>
          Transformation
          <select value={t3Transform} onChange={(e) => setT3Transform(e.target.value as TransformDirection)}>
            {(Object.keys(TRANSFORM_LABELS) as TransformDirection[]).map((t) => (
              <option key={t} value={t}>
                {TRANSFORM_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Structural group
          <input type="text" value={t3StructuresText} onChange={(e) => setT3StructuresText(e.target.value)} />
        </label>
      </div>
      <div className="schillinger__readout">
        Roots {t3Roots.tonics.map((pc) => noteName(root + pc).replace(/\d+$/, "")).join("-")} by{" "}
        {t3Roots.cycles.join(", ")}; recurrence-cycles: {recurrenceCycles(t3Tonics, t3Transform)}
        {recurrenceCycles(t3Tonics, t3Transform) === 1 ? " (a closed system)" : " (a continuous system)"}
        {t3 && (
          <>
            <br />
            {t3Chords.map(chordLabel).join(" · ")}
            <br />
            Positions: {t3.voicings.map(voicingPosition).join(" · ")}
          </>
        )}
      </div>
      <NotePlayback notes={t3Notes} lengthUnits={t3Chords.length} fileName="schillinger-type-iii.mid" />
    </section>
  );
}
