import { useEffect, useMemo, useRef, useState } from "react";
import { distributivePower, synchronizeToPower } from "../core/distributivePowers";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const MAX_TERMS = 4;
const MAX_TOTAL_TERMS = 64;
const THEME_COLORS = { color: "#3a6ea8", highlight: "#6a9bd6" };
const COUNTERTHEME_COLORS = { color: "#c9932f", highlight: "#e8b95c" };

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

function parseTerms(text: string): number[] {
  const values = text
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value));
  return values.slice(0, MAX_TERMS);
}

export default function DistributivePowersPanel() {
  const [termsText, setTermsText] = useState("2,1");
  const [power, setPower] = useState(2);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const terms = useMemo(() => parseTerms(termsText), [termsText]);
  const maxPower = useMemo(() => {
    if (terms.length < 2) return 2;
    return Math.max(2, Math.floor(Math.log(MAX_TOTAL_TERMS) / Math.log(terms.length)));
  }, [terms]);
  const clampedPower = Math.min(power, maxPower);

  const theme = useMemo(
    () => (terms.length >= 2 ? synchronizeToPower(terms, 1, clampedPower) : []),
    [terms, clampedPower],
  );
  const countertheme = useMemo(
    () => (terms.length >= 2 ? distributivePower(terms, clampedPower) : []),
    [terms, clampedPower],
  );

  const cycleLength = theme.reduce((sum, v) => sum + v, 0);

  const lanes: PianoRollLane[] = useMemo(() => {
    if (terms.length < 2) return [];
    return [
      { label: `Theme (power ${clampedPower})`, ...THEME_COLORS, segments: theme.map((d) => ({ duration: d })) },
      {
        label: `Countertheme (power ${clampedPower})`,
        ...COUNTERTHEME_COLORS,
        segments: countertheme.map((d) => ({ duration: d })),
      },
    ];
  }, [terms, theme, countertheme, clampedPower]);

  const notes: NoteEvent[] = useMemo(() => {
    const events: NoteEvent[] = [];
    let cursor = 0;
    for (const duration of theme) {
      events.push({ midiNote: 60, startUnits: cursor, durationUnits: duration * 0.9, velocity: 100, voice: 0 });
      cursor += duration;
    }
    cursor = 0;
    for (const duration of countertheme) {
      events.push({ midiNote: 48, startUnits: cursor, durationUnits: duration * 0.9, velocity: 80, voice: 1 });
      cursor += duration;
    }
    return events;
  }, [theme, countertheme]);

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
    link.download = `schillinger-distributive-power-${clampedPower}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Distributive Powers (Book I, Ch. 12)</h3>
        <p className="schillinger__hint">
          A distributive power keeps every product term separate rather than collapsing like terms —
          the countertheme is every ordered product of the terms taken `power` at a time (n^power
          terms), while the theme is the original terms scaled up to match its total. Both always sum
          to the same total (sum(terms)^power), so they play in sync as theme and countertheme (book's
          own worked example: (2+1)² = 4+2+2+1, synchronized with 3·(2+1) = 6+3).
        </p>
        <div className="schillinger__row">
          <label>
            Terms (comma-separated, up to {MAX_TERMS})
            <input type="text" value={termsText} onChange={(e) => setTermsText(e.target.value)} />
          </label>
          <label>
            Power
            <input
              type="number"
              min={2}
              max={maxPower}
              value={clampedPower}
              onChange={(e) => setPower(Math.min(maxPower, Math.max(2, Number(e.target.value))))}
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
              {terms.length} terms, power {clampedPower} → theme {theme.length} terms, countertheme{" "}
              {countertheme.length} terms (= {terms.length}^{clampedPower}) · both total {cycleLength} units
            </div>
          </>
        ) : (
          <div className="schillinger__readout">Enter at least 2 comma-separated positive integers.</div>
        )}
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (distributive powers)</h3>
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
