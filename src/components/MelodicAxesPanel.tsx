import { useEffect, useMemo, useRef, useState } from "react";
import { buildAxialMelody, type AxialTerm, type AxisType } from "../core/melodicAxes";
import { findPrimaryAxis } from "../core/melodicModulation";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const AXIS_LABELS: Record<AxisType, string> = {
  "0": "0 (stay at axis)",
  a: "a (ascend away from axis)",
  b: "b (descend toward axis)",
  c: "c (ascend toward axis)",
  d: "d (descend away from axis)",
};

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function parseAxialTerms(text: string): AxialTerm[] {
  const terms: AxialTerm[] = [];
  for (const raw of text.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const match = token.match(/^([0abcd])(\d+)(?::(\d+))?$/);
    if (!match) continue;
    const [, axis, timeUnits, pitchUnits] = match;
    terms.push({
      axis: axis as AxisType,
      timeUnits: Number(timeUnits),
      pitchUnits: pitchUnits ? Number(pitchUnits) : undefined,
    });
  }
  return terms;
}

function formatTerm(term: AxialTerm): string {
  return `${term.axis}${term.timeUnits}${term.pitchUnits !== undefined ? `:${term.pitchUnits}` : ""}`;
}

export default function MelodicAxesPanel() {
  const [termsText, setTermsText] = useState("a2,b1,a3,b1");
  const [axisPitch, setAxisPitch] = useState(60);
  const [ticksPerUnit, setTicksPerUnit] = useState(240);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const terms = useMemo(() => parseAxialTerms(termsText), [termsText]);
  const melody = useMemo(
    () => (terms.length > 0 ? buildAxialMelody(terms, axisPitch, 1) : []),
    [terms, axisPitch],
  );
  const primaryAxis = useMemo(
    () => (melody.length > 0 ? findPrimaryAxis(melody.map((n) => ({ midiNote: n.midiNote, durationUnits: n.durationUnits }))) : null),
    [melody],
  );

  const notes: NoteEvent[] = useMemo(() => {
    return melody.map((n) => ({
      midiNote: n.midiNote,
      startUnits: n.startUnits,
      durationUnits: n.durationUnits * 0.9,
      velocity: 95,
      voice: 0,
    }));
  }, [melody]);

  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleLength = melody.length;
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
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-melodic-axes.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Axes of Melody (Book IV, Ch. 3)</h3>
      <p className="schillinger__hint">
        A melody is a sequence of moves relative to a primary axis (p.246-263): <strong>0</strong> stays
        at the axis; <strong>a</strong> ascends away from it; <strong>d</strong> descends away from it
        (both using their own duration as the climb/descent, in time-units T); <strong>b</strong> and{" "}
        <strong>c</strong> always return fully to the axis — from above and below respectively —
        regardless of how far away the melody currently is, taking however many time-units are given.
        Confirmed against the book's own Figures 16 and 19 (rendered from the page, since the OCR text
        didn't capture them): "a2T+aT" climbs 2, resets, climbs 1; "a2T+bT" climbs 2 then returns fully
        to the axis in just 1 unit. Enter a comma-separated sequence like <code>a2,b1,a3,b1</code>{" "}
        (optionally <code>a2:4</code> to set an explicit pitch distance independent of the time
        duration, per Section H's general notation).
      </p>
      <div className="schillinger__row">
        <label>
          Axial terms (comma-separated: axis+timeUnits[:pitchUnits])
          <input type="text" value={termsText} onChange={(e) => setTermsText(e.target.value)} />
        </label>
        <label>
          Primary axis (MIDI note)
          <input type="number" min={0} max={120} value={axisPitch} onChange={(e) => setAxisPitch(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__readout">
        Parsed: {terms.map(formatTerm).join(" + ") || "(none — check the format)"}
      </div>
      <div className="schillinger__readout">
        {melody.length > 0 ? (
          <>Melody: {melody.map((n) => `${noteName(n.midiNote)}@${n.startUnits}`).join(" ")}</>
        ) : (
          "Enter at least one axial term above."
        )}
      </div>
      {primaryAxis && (
        <div className="schillinger__readout">
          Primary Axis (Section A, p.246): {noteName(primaryAxis.midiNote)} — total duration{" "}
          {primaryAxis.totalDuration}
        </div>
      )}
      <div className="schillinger__readout">Axis types: {(Object.keys(AXIS_LABELS) as AxisType[]).map((k) => AXIS_LABELS[k]).join(" · ")}</div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>
        <label>
          Unit note value
          <select value={ticksPerUnit} onChange={(e) => setTicksPerUnit(Number(e.target.value))}>
            <option value={120}>Sixteenth note</option>
            <option value={240}>Eighth note</option>
            <option value={480}>Quarter note</option>
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
  );
}
