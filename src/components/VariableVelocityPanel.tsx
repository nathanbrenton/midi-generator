import { useEffect, useMemo, useRef, useState } from "react";
import {
  NATURAL_HARMONIC_SERIES,
  SUMMATION_SERIES,
  PRIME_NUMBER_SERIES,
  accelerateGroup,
  shiftBalance,
} from "../core/variableVelocity";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const SERIES_OPTIONS: { label: string; values: readonly number[] }[] = [
  { label: "Natural harmonic series", values: NATURAL_HARMONIC_SERIES },
  { label: "Summation series I", values: SUMMATION_SERIES[0] },
  { label: "Summation series II", values: SUMMATION_SERIES[1] },
  { label: "Summation series III", values: SUMMATION_SERIES[2] },
  { label: "Prime number series", values: PRIME_NUMBER_SERIES },
];

const MAX_GROUP_ELEMENTS = 4;
const MAX_REPEATS = 6;
const LANE_COLORS = { color: "#3a6ea8", highlight: "#6a9bd6" };
const RUBATO_COLORS = [
  { color: "#3c8a5c", highlight: "#5fb884" },
  { color: "#c9932f", highlight: "#e8b95c" },
];

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

function parseGroup(text: string): number[] {
  return text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value))
    .slice(0, MAX_GROUP_ELEMENTS);
}

export default function VariableVelocityPanel() {
  const [groupText, setGroupText] = useState("3,1,2");
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [repeats, setRepeats] = useState(3);
  const [direction, setDirection] = useState<"decelerando" | "accelerando">("decelerando");
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const [rubatoX, setRubatoX] = useState(2);
  const [rubatoY, setRubatoY] = useState(2);
  const [tau, setTau] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const group = useMemo(() => parseGroup(groupText), [groupText]);
  const multipliers = useMemo(() => {
    const base = SERIES_OPTIONS[seriesIndex].values.slice(0, Math.min(repeats, MAX_REPEATS));
    return direction === "accelerando" ? [...base].reverse() : base;
  }, [seriesIndex, repeats, direction]);

  const accelerated = useMemo(
    () => (group.length > 0 ? accelerateGroup(group, multipliers) : []),
    [group, multipliers],
  );

  const cycleLength = accelerated.reduce((sum, v) => sum + v, 0);

  const lanes: PianoRollLane[] = useMemo(
    () => (accelerated.length > 0 ? [{ label: "Accelerated group", ...LANE_COLORS, segments: accelerated.map((d) => ({ duration: d })) }] : []),
    [accelerated],
  );

  const notes: NoteEvent[] = useMemo(() => {
    let cursor = 0;
    return accelerated.map((duration) => {
      const note: NoteEvent = { midiNote: 60, startUnits: cursor, durationUnits: duration * 0.9, velocity: 95, voice: 0 };
      cursor += duration;
      return note;
    });
  }, [accelerated]);

  const timeSignature = { beatsPerBar: cycleLength || 1, unitsPerBeat: 1 };

  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleSeconds = cycleLength * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || notes.length === 0) return;

    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit * 0.9;
      const peakGain = 0.15 * (note.velocity / 127);
      gain.gain.setValueAtTime(peakGain, noteStart);
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
    setPlayheadFraction(0);
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

  useEffect(() => {
    if (!isPlaying) return;
    let frame: number;
    function tick() {
      const context = audioContextRef.current;
      if (context && cycleSeconds > 0) {
        const elapsed = (context.currentTime - cycleStartRef.current) % cycleSeconds;
        setPlayheadFraction(elapsed / cycleSeconds);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, cycleSeconds]);

  function downloadMidi() {
    if (notes.length === 0) return;
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schillinger-variable-velocity.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const [shiftedX, shiftedY] = shiftBalance(rubatoX, rubatoY, tau);
  const rubatoLanes: PianoRollLane[] = [
    { label: "Original", ...RUBATO_COLORS[0], segments: [{ duration: rubatoX }, { duration: rubatoY }] },
    { label: "Shifted", ...RUBATO_COLORS[1], segments: [{ duration: shiftedX }, { duration: shiftedY }] },
  ];
  const rubatoCycleLength = rubatoX + rubatoY;

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Rhythms of Variable Velocities (Book I, Ch. 14)</h3>
        <p className="schillinger__hint">
          Repeats a duration-group, scaling each repetition by the next term of a named acceleration
          series — the book's own example, (3+1+2) scaled by the natural harmonic series 1, 2, 3,
          gives (3+1+2)+(6+2+4)+(9+3+6). Section D (Fermata) is left to notational judgment in the
          book, not a fixed formula, so isn't implemented here.
        </p>
        <div className="schillinger__row">
          <label>
            Group (comma-separated, up to {MAX_GROUP_ELEMENTS})
            <input type="text" value={groupText} onChange={(e) => setGroupText(e.target.value)} />
          </label>
          <label>
            Series
            <select value={seriesIndex} onChange={(e) => setSeriesIndex(Number(e.target.value))}>
              {SERIES_OPTIONS.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Repeats
            <input
              type="number"
              min={2}
              max={MAX_REPEATS}
              value={repeats}
              onChange={(e) => setRepeats(Math.min(MAX_REPEATS, Math.max(2, Number(e.target.value))))}
            />
          </label>
          <label>
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value as "decelerando" | "accelerando")}>
              <option value="decelerando">Decelerando (rallentando)</option>
              <option value="accelerando">Accelerando</option>
            </select>
          </label>
        </div>

        {lanes.length > 0 && (
          <>
            <SchillingerPianoRoll
              lanes={lanes}
              cycleLength={cycleLength}
              timeSignature={timeSignature}
              playheadFraction={isPlaying ? playheadFraction : undefined}
            />
            <div className="schillinger__readout">
              Multipliers {multipliers.join(", ")} · {accelerated.length} durations, {cycleLength} units total
            </div>
          </>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (variable velocity)</h3>
        <div className="schillinger__row">
          <label>
            Tempo
            <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
            bpm
          </label>
          <label>
            Unit note value
            <select value={ticksPerUnit} onChange={(e) => setTicksPerUnit(Number(e.target.value))}>
              {UNIT_NOTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Rubato</h3>
        <p className="schillinger__hint">
          Shifts a "unit of deviation" (τ) from one term of a binomial to the other — unbalancing a
          balanced binomial, or balancing an unbalanced one. The book's own example: Chopin's (2,2)
          unbalanced by τ=1 becomes (3,1); a swung (3,1) balanced by τ=−1 becomes (2,2). The total is
          always preserved.
        </p>
        <div className="schillinger__row">
          <label>
            x
            <input type="number" value={rubatoX} onChange={(e) => setRubatoX(Number(e.target.value))} />
          </label>
          <label>
            y
            <input type="number" value={rubatoY} onChange={(e) => setRubatoY(Number(e.target.value))} />
          </label>
          <label>
            τ (tau)
            <input type="number" step={0.5} value={tau} onChange={(e) => setTau(Number(e.target.value))} />
          </label>
        </div>
        <SchillingerPianoRoll
          lanes={rubatoLanes}
          cycleLength={rubatoCycleLength}
          timeSignature={{ beatsPerBar: rubatoCycleLength || 1, unitsPerBeat: 1 }}
        />
        <div className="schillinger__readout">
          ({rubatoX}, {rubatoY}) shifted by τ={tau} → ({shiftedX}, {shiftedY}) · both total {rubatoCycleLength}
        </div>
      </section>
    </>
  );
}
