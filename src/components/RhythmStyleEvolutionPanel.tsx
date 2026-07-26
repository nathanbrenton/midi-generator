import { useEffect, useMemo, useRef, useState } from "react";
import { interferenceGroupSizes, traceOrigin } from "../core/rhythmStyleEvolution";
import { generateResultant, generatorPulse } from "../core/resultant";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const LANE_COLORS = {
  resultant: { color: "#3a6ea8", highlight: "#6a9bd6" },
  generator: { color: "#3c8a5c", highlight: "#5fb884" },
};

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

const GROUP_SIZE_COUNT = 5;

export default function RhythmStyleEvolutionPanel() {
  const [x, setX] = useState(5);
  const [y, setY] = useState(3);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const valid = Number.isInteger(x) && Number.isInteger(y) && x >= 1 && y >= 1;
  const origin = useMemo(() => (valid ? traceOrigin(x, y) : null), [valid, x, y]);
  const resultant = useMemo(() => (origin ? generateResultant([origin.a, origin.b]) : null), [origin]);
  const groupSizes = useMemo(() => interferenceGroupSizes(GROUP_SIZE_COUNT), []);

  const lanes: PianoRollLane[] = useMemo(() => {
    if (!resultant || !origin) return [];
    return [
      {
        label: `Generator A (${origin.a})`,
        ...LANE_COLORS.generator,
        segments: generatorPulse(origin.a, resultant.cycleLength).map((s) => ({ duration: s.duration })),
      },
      {
        label: `Generator B (${origin.b})`,
        ...LANE_COLORS.generator,
        segments: generatorPulse(origin.b, resultant.cycleLength).map((s) => ({ duration: s.duration })),
      },
      {
        label: `Resultant (${origin.a}:${origin.b})`,
        ...LANE_COLORS.resultant,
        segments: resultant.segments.map((s) => ({ duration: s.duration, accent: s.sources.length > 1 })),
      },
    ];
  }, [resultant, origin]);

  const notes: NoteEvent[] = useMemo(() => {
    if (!resultant) return [];
    let cursor = 0;
    const events: NoteEvent[] = [];
    for (const segment of resultant.segments) {
      events.push({ midiNote: 60, startUnits: cursor, durationUnits: segment.duration * 0.9, velocity: 95, voice: 0 });
      cursor += segment.duration;
    }
    return events;
  }, [resultant]);

  const cycleLength = resultant?.cycleLength ?? 0;
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
    link.download = `schillinger-traced-origin-${origin?.a ?? 0}-${origin?.b ?? 0}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Evolution of Rhythm Styles (Book I, Ch. 13)</h3>
        <p className="schillinger__hint">
          Traces a short 2-attack rhythmic fragment back to the two-generator resultant it came from:
          the greater of the two durations is the minor generator (b), and their sum is the major
          generator (a) — the book's own example, a 5+3 fragment, traces back to r(8:5) (p. 84-85).
          Enter any two durations to find (and hear) the full resultant they open.
        </p>
        <div className="schillinger__row">
          <label>
            First duration (x)
            <input type="number" min={1} max={20} value={x} onChange={(e) => setX(Number(e.target.value))} />
          </label>
          <label>
            Second duration (y)
            <input type="number" min={1} max={20} value={y} onChange={(e) => setY(Number(e.target.value))} />
          </label>
        </div>

        {resultant && origin ? (
          <>
            <SchillingerPianoRoll
              lanes={lanes}
              cycleLength={cycleLength}
              timeSignature={timeSignature}
              playheadFraction={isPlaying ? playheadFraction : undefined}
            />
            <div className="schillinger__readout">
              Traced origin: a = {origin.a}, b = {origin.b} · r({origin.a}:{origin.b}) opens with{" "}
              {resultant.segments[0]?.duration}, {resultant.segments[1]?.duration} — confirming the input
              fragment {x}, {y}
            </div>
            <div className="schillinger__readout">
              Interference-group sizes (i₁..i₅, i_n = 2·i_(n-1) − 1): {groupSizes.join(", ")}
            </div>
          </>
        ) : (
          <div className="schillinger__readout">Enter two positive integers.</div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (traced resultant)</h3>
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
