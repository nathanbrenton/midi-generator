import { useEffect, useMemo, useRef, useState } from "react";
import {
  diatonicCycle,
  binomialCycle,
  chordProgression,
  voiceLeadProgression,
  type CycleType,
  type TransformDirection,
  type Voicing,
} from "../core/diatonicHarmony";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const CYCLE_LABELS: Record<CycleType, string> = {
  3: "Cycle of the third (C3) — roots step by a 3rd",
  5: "Cycle of the fifth (C5) — the circle of fifths",
  7: "Cycle of the seventh (C7) — descending stepwise",
};

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function chordLabel(triad: readonly number[]): string {
  return triad.map(noteName).join("-");
}

function voicingToArray(voicing: Voicing): number[] {
  return [voicing.bass, voicing.root, voicing.third, voicing.fifth];
}

export default function DiatonicCyclesPanel() {
  const [root, setRoot] = useState(60);
  const [firstCycle, setFirstCycle] = useState<CycleType>(5);
  const [useBinomial, setUseBinomial] = useState(false);
  const [secondCycle, setSecondCycle] = useState<CycleType>(3);
  const [voiceLead, setVoiceLead] = useState(false);
  const [direction, setDirection] = useState<TransformDirection>("clockwise");

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const rootDegrees = useMemo(
    () => (useBinomial ? binomialCycle(firstCycle, secondCycle) : diatonicCycle(firstCycle)),
    [useBinomial, firstCycle, secondCycle],
  );
  const stackedProgression = useMemo(() => chordProgression(MAJOR_SCALE, root, rootDegrees), [root, rootDegrees]);
  const voiceLedProgression = useMemo(
    () => voiceLeadProgression(MAJOR_SCALE, root, rootDegrees, direction),
    [root, rootDegrees, direction],
  );
  const progression: number[][] = useMemo(
    () => (voiceLead ? voiceLedProgression.map(voicingToArray) : stackedProgression),
    [voiceLead, voiceLedProgression, stackedProgression],
  );

  const notes: NoteEvent[] = useMemo(() => {
    return progression.flatMap((chord, i) =>
      chord.map((midiNote, voice) => ({
        midiNote,
        startUnits: i,
        durationUnits: 0.9,
        velocity: 90,
        voice,
      })),
    );
  }, [progression]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = progression.length * secondsPerUnit;

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
    link.download = "schillinger-diatonic-cycle.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Diatonic Cycles (Book V, Ch. 1-2)</h3>
      <p className="schillinger__hint">
        Book V opens Special Theory of Harmony — chord structures and progressions. A root-position
        triad, S(5), stacks a scale's root, third, and fifth (p.211). A "diatonic cycle" steps the
        chord root by a constant scale-degree interval through all 7 degrees before repeating: the
        cycle of the fifth is exactly the circle of fifths (C-G-D-A-E-B-F); the cycle of the third
        gives C-E-G-B-D-F-A; the cycle of the seventh is purely descending stepwise motion, "a purely
        contrapuntal derivation" (p.363-369) — all three confirmed against real music theory before
        any code was written. A binomial progression concatenates two full cycles into 14 chords.
        Voice-leading (Sections C-D) reassigns each of the 3 upper voices to a new function in the
        next chord — clockwise sends root→third→fifth→root; counterclockwise sends root→fifth→third→
        root — placed at the nearest octave, plus a constant bass doubling the root (p.376-381).
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Cycle
          <select value={firstCycle} onChange={(e) => setFirstCycle(Number(e.target.value) as CycleType)}>
            {([3, 5, 7] as CycleType[]).map((c) => (
              <option key={c} value={c}>
                {CYCLE_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__row">
        <label>
          <input type="checkbox" checked={useBinomial} onChange={(e) => setUseBinomial(e.target.checked)} />
          Binomial progression (add a second cycle, 14 chords total)
        </label>
        {useBinomial && (
          <label>
            Second cycle
            <select value={secondCycle} onChange={(e) => setSecondCycle(Number(e.target.value) as CycleType)}>
              {([3, 5, 7] as CycleType[]).map((c) => (
                <option key={c} value={c}>
                  {CYCLE_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="schillinger__row">
        <label>
          <input type="checkbox" checked={voiceLead} onChange={(e) => setVoiceLead(e.target.checked)} />
          Voice-led (4-part: bass + 3 transformed upper voices)
        </label>
        {voiceLead && (
          <label>
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value as TransformDirection)}>
              <option value="clockwise">Clockwise (root→third→fifth→root)</option>
              <option value="counterclockwise">Counterclockwise (root→fifth→third→root)</option>
            </select>
          </label>
        )}
      </div>
      <div className="schillinger__readout">
        {progression.length} chords: {progression.map(chordLabel).join(" · ")}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={200} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
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
