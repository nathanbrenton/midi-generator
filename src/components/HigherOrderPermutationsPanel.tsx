import { useEffect, useMemo, useRef, useState } from "react";
import { higherOrderElements } from "../core/higherOrderPermutations";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const MAX_ELEMENTS_PER_SEED = 4;
const MAX_ORDER = 6;
const LANE_PALETTE = [
  { color: "#3a6ea8", highlight: "#6a9bd6" },
  { color: "#c9932f", highlight: "#e8b95c" },
];
const LANE_NOTES = [60, 48];

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

function parseSeed(text: string): number[] {
  const values = text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value));
  return values.slice(0, MAX_ELEMENTS_PER_SEED);
}

export default function HigherOrderPermutationsPanel() {
  const [seedAText, setSeedAText] = useState("2");
  const [seedBText, setSeedBText] = useState("1");
  const [order, setOrder] = useState(3);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const seedA = useMemo(() => parseSeed(seedAText), [seedAText]);
  const seedB = useMemo(() => parseSeed(seedBText), [seedBText]);
  const seedsValid = seedA.length > 0 && seedB.length > 0;

  const elements = useMemo(
    () => (seedsValid ? higherOrderElements([seedA, seedB], order) : []),
    [seedsValid, seedA, seedB, order],
  );

  const cycleLength = elements[0]?.reduce((sum, v) => sum + v, 0) ?? 0;

  const lanes: PianoRollLane[] = useMemo(
    () =>
      elements.map((element, index) => ({
        label: index === 0 ? `a${order}` : `b${order}`,
        ...LANE_PALETTE[index % LANE_PALETTE.length],
        segments: element.map((duration) => ({ duration })),
      })),
    [elements, order],
  );

  const notes: NoteEvent[] = useMemo(() => {
    const events: NoteEvent[] = [];
    elements.forEach((element, voice) => {
      let cursor = 0;
      const midiNote = LANE_NOTES[voice % LANE_NOTES.length];
      for (const duration of element) {
        events.push({ midiNote, startUnits: cursor, durationUnits: duration * 0.9, velocity: 90, voice });
        cursor += duration;
      }
    });
    return events;
  }, [elements]);

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
      oscillator.type = note.voice === 0 ? "sine" : "triangle";
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
    link.download = `schillinger-higher-order-${order}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Generalization of Variation Techniques (Book I, Ch. 10)</h3>
        <p className="schillinger__hint">
          Two seed elements grow through successive "orders": at each order, element a becomes
          a+b and element b becomes b+a, using the *previous* order's own (already-grown) a and b —
          an ever-longer, ever-varying pair of voices built from a tiny seed, staying at exactly 2
          simultaneous parts forever while their length doubles every order (book's own Figure 120,
          p. 63).
        </p>
        <div className="schillinger__row">
          <label>
            Seed a₁ (comma-separated, up to {MAX_ELEMENTS_PER_SEED})
            <input type="text" value={seedAText} onChange={(e) => setSeedAText(e.target.value)} />
          </label>
          <label>
            Seed b₁ (comma-separated, up to {MAX_ELEMENTS_PER_SEED})
            <input type="text" value={seedBText} onChange={(e) => setSeedBText(e.target.value)} />
          </label>
          <label>
            Order
            <input
              type="number"
              min={1}
              max={MAX_ORDER}
              value={order}
              onChange={(e) => setOrder(Math.min(MAX_ORDER, Math.max(1, Number(e.target.value))))}
            />
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
              Order {order} · each element {elements[0]?.length ?? 0} terms, {cycleLength} units long
              (seed length × 2{order > 1 ? `^${order - 1}` : ""})
            </div>
          </>
        ) : (
          <div className="schillinger__readout">Enter at least one positive integer for each seed.</div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (higher-order variation)</h3>
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
