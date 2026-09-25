import { useEffect, useMemo, useRef, useState } from "react";
import {
  voiceOrders,
  automaticChromaticContinuity,
  automaticContinuityFormCount,
  VOICES,
  type ChromaticDirection,
  type Voice,
} from "../core/automaticChromaticContinuity";
import { S5_STRUCTURES, type StructureId } from "../core/symmetricHarmony";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function AutomaticChromaticContinuityPanel() {
  const [root, setRoot] = useState(60);
  const [structure, setStructure] = useState<StructureId>(1);
  const orders = useMemo(() => voiceOrders(), []);
  const [orderIndex, setOrderIndex] = useState(0);
  const [direction, setDirection] = useState<ChromaticDirection>("down");
  const [groupLimit, setGroupLimit] = useState(3);

  const [bpm, setBpm] = useState(160);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const order = orders[orderIndex] as [Voice, Voice, Voice];
  const allSteps = useMemo(() => automaticChromaticContinuity(structure, order, direction, root), [structure, order, direction, root]);
  const steps = useMemo(() => allSteps.filter((s) => s.group < groupLimit), [allSteps, groupLimit]);
  const formCount = useMemo(() => automaticContinuityFormCount(), []);

  const notes: NoteEvent[] = useMemo(() => {
    return steps.flatMap((step, i) => VOICES.map((voice, voiceIndex) => ({
      midiNote: step.pitches[voice],
      startUnits: i,
      durationUnits: 0.9,
      velocity: 90,
      voice: voiceIndex,
    })));
  }, [steps]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = steps.length * secondsPerUnit;

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
      gain.gain.setValueAtTime(0.1, noteStart);
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
    link.download = "schillinger-automatic-chromatic-continuity.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Automatic Chromatic Continuities (Book V, Ch. 16, Section A)</h3>
      <p className="schillinger__hint">
        A plain S(5) triad (Soprano=fifth, Alto=third, Tenor=root) walks chromatically: within each of
        12 semitone-transposed "groups," the 3 voices are altered one at a time, cumulatively, in a
        chosen order — "SAT produce 6 variations of the sequence" (p.545). 3 modifications × 12 groups
        = 36 chords, closing on the 37th (identical to the 1st, an octave over). {formCount} total forms
        exist across all 4 triad structures × 6 orders × 2 directions.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Structure
          <select value={structure} onChange={(e) => setStructure(Number(e.target.value) as StructureId)}>
            {([1, 2, 3, 4] as StructureId[]).map((s) => (
              <option key={s} value={s}>
                {S5_STRUCTURES[s].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Voice order
          <select value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))}>
            {orders.map((o, i) => (
              <option key={i} value={i}>
                {o.join("")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direction
          <select value={direction} onChange={(e) => setDirection(e.target.value as ChromaticDirection)}>
            <option value="down">Down</option>
            <option value="up">Up</option>
          </select>
        </label>
        <label>
          Groups to show
          <input type="number" min={1} max={12} value={groupLimit} onChange={(e) => setGroupLimit(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__readout">
        {steps.length} chords: {steps.map((s) => VOICES.map((v) => noteName(s.pitches[v])).join("-")).join(" · ")}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={300} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
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
