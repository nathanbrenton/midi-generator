import { useEffect, useMemo, useRef, useState } from "react";
import {
  axisInversionCombinationCount,
  buildMelodicContinuity,
  continuityOrderings,
  type ContinuitySegmentSpec,
} from "../core/melodicContinuity";
import type { AxisType } from "../core/melodicAxes";
import type { GeometricalPosition } from "../core/geometricalInversions";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function parseSegments(text: string): ContinuitySegmentSpec[] {
  const segments: ContinuitySegmentSpec[] = [];
  for (const raw of text.split(",")) {
    const token = raw.trim();
    if (!token) continue;
    const match = token.match(/^([0abcd])(\d+)\/([abcd])(?:\*(\d+(?:\.\d+)?))?$/);
    if (!match) continue;
    const [, axis, timeUnits, position, coefficient] = match;
    segments.push({
      term: { axis: axis as AxisType, timeUnits: Number(timeUnits) },
      position: position as GeometricalPosition,
      expansionCoefficient: coefficient ? Number(coefficient) : undefined,
    });
  }
  return segments;
}

function formatSegment(spec: ContinuitySegmentSpec): string {
  const coeff = spec.expansionCoefficient !== undefined && spec.expansionCoefficient !== 1 ? `*${spec.expansionCoefficient}` : "";
  return `${spec.term.axis}${spec.term.timeUnits}/${spec.position}${coeff}`;
}

export default function MelodicContinuityPanel() {
  const [segmentsText, setSegmentsText] = useState("a2/a,b1/d*2,a3/a,b1/c");
  const [axisPitch, setAxisPitch] = useState(60);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const segments = useMemo(() => parseSegments(segmentsText), [segmentsText]);
  const continuity = useMemo(
    () => (segments.length > 0 ? buildMelodicContinuity(segments, axisPitch, 1) : []),
    [segments, axisPitch],
  );
  const orderingCount = useMemo(() => (segments.length > 0 ? continuityOrderings(segments).length : 0), [segments]);

  function shuffleOrder() {
    const shuffled = [...segments];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSegmentsText(shuffled.map(formatSegment).join(","));
  }

  const notes: NoteEvent[] = useMemo(() => {
    return continuity.map((n) => ({
      midiNote: n.midiNote,
      startUnits: n.startUnits,
      durationUnits: n.durationUnits * 0.9,
      velocity: 95,
      voice: 0,
    }));
  }, [continuity]);

  const secondsPerUnit = 60 / bpm;
  const cycleLength = continuity.length;
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
    link.download = "schillinger-melodic-continuity.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Composition of Melodic Continuity (Book IV, Ch. 5-6)</h3>
      <p className="schillinger__hint">
        A melodic continuity is built from independent axis-segments (Ch. 3), each of which can
        separately choose one of Book III Ch. 1's 4 geometrical positions and its own Book III Ch. 2
        tonal-expansion coefficient — "different axes may appear with different coefficients of
        expansion" (p.313). For N segments, that's 4^N total inversion combinations alone, confirmed
        against the book's own worked example: 3 axes → 4³ = 64. Enter segments as{" "}
        <code>axis+timeUnits/position[*coefficient]</code>, comma-separated — e.g. <code>a2/a</code> or{" "}
        <code>b1/d*2</code>.
      </p>
      <div className="schillinger__row">
        <label>
          Segments (axis+timeUnits/position[*coefficient])
          <input type="text" value={segmentsText} onChange={(e) => setSegmentsText(e.target.value)} />
        </label>
        <label>
          Primary axis (MIDI note)
          <input type="number" min={0} max={120} value={axisPitch} onChange={(e) => setAxisPitch(Number(e.target.value))} />
        </label>
        <button type="button" onClick={shuffleOrder} disabled={segments.length < 2}>
          Shuffle order
        </button>
      </div>
      <div className="schillinger__readout">
        {segments.length > 0 ? (
          <>
            {segments.length} segment{segments.length === 1 ? "" : "s"}:{" "}
            {axisInversionCombinationCount(segments.length).toLocaleString()} geometrical-position
            combinations (4^{segments.length}) · {orderingCount.toLocaleString()} orderings (
            {segments.length}!)
          </>
        ) : (
          "Enter at least one segment above."
        )}
      </div>
      <div className="schillinger__readout">
        {continuity.length > 0 ? (
          <>Continuity: {continuity.map((n) => `${noteName(n.midiNote)}@${n.startUnits}`).join(" ")}</>
        ) : (
          "No notes yet."
        )}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
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
    </section>
  );
}
