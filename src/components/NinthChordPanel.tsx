import { useEffect, useMemo, useRef, useState } from "react";
import { stackedNinthChord, ninthPositions, buildNinthVoicing, NINTH_PREPARATION_TABLE, type NinthUpperFunction } from "../core/ninthChords";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const FUNCTION_LABELS: Record<NinthUpperFunction, string> = { third: "3", seventh: "7", ninth: "9" };

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function NinthChordPanel() {
  const [root, setRoot] = useState(60);
  const positions = useMemo(() => ninthPositions(), []);
  const [positionIndex, setPositionIndex] = useState(0);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const rootPosition = useMemo(() => stackedNinthChord(MAJOR_SCALE, root, 0), [root]);
  const position = positions[positionIndex];
  const voicing = useMemo(() => buildNinthVoicing(position, MAJOR_SCALE, root, 0), [position, root]);
  const chord: number[] = useMemo(() => [voicing.bass, ...voicing.upper], [voicing]);

  const notes: NoteEvent[] = useMemo(
    () => chord.map((midiNote, voice) => ({ midiNote, startUnits: 0, durationUnits: 3.6, velocity: 90, voice })),
    [chord],
  );

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = 4 * secondsPerUnit;

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
    link.download = "schillinger-ninth-chord.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>The Ninth Chord (Book V, Ch. 10, Section A)</h3>
      <p className="schillinger__hint">
        S(9) is a hybrid four-part chord: root alone in the bass (no doubling), plus third, seventh
        and ninth above it — the fifth is omitted entirely (p.460). "As the bass remains constant,
        the three upper voices are subject to six permutations resulting in corresponding
        distributions" (Figure 156) — browse all 6 with Position below. The chapter's preparation
        table (p.461) is reference-only here: resolving an S(9) doesn't cycle straight into another
        S(9) the way Ch. 9's seventh-chord cycles do — "S(9) alternates with S(7) and S(5)," collapsing
        to a reduced chord first — and Figure 157's exact voice-leading didn't resolve unambiguously
        even at high scan resolution, so that continuity isn't built yet.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Position
          <select value={positionIndex} onChange={(e) => setPositionIndex(Number(e.target.value))}>
            {positions.map((p, i) => (
              <option key={i} value={i}>
                {i + 1}: {p.map((fn) => FUNCTION_LABELS[fn]).join("-")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        Root position: {[rootPosition.bass, ...rootPosition.upper].map(noteName).join("-")} · This position: {chord.map(noteName).join("-")}
      </div>

      <h4>Table of preparations (p.461, reference)</h4>
      <div className="schillinger__readout">
        {NINTH_PREPARATION_TABLE.map((e, i) => (
          <div key={i}>
            {e.method}: {e.fromSeventh}→7, {e.fromNinth}→9 &nbsp;⇒&nbsp; {e.cycle}
          </div>
        ))}
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
