import { useEffect, useMemo, useRef, useState } from "react";
import {
  seventhCycle,
  stackedSeventhChord,
  seventhVoiceLeadProgression,
  resolveSeventhVoicing,
  seventhPreparationCycle,
  SEVENTH_CHORD_POSITIONS,
  type SeventhCycleType,
  type SignedSeventhCycle,
  type SeventhVoicing,
} from "../core/seventhChords";
import { S7_STRUCTURES, symmetricSeventhChord, applyCoefficients, type SeventhStructureId } from "../core/symmetricHarmony";
import { generateResultant } from "../core/resultant";
import { fivePartChord, FIVE_PART_FORMS, type HybridTension } from "../core/hybridFourPartHarmony";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const CYCLE_LABELS: Record<SignedSeventhCycle, string> = {
  3: "C3 — clockwise (\"the seventh alone\")",
  5: "C5 — crosswise (\"the seventh and the fifth\")",
  7: "C7 — counterclockwise (\"the seventh, the fifth, and the third\")",
  [-3]: "C-3 — counterclockwise (1 moves up)",
  [-5]: "C-5 — crosswise (1 and 3 move up)",
  [-7]: "C-7 — clockwise (1, 3 and 5 move up)",
};
const PREPARATION_ROWS = (["suspending", "descending", "ascending"] as const).map((method) => ({
  method,
  cycles: ([1, 3, 5] as const).map((fn) => seventhPreparationCycle(method, fn)),
}));
const STRUCTURE_IDS = Object.keys(S7_STRUCTURES).map(Number) as SeventhStructureId[];
const FIVE_PART_SCALE = intervalCellScale([2, 2, 2, 1, 2, 1, 2]); // c-d-e-f#-g-a-bb, the book's example (p.452)
const TENSIONS: readonly HybridTension[] = [5, 7, 9, 11, 13];

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
  const [cycle, setCycle] = useState<SignedSeventhCycle>(3);
  const [voiceLead, setVoiceLead] = useState(true);
  const [resolve, setResolve] = useState(false);
  const [c0Structures, setC0Structures] = useState("3, 7, 4, 1");
  const [c0Coefficients, setC0Coefficients] = useState<"r54" | "none">("r54");

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
  const progression: number[][] = useMemo(() => {
    const chords = voiceLead ? voiceLedProgression.map(voicingToArray) : stackedProgression;
    // Section B: "the resolution is always positive" -- end on the triad the cycle resolves to.
    if (!resolve || cycle < 0) return chords;
    const last = voiceLedProgression[voiceLedProgression.length - 1];
    const next = seventhCycle(cycle, rootDegrees[rootDegrees.length - 1])[1];
    return [...chords, resolveSeventhVoicing(last, MAJOR_SCALE, root, next, cycle as SeventhCycleType).map((v) => v.pitch)];
  }, [voiceLead, voiceLedProgression, stackedProgression, resolve, cycle, rootDegrees, root]);

  // Section D: S(7) structures in the symmetric zero cycle.
  const c0Group = useMemo(() => {
    const structures = c0Structures
      .split(/[,\s]+/)
      .map(Number)
      .filter((n): n is SeventhStructureId => n >= 1 && n <= 7);
    const coefficients = c0Coefficients === "r54" ? generateResultant([5, 4]).segments.map((seg) => seg.duration) : [1];
    return structures.length > 0 ? applyCoefficients(structures, coefficients) : [];
  }, [c0Structures, c0Coefficients]);
  const c0Chords = useMemo(
    () => c0Group.flatMap(([k, structure]) => Array.from({ length: k }, () => symmetricSeventhChord(structure, root))),
    [c0Group, root],
  );
  const c0Notes = useMemo(() => chordsToNotes(c0Chords), [c0Chords]);

  // Section E: hybrid five-part (4 + 1) harmony, every form of tension over one bass.
  const [fivePartScale, setFivePartScale] = useState<"book" | "major">("book");
  const fivePartChords = useMemo(
    () =>
      TENSIONS.map((t) => {
        const c = fivePartChord(fivePartScale === "book" ? FIVE_PART_SCALE : MAJOR_SCALE, root - 12, 0, t);
        return [c.bass, ...c.upper];
      }),
    [fivePartScale, root],
  );
  const fivePartNotes = useMemo(() => chordsToNotes(fivePartChords, 2), [fivePartChords]);

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
      <h3>The Seventh Chord (Book V, Ch. 9)</h3>
      <p className="schillinger__hint">
        A seventh-chord stacks a fourth third onto S(5): S(7) = root, third, fifth, seventh (p.436).
        "The postulate of resolving seventh — the seventh moves one step down — is the basis of the
        entire system of diatonic continuity." Each cycle relabels the 4 voices differently: C3
        ("the seventh alone") is a straight 4-cycle, 1→3→5→7→1 — the same clockwise idea as Ch. 2's
        triad voice-leading, extended by one more step. C7 ("the seventh, the fifth, and the third")
        is the exact mirror, 1→7→5→3→1. C5 ("the seventh and the fifth") is not a 4-cycle at all —
        it's a double-swap, 1↔5 and 3↔7, so it alternates between just two chord shapes rather than
        cycling through all four inversions. With the cycles constructed downward (p.362), the
        movement counts are exact: Cmaj7 under C3 goes to Am7 (only B moves, to A), under C5 to
        Fmaj7 (G and B step down), and under C7 to Dm7 (B, G and E step down).
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Cycle
          <select value={cycle} onChange={(e) => setCycle(Number(e.target.value) as SignedSeventhCycle)}>
            {([3, 5, 7, -3, -5, -7] as SignedSeventhCycle[]).map((c) => (
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
        <label>
          <input type="checkbox" checked={resolve} disabled={cycle < 0} onChange={(e) => setResolve(e.target.checked)} />
          End with the resolution into S(5) (Section B; positive cycles only)
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

      <h4>Preparation and resolution (Section B, p.439-441)</h4>
      <p className="schillinger__hint">
        "The function which would otherwise have become a seventh in the continuity of seventh-chords
        now becomes a root-tone" — so each cycle resolves by its own map with 7 replaced by 1 (C3:
        7→1, 5→1, 3→5, 1→3), ending on the normally doubled root. Preparing S(7) holds, lowers or
        raises one tone of S(5) into the seventh of the next chord, whose root therefore lies six
        degrees below it — Figure 129's table. "The preparation of S(7) may be either positive or
        negative; the resolution is always positive." A seventh-chord, with its inversions, has{" "}
        {SEVENTH_CHORD_POSITIONS} positions.
      </p>
      <div className="schillinger__readout">
        {PREPARATION_ROWS.map(({ method, cycles }) => (
          <span key={method}>
            {method}: {cycles.map((c, i) => `${[1, 3, 5][i]}→7 gives ${c === 0 ? "C0" : `C${c}`}`).join(", ")}
            <br />
          </span>
        ))}
      </div>

      <h4>S(7) in the symmetric zero cycle (Section D, p.446-447)</h4>
      <p className="schillinger__hint">
        Seven structures, named "so that they do not pertain to degrees of a particular scale but to
        structure alone. Thus, so common an adjective as 'dominant' must be abandoned" (Figure 141):{" "}
        {STRUCTURE_IDS.map((id) => `S${id} ${S7_STRUCTURES[id].name} (${S7_STRUCTURES[id].intervals.join("+")})`).join(", ")}.
        Figure 142 lays the coefficients r5÷4 = 4+1+3+2+2+3+1+4 over S3 + S7 + S4 + S1: 4S3 + S7 + 3S4
        + 2S1 + 2S3 + 3S7 + S4 + 4S1, all on one root.
      </p>
      <div className="schillinger__row">
        <label>
          Structures (1-7)
          <input type="text" value={c0Structures} onChange={(e) => setC0Structures(e.target.value)} />
        </label>
        <label>
          Coefficients
          <select value={c0Coefficients} onChange={(e) => setC0Coefficients(e.target.value as "r54" | "none")}>
            <option value="r54">r5÷4 (Figure 142)</option>
            <option value="none">none</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {c0Group.map(([k, id]) => `${k === 1 ? "" : k}S${id}`).join(" + ")} — {c0Chords.length} chords on {noteName(root)}
      </div>
      <NotePlayback notes={c0Notes} lengthUnits={c0Chords.length} fileName="schillinger-seventh-c0.mid" />

      <h4>Hybrid five-part (4 + 1) harmony (Section E, Figure 148)</h4>
      <p className="schillinger__hint">
        "The bass is a constant root tone and the four upper functions assume variable forms of S(7)
        with respect to the bass": an S(7) on the bass's root, third, fifth or seventh gives S(7),
        S(9), S(11), S(13), and "an S(5) has to be represented with the addition of 13th (the so-called
        'added sixth')" (p.451). In the book's own scale, c-d-e-f#-g-a-b♭: "S(5) = c-e-g-a; S(7) =
        c-e-g-b♭; S(9) = c-e-g-b♭-d; S(11) = c-g-b♭-d-f#; S(13) = c-b♭-d-f#-a" (p.452). Play steps
        through all five over c.
      </p>
      <div className="schillinger__row">
        <label>
          Scale
          <select value={fivePartScale} onChange={(e) => setFivePartScale(e.target.value as "book" | "major")}>
            <option value="book">c-d-e-f#-g-a-b♭ (the book's example)</option>
            <option value="major">natural major</option>
          </select>
        </label>
      </div>
      <div className="schillinger__readout">
        {TENSIONS.map((t, i) => `S(${t}) [${FIVE_PART_FORMS[t].join(",")}] ${fivePartChords[i].map(noteName).join("-")}`).join(" · ")}
      </div>
      <NotePlayback notes={fivePartNotes} lengthUnits={fivePartChords.length * 2} fileName="schillinger-five-part.mid" />
    </section>
  );
}
