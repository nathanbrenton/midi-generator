import { useEffect, useMemo, useRef, useState } from "react";
import { generalPermutations, circularPermutations } from "../core/permutations";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const MAX_ELEMENTS = 6;
const MAX_LANES = 24;
const LANE_PALETTE = [
  { color: "#3a6ea8", highlight: "#6a9bd6" },
  { color: "#c9932f", highlight: "#e8b95c" },
  { color: "#3c8a5c", highlight: "#5fb884" },
  { color: "#8a6fb0", highlight: "#b09bd6" },
  { color: "#b0553f", highlight: "#d68a72" },
  { color: "#4a9aa8", highlight: "#7cc6d4" },
];
const LANE_NOTES = [60, 64, 67, 71, 74, 77];

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

function parsePattern(text: string): number[] {
  const values = text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value));
  return values.slice(0, MAX_ELEMENTS);
}

export default function PermutationsPanel() {
  const [patternText, setPatternText] = useState("2,1,1");
  const [mode, setMode] = useState<"circular" | "general">("circular");
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const values = useMemo(() => parsePattern(patternText), [patternText]);
  const allRows = useMemo(
    () => (values.length < 2 ? [] : mode === "circular" ? circularPermutations(values) : generalPermutations(values)),
    [values, mode],
  );
  const rows = allRows.slice(0, MAX_LANES);
  const truncated = allRows.length > rows.length;

  const cycleLength = values.reduce((sum, v) => sum + v, 0);

  const lanes: PianoRollLane[] = useMemo(
    () =>
      rows.map((row, index) => ({
        label: `Row ${index + 1}`,
        ...LANE_PALETTE[index % LANE_PALETTE.length],
        segments: row.map((duration) => ({ duration })),
      })),
    [rows],
  );

  const notes: NoteEvent[] = useMemo(() => {
    const events: NoteEvent[] = [];
    rows.forEach((row, voice) => {
      let cursor = 0;
      const midiNote = LANE_NOTES[voice % LANE_NOTES.length];
      for (const duration of row) {
        events.push({ midiNote, startUnits: cursor, durationUnits: duration * 0.9, velocity: 90, voice });
        cursor += duration;
      }
    });
    return events;
  }, [rows]);

  const timeSignature = { beatsPerBar: cycleLength, unitsPerBeat: 1 };

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
      oscillator.type = note.voice % 2 === 0 ? "sine" : "triangle";
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
    link.download = `schillinger-permutations-${mode}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Homogeneous Simultaneity and Continuity (Book I, Ch. 9)</h3>
        <p className="schillinger__hint">
          Every reordering of a duration-group's own values is a "variation" of it. General
          permutations are every distinct reordering (n!, fewer when values repeat); circular
          permutations are just its n rotations. Each row here becomes its own simultaneous voice —
          Schillinger's own "bi-coordinate" idea: a sequence of variations down the page is continuity,
          stacking them as separate parts at once is simultaneity.
        </p>
        <div className="schillinger__row">
          <label>
            Pattern (comma-separated durations, up to {MAX_ELEMENTS})
            <input
              type="text"
              placeholder="2,1,1"
              value={patternText}
              onChange={(e) => setPatternText(e.target.value)}
            />
          </label>
          <label>
            Permutation type
            <select value={mode} onChange={(e) => setMode(e.target.value as "circular" | "general")}>
              <option value="circular">Circular (n rotations)</option>
              <option value="general">General (every distinct reordering)</option>
            </select>
          </label>
        </div>

        {lanes.length > 0 ? (
          <>
            <SchillingerPianoRoll
              lanes={lanes}
              cycleLength={cycleLength}
              timeSignature={timeSignature}
              playheadFraction={isPlaying ? playheadFraction : undefined}
            />
            <div className="schillinger__readout">
              {values.length} elements → {allRows.length} {mode} permutation{allRows.length === 1 ? "" : "s"}
              {truncated && ` (showing first ${rows.length})`}
            </div>
          </>
        ) : (
          <div className="schillinger__readout">Enter at least 2 comma-separated positive integers.</div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (permutations)</h3>
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
    </>
  );
}
