import { useEffect, useMemo, useRef, useState } from "react";
import {
  TONIC_COUNTS,
  gapSemitones,
  symmetricTonics,
  compositionCount,
  melodicFormCount,
  generateCompositions,
  buildCompoundSymmetricScale,
  FOURTH_GROUP_TONIC_COUNTS,
  fourthGroupRangeOctaves,
  fourthGroupGapSemitones,
  fourthGroupTonics,
} from "../core/symmetricScales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAX_ROWS = 16;

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

type Group = "third" | "fourth";

export default function SymmetricScalesPanel() {
  const [group, setGroup] = useState<Group>("third");
  const [tonicCount, setTonicCount] = useState<number>(2);
  const [fourthTonicCount, setFourthTonicCount] = useState<number>(3);
  const [unitsPerSectionalScale, setUnitsPerSectionalScale] = useState(4);
  const [tonic, setTonic] = useState(60);

  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);

  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const activeTonicCount = group === "third" ? tonicCount : fourthTonicCount;
  const gap = group === "third" ? gapSemitones(tonicCount) : fourthGroupGapSemitones(fourthTonicCount);
  const clampedUnits = Math.min(Math.max(1, unitsPerSectionalScale), gap);

  const tonics = useMemo(
    () => (group === "third" ? symmetricTonics(tonicCount, tonic) : fourthGroupTonics(fourthTonicCount, tonic)),
    [group, tonicCount, fourthTonicCount, tonic],
  );
  const compositions = useMemo(
    () => generateCompositions(gap, clampedUnits),
    [gap, clampedUnits],
  );

  function preview(label: string, composition: readonly number[]) {
    setSelectedLabel(label);
    setSelectedNotes(buildCompoundSymmetricScale(tonics, composition));
  }

  const notes: NoteEvent[] = useMemo(() => {
    return selectedNotes.map((midiNote, i) => ({
      midiNote,
      startUnits: i,
      durationUnits: 0.9,
      velocity: 95,
      voice: 0,
    }));
  }, [selectedNotes]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = notes.length * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || notes.length === 0) return;

    const cycleStart = context.currentTime;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit;
      gainNode.gain.setValueAtTime(0.15, noteStart);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
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
    link.download = "schillinger-symmetric-scale.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Symmetrical Scales: Third and Fourth Groups (Book II, Ch. 7-8)</h3>
      <p className="schillinger__hint">
        Third Group (Ch. 7): the octave splits into an evenly-spaced tonic system (2, 3, 4, 6, or 12
        tonics, the roots of the corresponding power of √2, p.149). Fourth Group (Ch. 8): the same
        idea spread across tonicCount − 1 octaves instead of one (p.163) — e.g. 3 tonics over 2
        octaves. Either way, a "sectional scale" fills the gap between one tonic and the next with N
        positive-integer semitone steps — the book's own Arabic "string of pearls" example tiles
        (2,1,2,1) across a 2-tonic Third Group system's 6-semitone gap. Counts below match the
        book's own tables exactly (p.152-153); Preview tiles one specific sectional scale across
        every tonic to build the full "compound symmetric scale."
      </p>
      <div className="schillinger__row">
        <label>
          Group
          <select value={group} onChange={(e) => setGroup(e.target.value as Group)}>
            <option value="third">Third (within one octave)</option>
            <option value="fourth">Fourth (spans octaves)</option>
          </select>
        </label>
        {group === "third" ? (
          <label>
            Tonic system
            <select value={tonicCount} onChange={(e) => setTonicCount(Number(e.target.value))}>
              {TONIC_COUNTS.map((t) => (
                <option key={t} value={t}>
                  {t} tonics
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Tonic system
            <select value={fourthTonicCount} onChange={(e) => setFourthTonicCount(Number(e.target.value))}>
              {FOURTH_GROUP_TONIC_COUNTS.map((t) => (
                <option key={t} value={t}>
                  {t} tonics ({fourthGroupRangeOctaves(t)} octaves)
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Units per sectional scale
          <input
            type="number"
            min={1}
            max={gap}
            value={clampedUnits}
            onChange={(e) => setUnitsPerSectionalScale(Number(e.target.value))}
          />
        </label>
        <label>
          Root tonic (MIDI note)
          <input type="number" min={0} max={120} value={tonic} onChange={(e) => setTonic(Number(e.target.value))} />
        </label>
      </div>
      <div className="schillinger__readout">
        {activeTonicCount}-tonic system: {tonics.map(noteName).join(", ")} · gap between tonics = {gap} semitones
      </div>
      <div className="schillinger__readout">
        {clampedUnits}-unit sectional scale: {compositionCount(gap, clampedUnits)} distinct compositions ·{" "}
        {melodicFormCount(clampedUnits, activeTonicCount).toLocaleString()} melodic forms across all{" "}
        {activeTonicCount} tonics
      </div>
      <div className="schillinger__readout">
        {compositions.slice(0, MAX_ROWS).map((composition, i) => (
          <div key={composition.join(",")}>
            {composition.join("+")}
            <button type="button" onClick={() => preview(composition.join("+"), composition)}>
              Preview
            </button>
          </div>
        ))}
        {compositions.length > MAX_ROWS && <div>(showing first {MAX_ROWS} of {compositions.length})</div>}
      </div>

      <h4>Playback</h4>
      <div className="schillinger__row">
        <label>
          Tempo
          <input type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>
      </div>
      <div className="schillinger__readout">
        {selectedNotes.length > 0 ? (
          <>
            Selected: {selectedLabel} → {selectedNotes.map(noteName).join("-")}
          </>
        ) : (
          "Click Preview on a composition above."
        )}
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
