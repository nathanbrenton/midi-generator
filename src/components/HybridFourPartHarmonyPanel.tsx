import { useEffect, useMemo, useRef, useState } from "react";
import {
  HYBRID_FORMS,
  stackedHybridChord,
  transformHybridVoicing,
  type HybridForm,
  type ThreeFunctionTransform,
} from "../core/hybridFourPartHarmony";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);

const TRANSFORMS: readonly { id: ThreeFunctionTransform; label: string }[] = [
  { id: "clockwise", label: "Clockwise (a→b→c→a)" },
  { id: "counterclockwise", label: "Counterclockwise (a→c→b→a)" },
  { id: "constantA", label: "Constant a (b↔c)" },
  { id: "constantB", label: "Constant b (a↔c)" },
  { id: "constantC", label: "Constant c (a↔b)" },
  { id: "constantAbc", label: "Constant abc (identity)" },
];

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function formLabel(form: HybridForm): string {
  return `S(${form.tension})${form.marked ? "*" : ""} [${form.upperFunctions.join("-")}]`;
}

export default function HybridFourPartHarmonyPanel() {
  const [root, setRoot] = useState(60);
  const [fromFormIndex, setFromFormIndex] = useState(0);
  const [toFormIndex, setToFormIndex] = useState(4); // S(9) unmarked
  const [toDegree, setToDegree] = useState(2);
  const [transformId, setTransformId] = useState<ThreeFunctionTransform>("clockwise");

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const fromForm = HYBRID_FORMS[fromFormIndex];
  const toForm = HYBRID_FORMS[toFormIndex];

  const fromVoicing = useMemo(() => stackedHybridChord(MAJOR_SCALE, root, 0, fromForm), [root, fromForm]);
  const toVoicing = useMemo(
    () => transformHybridVoicing(fromVoicing, MAJOR_SCALE, root, toDegree, toForm, transformId),
    [fromVoicing, root, toDegree, toForm, transformId],
  );

  const chords = [fromVoicing, toVoicing];
  const notes: NoteEvent[] = useMemo(() => {
    return chords.flatMap((v, i) =>
      [v.bass, v.a, v.b, v.c].map((midiNote, voice) => ({ midiNote, startUnits: i, durationUnits: 0.9, velocity: 90, voice })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromVoicing, toVoicing]);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = 2 * secondsPerUnit;

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
    link.download = "schillinger-hybrid-transform.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Hybrid Four-Part Harmony (Book V, Ch. 11, Section D)</h3>
      <p className="schillinger__hint">
        Generalizes Ch. 2's clockwise/counterclockwise triad voice-leading to every hybrid chord (S(5)
        through S(13)): the bass stays put, and the 3 upper voices — labeled a (lowest), b (middle), c
        (highest) — transform via one of 6 permutations (Figure 191, p.479): clockwise/counterclockwise
        (the two 3-cycles), constant a/b/c (hold one, swap the other two), or constant abc (identity —
        "complete parallelism"). Each old voice moves by nearest-tone motion to its new function's
        pitch class, exactly like every other voice-leading in this project.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          From
          <select value={fromFormIndex} onChange={(e) => setFromFormIndex(Number(e.target.value))}>
            {HYBRID_FORMS.map((f, i) => (
              <option key={i} value={i}>
                {formLabel(f)}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={toFormIndex} onChange={(e) => setToFormIndex(Number(e.target.value))}>
            {HYBRID_FORMS.map((f, i) => (
              <option key={i} value={i}>
                {formLabel(f)}
              </option>
            ))}
          </select>
        </label>
        <label>
          To root (scale degree from root)
          <input type="number" min={-6} max={6} value={toDegree} onChange={(e) => setToDegree(Number(e.target.value))} />
        </label>
        <label>
          Transform
          <select value={transformId} onChange={(e) => setTransformId(e.target.value as ThreeFunctionTransform)}>
            {TRANSFORMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {[fromVoicing.bass, fromVoicing.a, fromVoicing.b, fromVoicing.c].map(noteName).join("-")} →{" "}
        {[toVoicing.bass, toVoicing.a, toVoicing.b, toVoicing.c].map(noteName).join("-")}
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
