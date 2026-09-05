import { useEffect, useMemo, useRef, useState } from "react";
import { BINARY_SYNCHRONIZATION_CASES, type Resultant, type ResultantSegment } from "../core/resultant";
import { buildResultantForTechnique, type Technique } from "../core/technique";
import { THREE_GENERATOR_CASES, buildTheme } from "../core/threeGenerators";
import { computeLoopTimeSignatureOptions } from "../core/timeSignature";
import { higherOrderElements } from "../core/higherOrderPermutations";
import { restCombinations, buildNoteEventsFromSignedSegments } from "../core/sampleAnalysis";
import { PERCUSSION_VOICE_OPTIONS, GM_DRUM_CHANNEL } from "../core/percussion";
import { buildMidiFile } from "../core/midi";
import { type PianoRollLane } from "../components/SchillingerPianoRoll";
import MidiPreview from "../components/MidiPreview";
import "../components/SchillingerGenerator.css";
import "./MotifExplorerPage.css";

const CLICK_NOTE = PERCUSSION_VOICE_OPTIONS.find((p) => p.label === "Closed hi-hat")!.midiNote;

/** Rebuilds cycleLength/attackPoints from an ordered segment list — used after windowing/repeating a resultant. */
function resultantFromSegments(segments: ResultantSegment[]): Resultant {
  let cursor = 0;
  const attackPoints: number[] = [];
  for (const segment of segments) {
    attackPoints.push(cursor);
    cursor += segment.duration;
  }
  return { cycleLength: cursor, segments, attackPoints };
}

/**
 * Every way of marking some of `durations`' positions as rests, ordered by
 * how many rests (none first): `restCombinations` (built for sample
 * analysis, Ch.9-adjacent) at every count from 0 up to "all positions,"
 * concatenated into one steppable list. Up/down browsing this list is what
 * "introduce rests" (the original midi-preview request) actually meant —
 * a prior pass here had used circular-permutation rotation browsing
 * instead, which was this project's own drift from that request.
 */
function allRestVariations(durations: readonly number[]): number[][] {
  const variations: number[][] = [];
  for (let restCount = 0; restCount <= durations.length; restCount++) {
    variations.push(...restCombinations(durations, restCount));
  }
  return variations;
}

type ExtendMode = "technique" | "growth";

export default function MotifExplorerPage() {
  // Deliberately monophonic, rhythm-only for now: "build this out in the
  // same order Schillinger's own chapters introduce it," starting with
  // Book I. Voices/scale (Ch. 7, Book II) come back later, in sequence.
  const [generatorCount, setGeneratorCount] = useState<2 | 3>(2);
  const [caseIndex, setCaseIndex] = useState(0);
  const [threeCaseIndex, setThreeCaseIndex] = useState(0);
  const [technique, setTechnique] = useState<Technique>("plain");
  const [repeatCount, setRepeatCount] = useState(1);

  const activeCase = BINARY_SYNCHRONIZATION_CASES[caseIndex];
  const activeThreeCase = THREE_GENERATOR_CASES[threeCaseIndex];

  const techniqueResultant: Resultant = useMemo(() => {
    return generatorCount === 3
      ? buildTheme(activeThreeCase.generators)
      : buildResultantForTechnique(technique, activeCase.a, activeCase.b);
  }, [generatorCount, activeThreeCase, technique, activeCase]);

  // Ch.10's higher-order growth (Section A, "Permutations of the Higher
  // Order"): the two (or three) generator VALUES themselves are the seeds,
  // exactly as the book's own Figure 120 example uses tiny numeric seeds --
  // growing them concatenates into a much longer cycle to browse, e.g. the
  // classic "abbabaab" + "baababba" at order 4 for two seeds.
  const [extendMode, setExtendMode] = useState<ExtendMode>("technique");
  const [growthOrder, setGrowthOrder] = useState(2);

  const growthSeeds = useMemo(
    () => (generatorCount === 3 ? activeThreeCase.generators.map((g) => [g]) : [[activeCase.a], [activeCase.b]]),
    [generatorCount, activeThreeCase, activeCase],
  );

  const growthResultant: Resultant = useMemo(() => {
    const elements = higherOrderElements(growthSeeds, growthOrder);
    return resultantFromSegments(elements.flat().map((duration) => ({ duration, sources: [] })));
  }, [growthSeeds, growthOrder]);

  const baseResultant = extendMode === "growth" ? growthResultant : techniqueResultant;

  const repeatedResultant = useMemo(() => {
    if (extendMode === "growth" || repeatCount <= 1) return baseResultant;
    return resultantFromSegments(Array.from({ length: repeatCount }, () => baseResultant.segments).flat());
  }, [baseResultant, repeatCount, extendMode]);

  const totalSegments = repeatedResultant.segments.length;

  // Motif length / window (the "cycle contract/expand" control).
  const [loopSelection, setLoopSelection] = useState({ start: 0, length: 4 });
  const [lengthMode, setLengthMode] = useState<"events" | "beats">("events");
  const [targetBeats, setTargetBeats] = useState(4);

  useEffect(() => {
    setLoopSelection({ start: 0, length: Math.max(2, Math.min(4, totalSegments)) });
    // Reset the window to a sensible default whenever the underlying shape changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatorCount, activeCase, activeThreeCase, technique, repeatCount, extendMode, growthOrder]);

  const clampedStart = Math.max(0, Math.min(loopSelection.start, totalSegments - 1));

  const windowLength = useMemo(() => {
    if (lengthMode === "events") {
      return Math.max(1, Math.min(loopSelection.length, totalSegments - clampedStart));
    }
    let sum = 0;
    let count = 0;
    for (let i = clampedStart; i < totalSegments && sum < targetBeats; i++) {
      sum += repeatedResultant.segments[i].duration;
      count++;
    }
    return Math.max(1, count);
  }, [lengthMode, loopSelection.length, targetBeats, repeatedResultant, clampedStart, totalSegments]);

  const windowDurations = useMemo(
    () => repeatedResultant.segments.slice(clampedStart, clampedStart + windowLength).map((s) => s.duration),
    [repeatedResultant, clampedStart, windowLength],
  );

  // Up/down browsing of which of the current window's attacks are rests --
  // restCombinations at every rest count from 0 up to "all positions,"
  // concatenated into one steppable list (see allRestVariations above).
  const restVariations = useMemo(() => allRestVariations(windowDurations), [windowDurations]);
  const [restIndex, setRestIndex] = useState(0);
  useEffect(() => setRestIndex(0), [clampedStart, windowLength]);

  const activeSigned = restVariations[Math.min(restIndex, restVariations.length - 1)];
  const activeRestCount = activeSigned.filter((v) => v < 0).length;
  const totalUnits = useMemo(() => activeSigned.reduce((sum, v) => sum + Math.abs(v), 0), [activeSigned]);

  const notes = useMemo(
    () =>
      buildNoteEventsFromSignedSegments(activeSigned, CLICK_NOTE, 0, 100).map((note) => ({ ...note, channel: GM_DRUM_CHANNEL })),
    [activeSigned],
  );

  const lanes: PianoRollLane[] = useMemo(
    () => [
      {
        label: generatorCount === 3 ? activeThreeCase.label : activeCase.label,
        color: "#3d7ddb",
        highlight: "#7fb0ef",
        segments: activeSigned.map((v) => ({ duration: Math.abs(v), rest: v < 0 })),
      },
    ],
    [generatorCount, activeThreeCase, activeCase, activeSigned],
  );

  const timeSignatureOptions = useMemo(() => computeLoopTimeSignatureOptions(totalUnits), [totalUnits]);
  const [timeSignatureIndex, setTimeSignatureIndex] = useState(0);
  useEffect(() => setTimeSignatureIndex(0), [timeSignatureOptions.length, totalUnits]);
  const selectedTimeSignature = timeSignatureOptions[Math.min(timeSignatureIndex, timeSignatureOptions.length - 1)];

  // Playback.
  const [bpm, setBpm] = useState(112);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const secondsPerUnit = 60 / bpm;
  const cycleSeconds = totalUnits * secondsPerUnit;

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
    if (notes.length === 0) return;
    const bytes = buildMidiFile(notes, { bpm, ticksPerUnit: 120 });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schillinger-motif.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcuts: Left/Right slide the window, Up/Down browse rests, Space plays/stops.
  // A ref holds the latest handlers so the listener can attach once on mount without going stale.
  const handlersRef = useRef({
    moveWindow: (_delta: number) => {},
    shiftRest: (_delta: number) => {},
    togglePlayback: () => {},
  });
  handlersRef.current = {
    moveWindow: (delta: number) =>
      setLoopSelection((sel) => ({ ...sel, start: Math.max(0, Math.min(sel.start + delta, totalSegments - 1)) })),
    shiftRest: (delta: number) => setRestIndex((i) => (i + delta + restVariations.length) % restVariations.length),
    togglePlayback,
  };

  // Side-panel disclosure: every compositional parameter lives behind a rail
  // button, closed by default, so the piano roll stays the visual focus.
  // "Which resultant" (generators + case) is prominent in the transport bar
  // instead, so it isn't one of these hidden panels.
  type PanelKey = "extend" | "length";
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Overflow menu (transport bar): houses Download MIDI, kept a couple of
  // clicks away rather than a primary always-visible button.
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  function togglePanel(key: PanelKey) {
    setActivePanel((current) => (current === key ? null : key));
  }

  useEffect(() => {
    if (!activePanel) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (railRef.current?.contains(target) || flyoutRef.current?.contains(target)) return;
      setActivePanel(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activePanel]);

  useEffect(() => {
    if (!overflowOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (overflowRef.current?.contains(e.target as Node)) return;
      setOverflowOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [overflowOpen]);

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
          handlersRef.current.moveWindow(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          handlersRef.current.moveWindow(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          handlersRef.current.shiftRest(1);
          break;
        case "ArrowDown":
          e.preventDefault();
          handlersRef.current.shiftRest(-1);
          break;
        case " ":
        case "Spacebar":
          e.preventDefault();
          handlersRef.current.togglePlayback();
          break;
        case "Escape":
          setActivePanel(null);
          setOverflowOpen(false);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const panelButton = (key: PanelKey, label: string) => (
    <button
      type="button"
      className={activePanel === key ? "motif-rail__btn motif-rail__btn--active" : "motif-rail__btn"}
      onClick={() => togglePanel(key)}
    >
      {label}
    </button>
  );

  return (
    <main className="motif-page">
      <div className="motif-transport">
        <button type="button" className="motif-transport__play" onClick={togglePlayback}>
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="motif-transport__group">
          <select
            className="motif-transport__generators"
            value={generatorCount}
            onChange={(e) => setGeneratorCount(Number(e.target.value) as 2 | 3)}
            aria-label="Number of generators"
          >
            <option value={2}>2 gen</option>
            <option value={3}>3 gen</option>
          </select>
          {generatorCount === 2 ? (
            <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))} aria-label="Resultant case">
              {BINARY_SYNCHRONIZATION_CASES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <select value={threeCaseIndex} onChange={(e) => setThreeCaseIndex(Number(e.target.value))} aria-label="Resultant case">
              {THREE_GENERATOR_CASES.map((c, i) => (
                <option key={c.label} value={i}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="motif-transport__info">
          {totalUnits} units · {activeSigned.length} events
          {activeRestCount > 0 && (
            <>
              {" "}
              · {activeRestCount} rest{activeRestCount === 1 ? "" : "s"}
            </>
          )}
        </div>

        <div className="motif-transport__spacer" />

        <label className="motif-transport__tempo">
          <input type="number" min={40} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
          bpm
        </label>

        <div className="motif-transport__overflow" ref={overflowRef}>
          <button type="button" aria-label="More options" onClick={() => setOverflowOpen((v) => !v)}>
            ⋯
          </button>
          {overflowOpen && (
            <div className="motif-transport__menu">
              <button type="button" onClick={downloadMidi} disabled={notes.length === 0}>
                Download MIDI
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="motif-workspace">
        <div className="motif-rail" ref={railRef}>
          {panelButton("extend", "Extend")}
          {panelButton("length", "Length")}
        </div>

        {activePanel && (
          <div className="motif-flyout" ref={flyoutRef}>
            {activePanel === "extend" && (
              <div className="motif-flyout__panel">
                <h3>Extend the motif</h3>
                <div className="schillinger__row">
                  <label>
                    Mode
                    <select value={extendMode} onChange={(e) => setExtendMode(e.target.value as ExtendMode)}>
                      <option value="technique">Technique (Ch. 4-5)</option>
                      <option value="growth">Higher-order growth (Ch. 10)</option>
                    </select>
                  </label>
                </div>
                {extendMode === "technique" ? (
                  <div className="schillinger__row">
                    {generatorCount === 2 && (
                      <label>
                        Technique
                        <select value={technique} onChange={(e) => setTechnique(e.target.value as Technique)}>
                          <option value="plain">Plain</option>
                          <option value="fractioned">Fractioned</option>
                          <option value="expansion">Expansion (append)</option>
                          <option value="contraction">Contraction (prepend)</option>
                          <option value="balance">Balance (combine)</option>
                        </select>
                      </label>
                    )}
                    <label>
                      Repeat
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={repeatCount}
                        onChange={(e) => setRepeatCount(Math.max(1, Math.min(4, Number(e.target.value))))}
                      />
                      ×
                    </label>
                  </div>
                ) : (
                  <div className="schillinger__row">
                    <label>
                      Order
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={growthOrder}
                        onChange={(e) => setGrowthOrder(Math.max(1, Math.min(6, Number(e.target.value))))}
                      />
                    </label>
                    <span className="schillinger__hint">
                      {generatorCount === 3 ? "3" : "2"} seeds ({growthSeeds.map((s) => s[0]).join(", ")}) grown to order{" "}
                      {growthOrder} → {growthResultant.segments.length} events
                    </span>
                  </div>
                )}
              </div>
            )}

            {activePanel === "length" && (
              <div className="motif-flyout__panel">
                <h3>Motif length</h3>
                <div className="schillinger__row">
                  <label className="schillinger__checkbox">
                    <input type="radio" name="lengthMode" checked={lengthMode === "events"} onChange={() => setLengthMode("events")} />
                    By events
                  </label>
                  <label className="schillinger__checkbox">
                    <input type="radio" name="lengthMode" checked={lengthMode === "beats"} onChange={() => setLengthMode("beats")} />
                    By beats
                  </label>
                </div>
                <div className="schillinger__row">
                  <label>
                    Start
                    <input
                      type="number"
                      min={0}
                      max={Math.max(0, totalSegments - 1)}
                      value={clampedStart}
                      onChange={(e) => setLoopSelection((sel) => ({ ...sel, start: Number(e.target.value) }))}
                    />
                  </label>
                  {lengthMode === "events" ? (
                    <label>
                      Length (events)
                      <input
                        type="number"
                        min={1}
                        max={totalSegments}
                        value={loopSelection.length}
                        onChange={(e) => setLoopSelection((sel) => ({ ...sel, length: Number(e.target.value) }))}
                      />
                    </label>
                  ) : (
                    <label>
                      Target beats
                      <input type="number" min={1} max={64} value={targetBeats} onChange={(e) => setTargetBeats(Number(e.target.value))} />
                    </label>
                  )}
                </div>
                {timeSignatureOptions.length > 1 && (
                  <div className="schillinger__row">
                    <label>
                      Time signature
                      <select value={timeSignatureIndex} onChange={(e) => setTimeSignatureIndex(Number(e.target.value))}>
                        {timeSignatureOptions.map((o, i) => (
                          <option key={o.label} value={i}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="motif-stage-wrap">
          <section className="motif-page__stage">
            {selectedTimeSignature && (
              <MidiPreview
                lanes={lanes}
                cycleLength={totalUnits}
                timeSignature={selectedTimeSignature}
                playheadFraction={isPlaying ? playheadFraction : undefined}
                onShiftLeft={() => handlersRef.current.moveWindow(-1)}
                onShiftRight={() => handlersRef.current.moveWindow(1)}
                canShiftLeft={clampedStart > 0}
                canShiftRight={clampedStart < totalSegments - 1}
                onCycleUp={() => handlersRef.current.shiftRest(1)}
                onCycleDown={() => handlersRef.current.shiftRest(-1)}
                canCycle={restVariations.length > 1}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
