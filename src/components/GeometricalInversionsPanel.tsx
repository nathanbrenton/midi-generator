import { useEffect, useMemo, useRef, useState } from "react";
import { allFourPositions, type GeometricalPosition, type TimedNote } from "../core/geometricalInversions";
import { geometricalExpansion } from "../core/geometricalExpansions";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const POSITION_LABELS: Record<GeometricalPosition, string> = {
  a: "(a) original",
  b: "(b) backward",
  c: "(c) backward + upside-down",
  d: "(d) forward + upside-down",
};

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function parseMelody(text: string): TimedNote[] {
  return text
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [pitch, start, duration] = token.split(":").map(Number);
      return { midiNote: pitch, startUnits: start, durationUnits: duration };
    })
    .filter(
      (n) =>
        Number.isFinite(n.midiNote) &&
        Number.isFinite(n.startUnits) &&
        Number.isFinite(n.durationUnits) &&
        n.durationUnits > 0 &&
        n.startUnits >= 0,
    );
}

function formatMelody(notes: readonly TimedNote[]): string {
  return notes.map((n) => `${noteName(n.midiNote)}@${n.startUnits}(${n.durationUnits})`).join(" ");
}

export default function GeometricalInversionsPanel() {
  const [melodyText, setMelodyText] = useState("60:0:2,64:2:1,67:4:2,74:7:3");
  const [axis, setAxis] = useState(67);
  const [pitchCoefficient, setPitchCoefficient] = useState(1);
  const [timeCoefficient, setTimeCoefficient] = useState(1);

  const [selectedLabel, setSelectedLabel] = useState<GeometricalPosition>("a");
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const melody = useMemo(() => parseMelody(melodyText), [melodyText]);
  const expanded = useMemo(
    () => (melody.length > 0 ? geometricalExpansion(melody, axis, pitchCoefficient, timeCoefficient) : []),
    [melody, axis, pitchCoefficient, timeCoefficient],
  );
  const positions = useMemo(() => (expanded.length > 0 ? allFourPositions(expanded, axis) : null), [expanded, axis]);

  const selectedNotes = positions ? positions[selectedLabel] : [];

  const notes: NoteEvent[] = useMemo(() => {
    return selectedNotes.map((n) => ({
      midiNote: n.midiNote,
      startUnits: n.startUnits,
      durationUnits: n.durationUnits * 0.9,
      velocity: 95,
      voice: 0,
    }));
  }, [selectedNotes]);

  const secondsPerUnit = 60 / bpm;
  const cycleLength = useMemo(
    () => (selectedNotes.length > 0 ? Math.max(...selectedNotes.map((n) => n.startUnits + n.durationUnits)) : 0),
    [selectedNotes],
  );
  const cycleSeconds = cycleLength * secondsPerUnit;

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
      gain.gain.setValueAtTime(0.15, noteStart);
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
    link.download = `schillinger-geometrical-inversion-${selectedLabel}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Geometrical Inversions and Expansions (Book III, Ch. 1-2)</h3>
      <p className="schillinger__hint">
        A melody has four "geometrical positions": (a) the original; (b) the same thing backwards
        (retrograde — time-reversed, pitches unchanged); (c) backwards and upside-down (retrograde
        inversion); (d) forwards and upside-down (inversion only). Pitch inversion reflects each note
        around a chosen axis: invertedPitch = 2·axis − pitch (p.185-199). Geometrical expansion
        (Ch. 2) stretches the pitch and/or time axes by a coefficient before that — the book's own
        example, expanding c-d-e-f-g by 2p, gives c-e-g#-a#-d (p.208); a coefficient under 1
        contracts instead. "All geometrical expansions are subject to geometrical inversions as
        well" (p.220), so the two compose directly below. Click a position to load it into playback.
      </p>
      <div className="schillinger__row">
        <label>
          Melody (midiNote:startUnits:durationUnits, comma-separated)
          <input type="text" value={melodyText} onChange={(e) => setMelodyText(e.target.value)} />
        </label>
        <label>
          Axis (MIDI note)
          <input type="number" min={0} max={120} value={axis} onChange={(e) => setAxis(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__row">
        <label>
          Pitch coefficient (2p, 3p, ... or &lt;1 to contract)
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={pitchCoefficient}
            onChange={(e) => setPitchCoefficient(Number(e.target.value))}
          />
        </label>
        <label>
          Time coefficient (2t, 3t, ... or &lt;1 to contract)
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={timeCoefficient}
            onChange={(e) => setTimeCoefficient(Number(e.target.value))}
          />
        </label>
      </div>
      {positions ? (
        <div className="schillinger__readout">
          {(Object.keys(POSITION_LABELS) as GeometricalPosition[]).map((key) => (
            <div key={key}>
              {POSITION_LABELS[key]}: {formatMelody(positions[key])}
              <button type="button" onClick={() => setSelectedLabel(key)}>
                {selectedLabel === key ? "Selected" : "Select"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="schillinger__readout">Enter a melody above.</div>
      )}

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>
      </div>
      <div className="schillinger__readout">
        Selected: {POSITION_LABELS[selectedLabel]} → {formatMelody(selectedNotes)}
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
  );
}
