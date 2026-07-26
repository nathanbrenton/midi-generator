import { useEffect, useMemo, useRef, useState } from "react";
import { chunkIntoPieces, divisorsOf, homogeneousContinuityParts } from "../core/homogeneousContinuity";
import type { Resultant } from "../core/resultant";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const LANE_PALETTE = [
  { color: "#3a6ea8", highlight: "#6a9bd6" },
  { color: "#c9932f", highlight: "#e8b95c" },
  { color: "#3c8a5c", highlight: "#5fb884" },
  { color: "#8a6fb0", highlight: "#b09bd6" },
  { color: "#b0553f", highlight: "#d68a72" },
];
const LANE_NOTES = [60, 64, 67, 71, 74];

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

export default function HomogeneousContinuityPanel({ resultant }: { resultant: Resultant }) {
  const segmentDurations = useMemo(() => resultant.segments.map((s) => s.duration), [resultant]);
  const divisorOptions = useMemo(
    () => divisorsOf(segmentDurations.length).filter((d) => d > 1),
    [segmentDurations],
  );
  const [divisorIndex, setDivisorIndex] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  useEffect(() => {
    setDivisorIndex(0);
  }, [divisorOptions.length]);

  const divisor = divisorOptions[divisorIndex] ?? divisorOptions[0] ?? null;

  const parts: number[][] = useMemo(() => {
    if (!divisor) return [];
    const pieces = chunkIntoPieces(segmentDurations, divisor);
    return homogeneousContinuityParts(pieces).map((part) => part.flat());
  }, [segmentDurations, divisor]);

  const cycleLength = parts[0]?.reduce((sum, v) => sum + v, 0) ?? 0;

  const lanes: PianoRollLane[] = useMemo(
    () =>
      parts.map((part, index) => ({
        label: `Part ${index + 1}`,
        ...LANE_PALETTE[index % LANE_PALETTE.length],
        segments: part.map((duration) => ({ duration })),
      })),
    [parts],
  );

  const notes: NoteEvent[] = useMemo(() => {
    const events: NoteEvent[] = [];
    parts.forEach((part, voice) => {
      let cursor = 0;
      const midiNote = LANE_NOTES[voice % LANE_NOTES.length];
      for (const duration of part) {
        events.push({ midiNote, startUnits: cursor, durationUnits: duration * 0.9, velocity: 90, voice });
        cursor += duration;
      }
    });
    return events;
  }, [parts]);

  const timeSignature = { beatsPerBar: resultant.cycleLength, unitsPerBeat: 1 };

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
    link.download = `schillinger-homogeneous-continuity-${divisor ?? 0}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Composition of Homogeneous Rhythmic Continuity (Book I, Ch. 11)</h3>
        <p className="schillinger__hint">
          Splits the active resultant into equal pieces (by its simplest divisor, or by individual
          segments), then builds one part per piece: each part is every circular rotation of the
          pieces concatenated in turn, starting one rotation later than the part before it — a canon
          where every part eventually states every rotation, just out of phase with the others (book's
          own Figure 124, p. 67).
        </p>
        {divisorOptions.length > 0 ? (
          <>
            <div className="schillinger__row">
              <label>
                Split into pieces
                <select value={divisorIndex} onChange={(e) => setDivisorIndex(Number(e.target.value))}>
                  {divisorOptions.map((d, index) => (
                    <option key={d} value={index}>
                      {d} piece{d === 1 ? "" : "s"} of {segmentDurations.length / d} segment
                      {segmentDurations.length / d === 1 ? "" : "s"} each
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <SchillingerPianoRoll
              lanes={lanes}
              cycleLength={cycleLength}
              timeSignature={timeSignature}
              playheadFraction={isPlaying ? playheadFraction : undefined}
            />
            <div className="schillinger__readout">
              {divisor} pieces → {divisor} parts, each {divisor} rotations × {segmentDurations.length / (divisor ?? 1)} segments/piece ={" "}
              {cycleLength} units long
            </div>
          </>
        ) : (
          <div className="schillinger__readout">
            The active resultant's {segmentDurations.length} segments can't be split into equal pieces
            greater than 1.
          </div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (homogeneous continuity)</h3>
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
