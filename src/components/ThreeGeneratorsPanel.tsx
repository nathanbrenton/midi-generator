import { useEffect, useMemo, useRef, useState } from "react";
import {
  THREE_GENERATOR_CASES,
  commonProduct,
  complementaryFactors,
  buildTheme,
  buildCountertheme,
  threeGeneratorGroupings,
} from "../core/threeGenerators";
import { buildMidiFile } from "../core/midi";
import type { NoteEvent } from "../core/melody";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const THEME_COLORS = { color: "#3a6ea8", highlight: "#6a9bd6" };
const COUNTERTHEME_COLORS = { color: "#c9932f", highlight: "#e8b95c" };
const THEME_NOTE = 60; // C4
const COUNTERTHEME_NOTE = 48; // C3

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

export default function ThreeGeneratorsPanel() {
  const [caseIndex, setCaseIndex] = useState(0);
  const [groupingIndex, setGroupingIndex] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const activeCase = THREE_GENERATOR_CASES[caseIndex];
  const generators = activeCase.generators;

  const product = useMemo(() => commonProduct(generators), [generators]);
  const factors = useMemo(() => complementaryFactors(generators), [generators]);
  const theme = useMemo(() => buildTheme(generators), [generators]);
  const countertheme = useMemo(() => buildCountertheme(generators), [generators]);
  const groupings = useMemo(() => threeGeneratorGroupings(generators), [generators]);

  useEffect(() => {
    setGroupingIndex(0);
  }, [generators]);

  const selectedGrouping = groupings[groupingIndex] ?? groupings[0];
  const timeSignature = { beatsPerBar: selectedGrouping.unitsPerBar, unitsPerBeat: 1 };

  const lanes: PianoRollLane[] = useMemo(
    () => [
      {
        label: `Theme r (${generators.join(":")})`,
        ...THEME_COLORS,
        segments: theme.segments.map((s) => ({ duration: s.duration, accent: s.sources.length > 1 })),
      },
      {
        label: `Countertheme r' (${factors.join(":")})`,
        ...COUNTERTHEME_COLORS,
        segments: countertheme.segments.map((s) => ({ duration: s.duration, accent: s.sources.length > 1 })),
      },
    ],
    [theme, countertheme, generators, factors],
  );

  const notes: NoteEvent[] = useMemo(() => {
    let cursor = 0;
    const themeNotes: NoteEvent[] = theme.segments.map((segment) => {
      const note: NoteEvent = {
        midiNote: THEME_NOTE,
        startUnits: cursor,
        durationUnits: segment.duration * 0.9,
        velocity: segment.sources.length > 1 ? 115 : 90,
        voice: 0,
      };
      cursor += segment.duration;
      return note;
    });
    cursor = 0;
    const counterthemeNotes: NoteEvent[] = countertheme.segments.map((segment) => {
      const note: NoteEvent = {
        midiNote: COUNTERTHEME_NOTE,
        startUnits: cursor,
        durationUnits: segment.duration * 0.9,
        velocity: segment.sources.length > 1 ? 100 : 75,
        voice: 1,
      };
      cursor += segment.duration;
      return note;
    });
    return [...themeNotes, ...counterthemeNotes];
  }, [theme, countertheme]);

  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleSeconds = product * secondsPerUnit;

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
    link.download = `schillinger-${generators.join("-")}-theme-countertheme.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="schillinger">
      <section className="schillinger__section schillinger__section--wide">
        <h3>Three or More Generators (Book I, Ch. 6)</h3>
        <p className="schillinger__hint">
          Generators from the same "series of growth" (a Fibonacci-like summation series) share a
          rhythmic family. Synchronizing them pairs their own resultant (the theme, r) with the
          resultant of their complementary factors (the countertheme, r') — both sharing the same
          cycle length, the common product.
        </p>
        <div className="schillinger__row">
          <label>
            Case
            <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))}>
              {THREE_GENERATOR_CASES.map((c, index) => (
                <option key={c.label} value={index}>
                  {c.label} ({c.series})
                </option>
              ))}
            </select>
          </label>
          <label>
            Bar grouping
            <select value={groupingIndex} onChange={(e) => setGroupingIndex(Number(e.target.value))}>
              {groupings.map((g, index) => (
                <option key={g.label} value={index}>
                  {g.bars} × {g.unitsPerBar}
                </option>
              ))}
            </select>
          </label>
        </div>

        <SchillingerPianoRoll
          lanes={lanes}
          cycleLength={product}
          timeSignature={timeSignature}
          playheadFraction={isPlaying ? playheadFraction : undefined}
        />

        <div className="schillinger__readout">
          Common product {product} · complementary factors {factors.join(", ")} · theme durations{" "}
          {theme.segments.map((s) => s.duration).join(" ")} · countertheme durations{" "}
          {countertheme.segments.map((s) => s.duration).join(" ")}
        </div>
        <div className="schillinger__readout">
          Grouping available through: {groupings.map((g) => g.unitsPerBar).join(", ")}
        </div>
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback</h3>
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
    </div>
  );
}
