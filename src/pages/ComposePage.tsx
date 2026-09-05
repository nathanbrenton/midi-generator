import { useEffect, useMemo, useRef, useState } from "react";
import { BINARY_SYNCHRONIZATION_CASES, generateResultant } from "../core/resultant";
import { circularPermutations } from "../core/permutations";
import { restCombinations, buildNoteEventsFromSignedSegments } from "../core/sampleAnalysis";
import { computeLoopTimeSignatureOptions } from "../core/timeSignature";
import { PERCUSSION_VOICE_OPTIONS, GM_DRUM_CHANNEL } from "../core/percussion";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import MidiPreview from "../components/MidiPreview";
import "../components/SchillingerGenerator.css";
import "./ComposePage.css";

const CLICK_NOTE = PERCUSSION_VOICE_OPTIONS.find((p) => p.label === "Closed hi-hat")!.midiNote;

/** Every subset of positions marked as rests, ordered by how many rests (0 first), reusing Ch.9's restCombinations at every count. */
function allRestVariations(durations: readonly number[]): number[][] {
  const variations: number[][] = [];
  for (let restCount = 0; restCount <= durations.length; restCount++) {
    variations.push(...restCombinations(durations, restCount));
  }
  return variations;
}

export default function ComposePage() {
  const [caseIndex, setCaseIndex] = useState(0);
  const activeCase = BINARY_SYNCHRONIZATION_CASES[caseIndex];

  const resultant = useMemo(() => generateResultant([activeCase.a, activeCase.b]), [activeCase]);
  const baseDurations = useMemo(() => resultant.segments.map((s) => s.duration), [resultant]);

  // Left/right: which rotation of the resultant starts the loop.
  const rotations = useMemo(() => circularPermutations(baseDurations), [baseDurations]);
  const [rotationIndex, setRotationIndex] = useState(0);
  useEffect(() => setRotationIndex(0), [baseDurations]);
  const rotatedDurations = rotations[rotationIndex % rotations.length];

  // Up/down: which subset of the current rotation's positions are rests.
  const restVariations = useMemo(() => allRestVariations(rotatedDurations), [rotatedDurations]);
  const [restIndex, setRestIndex] = useState(0);
  useEffect(() => setRestIndex(0), [rotationIndex, rotatedDurations]);
  const activeSigned = restVariations[Math.min(restIndex, restVariations.length - 1)];

  const notes: NoteEvent[] = useMemo(
    () => buildNoteEventsFromSignedSegments(activeSigned, CLICK_NOTE, 0, 100).map((n) => ({ ...n, channel: GM_DRUM_CHANNEL })),
    [activeSigned],
  );

  const lanes = useMemo(
    () => [
      {
        label: activeCase.label,
        color: "#3d7ddb",
        highlight: "#7fb0ef",
        segments: activeSigned.map((v) => ({ duration: Math.abs(v), rest: v < 0 })),
      },
    ],
    [activeCase, activeSigned],
  );

  const timeSignatureOptions = useMemo(() => computeLoopTimeSignatureOptions(resultant.cycleLength), [resultant.cycleLength]);
  const timeSignature = timeSignatureOptions[0];

  // Playback.
  const [bpm, setBpm] = useState(112);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = resultant.cycleLength * secondsPerUnit;

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current) return;

    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 440 * Math.pow(2, (note.midiNote - 69) / 12);

      const noteStart = cycleStart + note.startUnits * secondsPerUnit;
      const noteEnd = noteStart + note.durationUnits * secondsPerUnit;
      gain.gain.setValueAtTime(0.12, noteStart);
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
    let raf: number;
    function tick() {
      const context = audioContextRef.current;
      if (context && cycleSeconds > 0) {
        const elapsed = (context.currentTime - cycleStartRef.current) % cycleSeconds;
        setPlayheadFraction(elapsed / cycleSeconds);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, cycleSeconds]);

  function downloadMidi() {
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit: 120 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-compose.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard: same convention as Motif Explorer.
  const handlersRef = useRef({
    shiftRotation: (_delta: number) => {},
    shiftRest: (_delta: number) => {},
    togglePlayback: () => {},
  });
  handlersRef.current = {
    shiftRotation: (delta: number) => setRotationIndex((i) => (i + delta + rotations.length) % rotations.length),
    shiftRest: (delta: number) => setRestIndex((i) => (i + delta + restVariations.length) % restVariations.length),
    togglePlayback,
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.code === "Space") {
        e.preventDefault();
        handlersRef.current.togglePlayback();
        return;
      }
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlersRef.current.shiftRotation(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          handlersRef.current.shiftRotation(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          handlersRef.current.shiftRest(1);
          break;
        case "ArrowDown":
          e.preventDefault();
          handlersRef.current.shiftRest(-1);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const restCount = activeSigned.filter((v) => v < 0).length;

  return (
    <main className="compose-page">
      <h1>Compose</h1>
      <p className="compose-page__intro">
        A single looping resultant. ←/→ shift where the loop starts; ↑/↓ browse which attacks are
        rests; space plays/stops.
      </p>

      <div className="compose-page__case">
        <label>
          Case
          <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))}>
            {BINARY_SYNCHRONIZATION_CASES.map((c, i) => (
              <option key={c.label} value={i}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {timeSignature && (
        <MidiPreview
          lanes={lanes}
          cycleLength={resultant.cycleLength}
          timeSignature={timeSignature}
          playheadFraction={isPlaying ? playheadFraction : undefined}
          onShiftLeft={() => handlersRef.current.shiftRotation(-1)}
          onShiftRight={() => handlersRef.current.shiftRotation(1)}
          canShiftLeft={rotations.length > 1}
          canShiftRight={rotations.length > 1}
          onCycleUp={() => handlersRef.current.shiftRest(1)}
          onCycleDown={() => handlersRef.current.shiftRest(-1)}
          canCycle={restVariations.length > 1}
          positionLabel={`rotation ${rotationIndex + 1}/${rotations.length}`}
          variationLabel={`${restCount} rest${restCount === 1 ? "" : "s"} · ${restIndex + 1}/${restVariations.length}`}
        />
      )}

      <div className="compose-page__transport">
        <label>
          Tempo
          <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>
        <button type="button" onClick={togglePlayback}>
          {isPlaying ? "Stop" : "Play"}
        </button>
        <button type="button" onClick={downloadMidi}>
          Download MIDI
        </button>
      </div>
    </main>
  );
}
