import { useEffect, useMemo, useRef, useState } from "react";
import {
  synchronizeInstrumentalGroup,
  assignPlaces,
  segmentsFromAttackTimes,
  ACCOMPANIMENT_FIGURES,
  type AccompanimentRole,
} from "../core/instrumentalInterference";
import type { Resultant } from "../core/resultant";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const CUSTOM_PLACE_NOTES = [60, 64, 67, 71, 74, 77];
const ROLE_NOTES: Record<AccompanimentRole, number> = { bass: 48, chord: 64 };
const ROLE_COLORS: Record<AccompanimentRole, { color: string; highlight: string }> = {
  bass: { color: "#3a6ea8", highlight: "#6a9bd6" },
  chord: { color: "#c9932f", highlight: "#e8b95c" },
};
const CUSTOM_LANE_COLOR = { color: "#3c8a5c", highlight: "#5fb884" };

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

export default function InstrumentalInterferencePanel({ resultant }: { resultant: Resultant }) {
  const [modeIndex, setModeIndex] = useState(0); // 0 = custom, 1..3 = ACCOMPANIMENT_FIGURES
  const [customPlaceCount, setCustomPlaceCount] = useState(2);
  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const attackCount = resultant.segments.length;
  const roles: readonly AccompanimentRole[] | null =
    modeIndex === 0 ? null : ACCOMPANIMENT_FIGURES[modeIndex - 1].roles;
  const placeCount = roles ? roles.length : customPlaceCount;

  const sync = useMemo(() => synchronizeInstrumentalGroup(attackCount, placeCount), [attackCount, placeCount]);
  const assigned = useMemo(() => assignPlaces(attackCount, placeCount), [attackCount, placeCount]);

  const totalUnits = resultant.cycleLength * sync.resultantRepeats;

  // The full realigned duration timeline: the resultant's own segment
  // durations, repeated resultantRepeats times back-to-back.
  const timeline = useMemo(() => {
    const durations: number[] = [];
    for (let repeat = 0; repeat < sync.resultantRepeats; repeat++) {
      for (const segment of resultant.segments) durations.push(segment.duration);
    }
    return durations;
  }, [resultant, sync.resultantRepeats]);

  const startTimes = useMemo(() => {
    const starts: number[] = [];
    let cursor = 0;
    for (const duration of timeline) {
      starts.push(cursor);
      cursor += duration;
    }
    return starts;
  }, [timeline]);

  const lanes: PianoRollLane[] = useMemo(() => {
    return Array.from({ length: placeCount }, (_, place) => {
      const times = startTimes.filter((_, i) => assigned[i] === place);
      const role = roles?.[place];
      const roleColors = role ? ROLE_COLORS[role] : CUSTOM_LANE_COLOR;
      const occurrence = role ? roles!.slice(0, place + 1).filter((r) => r === role).length : place + 1;
      return {
        label: role ? `${role} ${occurrence}` : `Place ${occurrence}`,
        ...roleColors,
        segments: segmentsFromAttackTimes(times, totalUnits),
      };
    });
  }, [placeCount, startTimes, assigned, roles, totalUnits]);

  const notes: NoteEvent[] = useMemo(() => {
    return startTimes.map((startUnits, i) => {
      const place = assigned[i];
      const role = roles?.[place];
      const midiNote = role ? ROLE_NOTES[role] : CUSTOM_PLACE_NOTES[place % CUSTOM_PLACE_NOTES.length];
      return {
        midiNote,
        startUnits,
        durationUnits: timeline[i] * 0.9,
        velocity: 95,
        voice: place,
      };
    });
  }, [startTimes, assigned, roles, timeline]);

  const timeSignature = { beatsPerBar: sync.resultantRepeats, unitsPerBeat: resultant.cycleLength };

  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleSeconds = totalUnits * secondsPerUnit;

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
    link.download = `schillinger-instrumental-${placeCount}places.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="schillinger__section schillinger__section--wide">
        <h3>Resultants Applied to Instrumental Forms (Book I, Ch. 7)</h3>
        <p className="schillinger__hint">
          Cycles a fixed instrumental group (a set of drums, a melodic motif, or a named accompaniment
          figure) one place per attack against the current resultant's own attack count. Since the two
          counts are usually coprime-ish, the pairing doesn't realign until their least common
          multiple — the resultant and the instrumental figure each repeat a different number of times
          before returning to the top together.
        </p>
        <div className="schillinger__row">
          <label>
            Instrumental group
            <select value={modeIndex} onChange={(e) => setModeIndex(Number(e.target.value))}>
              <option value={0}>Custom places</option>
              {ACCOMPANIMENT_FIGURES.map((figure, index) => (
                <option key={figure.label} value={index + 1}>
                  {figure.label}
                </option>
              ))}
            </select>
          </label>
          {modeIndex === 0 && (
            <label>
              Places
              <input
                type="number"
                min={2}
                max={6}
                value={customPlaceCount}
                onChange={(e) => setCustomPlaceCount(Math.min(6, Math.max(2, Number(e.target.value))))}
              />
            </label>
          )}
        </div>

        <SchillingerPianoRoll
          lanes={lanes}
          cycleLength={totalUnits}
          timeSignature={timeSignature}
          playheadFraction={isPlaying ? playheadFraction : undefined}
        />

        <div className="schillinger__readout">
          {attackCount} resultant attacks against {placeCount} places · resultant repeats{" "}
          {sync.resultantRepeats}× · instrumental group repeats {sync.instrumentRepeats}× · realigns after{" "}
          {sync.totalAttacks} attacks
        </div>
      </section>

      <section className="schillinger__section schillinger__section--wide">
        <h3>Playback (instrumental interference)</h3>
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
