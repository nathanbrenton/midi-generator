import { useEffect, useMemo, useRef, useState } from "react";
import { parseMidiFile, type ImportedNote } from "../core/midiImport";
import {
  notesToSignedSegments,
  findSmallestPeriod,
  buildNoteEventsFromSignedSegments,
  restCombinations,
} from "../core/sampleAnalysis";
import { findMatchingCases, type PatternMatch } from "../core/rhythmAnalysis";
import { generalPermutations, circularPermutations } from "../core/permutations";
import { buildMidiFile } from "../core/midi";
import type { NoteEvent } from "../core/melody";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./SchillingerGenerator.css";

const MAX_VARIATION_LANES = 16;
const ARCHETYPE_COLORS = { color: "#3a6ea8", highlight: "#6a9bd6" };
const VARIATION_COLORS = { color: "#3c8a5c", highlight: "#5fb884" };
const SELECTED_COLORS = { color: "#c9932f", highlight: "#e8b95c" };

const UNIT_NOTE_OPTIONS = [
  { label: "Sixteenth note", value: 120 },
  { label: "Eighth note", value: 240 },
  { label: "Quarter note", value: 480 },
];

type VariationMode = "circular" | "general" | "rests";

function toRestLane(label: string, segments: readonly number[], colors: { color: string; highlight: string }): PianoRollLane {
  return {
    label,
    ...colors,
    segments: segments.map((value) => ({ duration: Math.abs(value), rest: value < 0 })),
  };
}

function mostCommonPitch(notes: readonly ImportedNote[]): number {
  const counts = new Map<number, number>();
  for (const note of notes) counts.set(note.midiNote, (counts.get(note.midiNote) ?? 0) + 1);
  let best = notes[0]?.midiNote ?? 60;
  let bestCount = 0;
  for (const [pitch, count] of counts) {
    if (count > bestCount) {
      best = pitch;
      bestCount = count;
    }
  }
  return best;
}

export default function SampleAnalysisPanel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedNotes, setImportedNotes] = useState<ImportedNote[] | null>(null);
  const [ticksPerQuarterNote, setTicksPerQuarterNote] = useState(480);
  const [archetypeLength, setArchetypeLength] = useState(0);
  const [variationMode, setVariationMode] = useState<VariationMode>("circular");
  const [restCount, setRestCount] = useState(1);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);

  const [bpm, setBpm] = useState(120);
  const [ticksPerUnit, setTicksPerUnit] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadFraction, setPlayheadFraction] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);
  const cycleStartRef = useRef(0);

  const samplePitch = useMemo(() => (importedNotes ? mostCommonPitch(importedNotes) : 60), [importedNotes]);

  const signedResult = useMemo(
    () => (importedNotes ? notesToSignedSegments(importedNotes, ticksPerQuarterNote) : null),
    [importedNotes, ticksPerQuarterNote],
  );
  const fullSegments = signedResult?.segments ?? [];

  useEffect(() => {
    if (fullSegments.length === 0) return;
    setArchetypeLength(findSmallestPeriod(fullSegments));
    setSelectedVariationIndex(0);
  }, [fullSegments]);

  useEffect(() => {
    if (signedResult?.divisionsPerQuarter) {
      setTicksPerUnit(Math.round(480 / signedResult.divisionsPerQuarter));
    }
  }, [signedResult?.divisionsPerQuarter]);

  const archetype = useMemo(() => fullSegments.slice(0, archetypeLength), [fullSegments, archetypeLength]);
  const archetypeRestCount = archetype.filter((v) => v < 0).length;

  useEffect(() => {
    setRestCount(archetypeRestCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archetype.length]);

  const matches: PatternMatch[] = useMemo(
    () => (archetype.length > 0 ? findMatchingCases(archetype.map(Math.abs)) : []),
    [archetype],
  );

  const allVariations = useMemo(() => {
    if (archetype.length === 0) return [];
    if (variationMode === "circular") return circularPermutations(archetype);
    if (variationMode === "general") return generalPermutations(archetype);
    return restCombinations(archetype, Math.min(restCount, archetype.length));
  }, [archetype, variationMode, restCount]);

  const variations = allVariations.slice(0, MAX_VARIATION_LANES);
  const truncated = allVariations.length > variations.length;

  useEffect(() => {
    setSelectedVariationIndex(0);
  }, [variationMode, archetype]);

  const selected = variations[selectedVariationIndex] ?? archetype;

  const archetypeLane = useMemo(() => toRestLane("Archetype", archetype, ARCHETYPE_COLORS), [archetype]);
  const variationLanes = useMemo(
    () =>
      variations.map((row, index) =>
        toRestLane(`Row ${index + 1}`, row, index === selectedVariationIndex ? SELECTED_COLORS : VARIATION_COLORS),
      ),
    [variations, selectedVariationIndex],
  );
  const previewLane = useMemo(() => [toRestLane("Preview", selected, SELECTED_COLORS)], [selected]);

  const cycleLength = archetype.reduce((sum, v) => sum + Math.abs(v), 0);

  const previewNotes: NoteEvent[] = useMemo(
    () => buildNoteEventsFromSignedSegments(selected, samplePitch),
    [selected, samplePitch],
  );

  const timeSignature = { beatsPerBar: cycleLength || 1, unitsPerBeat: 1 };
  const secondsPerUnit = (ticksPerUnit / 480) * (60 / bpm);
  const cycleSeconds = cycleLength * secondsPerUnit;

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const imported = parseMidiFile(new Uint8Array(buffer));
      if (imported.notes.length === 0) {
        setError("No notes found in that file's busiest track.");
        return;
      }
      setFileName(file.name);
      setImportedNotes(imported.notes);
      setTicksPerQuarterNote(imported.ticksPerQuarterNote);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that MIDI file.");
    }
  }

  function scheduleLoopPass(token: number) {
    const context = audioContextRef.current;
    if (!context || token !== playTokenRef.current || previewNotes.length === 0) return;

    const cycleStart = context.currentTime;
    cycleStartRef.current = cycleStart;
    for (const note of previewNotes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
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
    if (previewNotes.length === 0) return;
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
  }, [previewNotes, secondsPerUnit, cycleSeconds]);

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
    if (previewNotes.length === 0) return;
    const bytes = buildMidiFile(previewNotes, { bpm, ticksPerUnit });
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName?.replace(/\.mid(i)?$/i, "") ?? "sample"}-variation-${selectedVariationIndex + 1}.mid`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="schillinger">
      <section className="schillinger__section schillinger__section--wide">
        <h3>Sample Analysis: Identify a Resultant, Rests Included</h3>
        <p className="schillinger__hint">
          Decomposes an uploaded MIDI sample into a signed duration sequence — positive units for a
          sounding note, negative units for the silence before the next attack — so a quarter note
          followed by an eighth rest and an eighth note reads as 2, −1, 1, not a merged 3, 1. The
          archetype (the shortest repeating prefix, editable below) is then searched against all 19
          canonical resultants using only its absolute values, since a resultant has no rest concept
          of its own — silence only matters for what you hear and export, not for identifying which
          interference pattern produced it.
        </p>
        <div className="schillinger__row">
          <label>
            Upload MIDI sample
            <input type="file" accept=".mid,.midi" onChange={handleUpload} />
          </label>
          {fileName && <span className="schillinger__readout">{fileName}</span>}
        </div>
        {error && <div className="schillinger__readout schillinger__readout--error">{error}</div>}

        {signedResult && importedNotes && (
          <>
            <div className="schillinger__readout">
              {importedNotes.length} notes · quantized to{" "}
              {signedResult.divisionsPerQuarter ? `1/${signedResult.divisionsPerQuarter} grid` : "n/a"} ·{" "}
              {((signedResult.errorRatio ?? 0) * 100).toFixed(1)}% timing deviation absorbed
            </div>
            <div className="schillinger__readout">Full sequence (signed): {fullSegments.join(", ")}</div>
            <div className="schillinger__row">
              <label>
                Archetype length (segments)
                <input
                  type="number"
                  min={1}
                  max={fullSegments.length}
                  value={archetypeLength}
                  onChange={(e) => setArchetypeLength(Math.min(fullSegments.length, Math.max(1, Number(e.target.value))))}
                />
              </label>
            </div>
            <SchillingerPianoRoll lanes={[archetypeLane]} cycleLength={cycleLength} timeSignature={timeSignature} />
            <div className="schillinger__readout">
              Archetype (signed): {archetype.join(", ")} · {archetypeRestCount} rest
              {archetypeRestCount === 1 ? "" : "s"} · {cycleLength} units total
            </div>
            <div className="schillinger__readout">
              {matches.length > 0
                ? `Matches ${matches.length} of 19 canonical cases: ${matches.map((m) => m.case.label).join(", ")}`
                : "No canonical case contains this exact pattern."}
            </div>
          </>
        )}
      </section>

      {archetype.length > 0 && (
        <>
          <section className="schillinger__section schillinger__section--wide">
            <h3>Variations</h3>
            <p className="schillinger__hint">
              Reorder the archetype's own segments (circular = its rotations; general = every distinct
              reordering) or hold the segments in place and try every combination of a chosen number of
              rests. Click a row to load it into the preview below.
            </p>
            <div className="schillinger__row">
              <label>
                Variation type
                <select value={variationMode} onChange={(e) => setVariationMode(e.target.value as VariationMode)}>
                  <option value="circular">Reorder — circular</option>
                  <option value="general">Reorder — general</option>
                  <option value="rests">Rest combinations</option>
                </select>
              </label>
              {variationMode === "rests" && (
                <label>
                  Number of rests
                  <input
                    type="number"
                    min={0}
                    max={archetype.length}
                    value={restCount}
                    onChange={(e) => setRestCount(Math.min(archetype.length, Math.max(0, Number(e.target.value))))}
                  />
                </label>
              )}
            </div>
            <SchillingerPianoRoll lanes={variationLanes} cycleLength={cycleLength} timeSignature={timeSignature} />
            <div className="schillinger__readout">
              {allVariations.length} variation{allVariations.length === 1 ? "" : "s"}
              {truncated && ` (showing first ${variations.length})`}
            </div>
            <div className="schillinger__row">
              {variations.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedVariationIndex(index)}
                  disabled={index === selectedVariationIndex}
                >
                  Preview row {index + 1}
                </button>
              ))}
            </div>
          </section>

          <section className="schillinger__section schillinger__section--wide">
            <h3>Preview (row {selectedVariationIndex + 1})</h3>
            <SchillingerPianoRoll
              lanes={previewLane}
              cycleLength={cycleLength}
              timeSignature={timeSignature}
              playheadFraction={isPlaying ? playheadFraction : undefined}
            />
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
              <button type="button" onClick={togglePlayback} disabled={previewNotes.length === 0 && !isPlaying}>
                {isPlaying ? "Stop" : "Play"}
              </button>
              <button type="button" onClick={downloadMidi} disabled={previewNotes.length === 0}>
                Download MIDI
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
