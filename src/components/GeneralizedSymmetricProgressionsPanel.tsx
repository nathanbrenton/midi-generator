import { useEffect, useMemo, useRef, useState } from "react";
import {
  modulationInterval,
  chordRootProgression,
  symmetricProgressionCycleLength,
} from "../core/generalizedSymmetricProgressions";
import { generateCompositions } from "../core/symmetricScales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

export default function GeneralizedSymmetricProgressionsPanel() {
  const [fromRoot, setFromRoot] = useState(60);
  const [toRoot, setToRoot] = useState(63);
  const [wideOctave, setWideOctave] = useState(false);
  const [parts, setParts] = useState(2);
  const [groupIndex, setGroupIndex] = useState(0);

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const interval = useMemo(() => modulationInterval(fromRoot, toRoot, wideOctave), [fromRoot, toRoot, wideOctave]);
  const groups = useMemo(() => (interval >= parts ? generateCompositions(interval, parts) : []), [interval, parts]);
  const group = groups[Math.min(groupIndex, groups.length - 1)] ?? [];
  const roots = useMemo(() => chordRootProgression(fromRoot, group), [fromRoot, group]);
  const cycleLength = useMemo(() => (group.length > 0 ? symmetricProgressionCycleLength(group.reduce((a, b) => a + b, 0)) : 0), [group]);

  const notes: NoteEvent[] = useMemo(
    () => roots.map((midiNote, i) => ({ midiNote, startUnits: i, durationUnits: 0.9, velocity: 90, voice: 0 })),
    [roots],
  );

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = notes.length * secondsPerUnit;

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
    link.download = "schillinger-generalized-modulation.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Generalization of Symmetric Progressions (Book V, Ch. 12)</h3>
      <p className="schillinger__hint">
        Any root motion — diatonic or symmetric — can be named as a descending semitone interval (the
        book's own table: c→c=0, c→b=1, c→bb=2 ... c→db=11, p.489) and composed into a rhythm group,
        turning that rhythm directly into a chord-root progression. Modulation (Section A, p.492-493)
        reuses this: detect the descending interval between two roots, then break that number into a
        binomial/trinomial/etc. group — literally the same composition-listing already built for Book
        II Ch. 7's sectional scales ("breaking up 9 into binomials: 8+1, 7+2, 6+3, 5+4, and their
        reciprocals" is exactly {"generateCompositions(9, 2)"}'s 8 rows). "When a number-value... is a
        small number, it is necessary to add the invariant 12" — the Wide octave option below, matching
        the book's own C→Bb example (2 → 14). Cycle length is 12/gcd(sum,12): how many repetitions of
        the group return to the starting pitch class — confirmed against both of the book's own worked
        examples (sum 5 → 12 repeats; sum 20 → 3 repeats, p.490).
      </p>
      <div className="schillinger__row">
        <label>
          From root (MIDI note)
          <input type="number" min={0} max={96} value={fromRoot} onChange={(e) => setFromRoot(Number(e.target.value))} />
        </label>
        <label>
          To root (MIDI note)
          <input type="number" min={0} max={96} value={toRoot} onChange={(e) => setToRoot(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={wideOctave} onChange={(e) => setWideOctave(e.target.checked)} />
          Wide octave (+12)
        </label>
        <label>
          Intermediate chords
          <select value={parts} onChange={(e) => { setParts(Number(e.target.value)); setGroupIndex(0); }}>
            {[1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                {p} {p === 1 ? "term (direct)" : "terms"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Group
          <select value={groupIndex} onChange={(e) => setGroupIndex(Number(e.target.value))} disabled={groups.length === 0}>
            {groups.map((g, i) => (
              <option key={i} value={i}>
                {g.join("+")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {noteName(fromRoot)} → {noteName(toRoot)}: descending interval {interval}
        {groups.length === 0 ? (
          <> · interval too small for {parts} terms</>
        ) : (
          <>
            {" "}
            · group {group.join("+")} · cycle length {cycleLength} · progression: {roots.map(noteName).join(" - ")}
          </>
        )}
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
