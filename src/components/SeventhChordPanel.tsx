import { useEffect, useMemo, useRef, useState } from "react";
import {
  seventhCycle,
  stackedSeventhChord,
  seventhVoiceLeadProgression,
  type SeventhCycleType,
  type SeventhVoicing,
} from "../core/seventhChords";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const CYCLE_LABELS: Record<SeventhCycleType, string> = {
  3: "C3 — clockwise (\"the seventh alone\")",
  5: "C5 — crosswise (\"the seventh and the fifth\")",
  7: "C7 — counterclockwise (\"the seventh, the fifth, and the third\")",
};

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function chordLabel(chord: readonly number[]): string {
  return chord.map(noteName).join("-");
}

function voicingToArray(voicing: SeventhVoicing): number[] {
  return [voicing.root, voicing.third, voicing.fifth, voicing.seventh];
}

export default function SeventhChordPanel() {
  const [root, setRoot] = useState(60);
  const [cycle, setCycle] = useState<SeventhCycleType>(3);
  const [voiceLead, setVoiceLead] = useState(true);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const rootDegrees = useMemo(() => seventhCycle(cycle), [cycle]);
  const stackedProgression = useMemo(
    () => rootDegrees.map((degree) => stackedSeventhChord(MAJOR_SCALE, root, degree)),
    [root, rootDegrees],
  );
  const voiceLedProgression = useMemo(
    () => seventhVoiceLeadProgression(MAJOR_SCALE, root, rootDegrees, cycle),
    [root, rootDegrees, cycle],
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
    link.download = "schillinger-seventh-chord.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Seventh Chord (Book V, Ch. 9, Section A)</h3>
      <p className="schillinger__hint">
        A seventh-chord stacks a fourth third onto S(5): S(7) = root, third, fifth, seventh (p.436).
        "The postulate of resolving seventh — the seventh moves one step down — is the basis of the
        entire system of diatonic continuity." Each cycle relabels the 4 voices differently: C3
        ("the seventh alone") is a straight 4-cycle, 1→3→5→7→1 — the same clockwise idea as Ch. 2's
        triad voice-leading, extended by one more step. C7 ("the seventh, the fifth, and the third")
        is the exact mirror, 1→7→5→3→1. C5 ("the seventh and the fifth") is not a 4-cycle at all —
        it's a double-swap, 1↔5 and 3↔7, so it alternates between just two chord shapes rather than
        cycling through all four inversions. All three confirmed by hand against the book's own
        Figures 117-119 before writing any code: a Cmaj7 under C3 produces exactly Em7, under C5
        exactly G7, and under C7 exactly Bm7♭5.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Cycle
          <select value={cycle} onChange={(e) => setCycle(Number(e.target.value) as SeventhCycleType)}>
            {([3, 5, 7] as SeventhCycleType[]).map((c) => (
              <option key={c} value={c}>
                {CYCLE_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={voiceLead} onChange={(e) => setVoiceLead(e.target.checked)} />
          Voice-led (smooth nearest-tone motion, not just re-stacked chords)
        </label>
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
