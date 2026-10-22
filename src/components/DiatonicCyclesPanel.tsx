import { useEffect, useMemo, useRef, useState } from "react";
import {
  diatonicCycle,
  binomialCycle,
  stackedTriad,
  negativeStackedTriad,
  negativeFormCycle,
  voiceLeadProgression,
  negativeVoiceLeadProgression,
  buildPassingSixthGroups,
  passingSixthContinuity,
  voicingPosition,
  S5_POSITIONS,
  type S5Position,
  type SignedCycleType,
  type TransformDirection,
  type Voicing,
} from "../core/diatonicHarmony";
import {
  buildFourSixGroup,
  orderForDirection,
  type FourSixDoubling,
  type FourSixGroupChord,
} from "../core/passingFourthSixthChords";
import { intervalCellScale } from "../core/scales";
import type { NoteEvent } from "../core/melody";
import { buildMidiFile } from "../core/midi";
import NotePlayback, { chordsToNotes } from "./NotePlayback";
import "./SchillingerGenerator.css";

const NOTE_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const MAJOR_SCALE = intervalCellScale([2, 2, 1, 2, 2, 2, 1]);
const CYCLES: readonly SignedCycleType[] = [3, 5, 7, -3, -5, -7];
const CYCLE_LABELS: Record<SignedCycleType, string> = {
  3: "C3, cycle of the third — roots down a 3rd: c-a-f-d-b-g-e",
  5: "C5, cycle of the fifth — roots down a 5th: c-f-b-e-a-d-g",
  7: "C7, cycle of the seventh — roots down a 7th (up a step): c-d-e-f-g-a-b",
  [-3]: "C-3, negative — roots up a 3rd: c-e-g-b-d-f-a",
  [-5]: "C-5, negative — roots up a 5th: c-g-d-a-e-b-f",
  [-7]: "C-7, negative — roots up a 7th (down a step): c-b-a-g-f-e-d",
};
const FUNCTION_NUMBER = { root: 1, third: 3, fifth: 5 } as const;
/** The six S(5) positions, top voice first: open (clockwise phases) then close (p.377). */
const POSITION_OPTIONS: readonly { label: string; position: S5Position }[] = [
  ...S5_POSITIONS.open.map((p) => ({ label: `Open ${p.map((f) => FUNCTION_NUMBER[f]).join("-")}`, position: p })),
  ...S5_POSITIONS.close.map((p) => ({ label: `Close ${p.map((f) => FUNCTION_NUMBER[f]).join("-")}`, position: p })),
];
type TransformChoice = TransformDirection | "binomial";

function noteName(midiNote: number): string {
  return `${NOTE_NAMES[((midiNote % 12) + 12) % 12]}${Math.floor(midiNote / 12) - 1}`;
}

function chordLabel(triad: readonly number[]): string {
  return triad.map(noteName).join("-");
}

function voicingToArray(voicing: Voicing): number[] {
  return [voicing.bass, voicing.root, voicing.third, voicing.fifth];
}

function fourSixChordToArray(chord: FourSixGroupChord): number[] {
  return [chord.bass, ...chord.upper];
}

export default function DiatonicCyclesPanel() {
  const [root, setRoot] = useState(60);
  const [firstCycle, setFirstCycle] = useState<SignedCycleType>(5);
  const [useBinomial, setUseBinomial] = useState(false);
  const [secondCycle, setSecondCycle] = useState<SignedCycleType>(3);
  const [voiceLead, setVoiceLead] = useState(false);
  const [direction, setDirection] = useState<TransformChoice>("clockwise");
  const [positionIndex, setPositionIndex] = useState(4); // close 5-3-1, root position
  const [g6Within, setG6Within] = useState<SignedCycleType>(-5);
  const [g6Between, setG6Between] = useState<SignedCycleType>(7);
  const [g6Groups, setG6Groups] = useState(4);
  const [form, setForm] = useState<"positive" | "negative">("positive");
  const [passingSixths, setPassingSixths] = useState(false);
  const [showFourSix, setShowFourSix] = useState(false);
  const [fourSixDoubling, setFourSixDoubling] = useState<FourSixDoubling>("third");
  const [fourSixDirection, setFourSixDirection] = useState<"ascending" | "descending">("ascending");

  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playTokenRef = useRef(0);

  const rootDegrees = useMemo(() => {
    const inForm = (cycle: SignedCycleType) => (form === "negative" ? negativeFormCycle(cycle) : cycle);
    // Cycles that cancel (C3 + C-3) never leave the first chord; fall back to the first alone.
    return useBinomial && secondCycle !== -firstCycle
      ? binomialCycle(inForm(firstCycle), inForm(secondCycle))
      : diatonicCycle(inForm(firstCycle));
  }, [useBinomial, firstCycle, secondCycle, form]);
  const stackedProgression = useMemo(
    () =>
      rootDegrees.map((degree) =>
        form === "negative" ? negativeStackedTriad(MAJOR_SCALE, root, degree) : stackedTriad(MAJOR_SCALE, root, degree),
      ),
    [root, rootDegrees, form],
  );
  const voiceLedProgression = useMemo(
    // A passing third needs clockwise between the S(5) chords around it (p.415, 418).
    () =>
      form === "negative"
        ? // Section F: a negative triad on r (r, -3, -5) is the positive triad four degrees below; the
          // progression is the positive one read backwards (p.361-362).
          negativeVoiceLeadProgression(
            MAJOR_SCALE,
            root,
            rootDegrees.map((d) => d - 4),
            direction === "binomial" ? ["clockwise", "counterclockwise"] : direction,
            POSITION_OPTIONS[positionIndex].position,
          )
        : voiceLeadProgression(
            MAJOR_SCALE,
            root,
            rootDegrees,
            passingSixths ? "clockwise" : direction === "binomial" ? ["clockwise", "counterclockwise"] : direction,
            POSITION_OPTIONS[positionIndex].position,
          ),
    [root, rootDegrees, direction, passingSixths, positionIndex, form],
  );
  const withPassingSixths = useMemo(
    () => (passingSixths && form === "positive" ? buildPassingSixthGroups(voiceLedProgression) : voiceLedProgression),
    [passingSixths, voiceLedProgression, form],
  );

  // Ch.8 Section G: a self-contained 3-chord embellishment of the tonic
  // (degree 0), not a whole-progression modifier like passing sixths --
  // so it's an alternative source for `progression` below, not another
  // layer threaded through the voice-led progression.
  const fourSixGroup = useMemo(() => {
    const [fifthRoot, third, fifth] = stackedTriad(MAJOR_SCALE, root, 0);
    const start: Voicing = { bass: fifthRoot - 12, root: fifthRoot, third, fifth };
    const ascending = buildFourSixGroup(start, MAJOR_SCALE, root, 0, fourSixDoubling);
    return orderForDirection(ascending, fourSixDirection);
  }, [root, fourSixDoubling, fourSixDirection]);

  const progression: number[][] = useMemo(() => {
    if (showFourSix) return fourSixGroup.map(fourSixChordToArray);
    return voiceLead ? withPassingSixths.map(voicingToArray) : stackedProgression;
  }, [showFourSix, fourSixGroup, voiceLead, withPassingSixths, stackedProgression]);

  const positions = useMemo(
    () => (voiceLead && !showFourSix ? withPassingSixths.map(voicingPosition) : []),
    [voiceLead, showFourSix, withPassingSixths],
  );

  // Ch.8 A-D: groups with a passing sixth-chord, G6(Cn), joined by a cycle between groups.
  const g6Chords = useMemo(
    () =>
      passingSixthContinuity(MAJOR_SCALE, root, Array.from({ length: g6Groups }, () => g6Within), [g6Between]).map(voicingToArray),
    [root, g6Within, g6Between, g6Groups],
  );
  const g6Notes = useMemo(() => chordsToNotes(g6Chords), [g6Chords]);

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
      // Stop the loop as well as the sound: a pending pass would otherwise keep rescheduling on a closed context.
      playTokenRef.current += 1;
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
    link.download = "schillinger-diatonic-cycle.mid";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Diatonic Cycles &amp; Passing Sixth-chords (Book V, Ch. 1-2, 8)</h3>
      <p className="schillinger__hint">
        Book V opens Special Theory of Harmony — chord structures and progressions. A root-position
        triad, S(5), stacks a scale's root, third, and fifth (p.211). A "diatonic cycle" steps the
        chord root by a constant scale-degree interval through all 7 degrees before repeating. In the
        positive form the intervals are "constructed downward" (p.362): the cycle of the third gives
        C-A-F-D-B-G-E, the cycle of the fifth C-F-B-E-A-D-G (so it starts with the plagal I→IV and
        ends with the authentic V→I, as p.363 says), and the cycle of the seventh C-D-E-F-G-A-B,
        whose ending cadence B→C is the leading-tone resolution of its "purely contrapuntal
        derivation" (p.369) — all read off the book's Figure 2. A binomial progression alternates two
        cycles chord by chord, 14 chords in all (Figure 3: C3 + C5 is C-A-D-B-E-C-F-D-G-E-A-F-B-G).
        Voice-leading (Sections C-D) reassigns each of the 3 upper voices to a new function in the
        next chord — clockwise sends root→third→fifth→root; counterclockwise sends root→fifth→third→
        root; const. 3 keeps the third and trades root and fifth — plus a constant bass doubling the
        root (p.376-381). Clockwise and counterclockwise keep the chord in its position (open or
        close) for the whole progression; const. 3 switches between them (p.381). The
        negative form (Section F) builds triads downward instead of upward: from c as the root, the
        third and fifth land a third and a fifth below it — a and f — not above (p.386) — and every
        cycle runs the other way: negative C3 connects c-a-f to e-c-a, which read upward is F → A
        (p.387). Voice-leading isn't yet extended to the negative form, so it's only available in
        stacked (non-voice-led) mode.
        Chapter 8's "group with a passing sixth-chord" (G6) inserts an inversion (S(6)) between every
        consecutive pair of chords: the passing chord keeps the first chord's own root/third/fifth
        completely unmoved, shifting only the bass to the nearest pitch sharing the third's pitch class
        — "3 in the bass under S(6) is a third above its preceding position" (p.415), confirmed by hand.
        Section G's "passing fourth-sixth chord" (G4/6) is a different, *reversible* 3-chord group on
        the tonic: S(5) + S(4/6) + S(6), where the middle chord is the C-5-related chord (a fifth up,
        the dominant) in second inversion, so the bass walks c-d-e, then the progression returns —
        confirmed by hand that applying the book's own "clockwise, then the reverse to come back"
        transformation (p.429) lands on the *exact* original chord for S(6), not a new one. The
        doubling choice (S(6)③ vs S(6)①) only changes the final chord's upper voices.
      </p>
      <div className="schillinger__row">
        <label>
          Root (MIDI note)
          <input type="number" min={0} max={96} value={root} onChange={(e) => setRoot(Number(e.target.value))} />
        </label>
        <label>
          Cycle
          <select value={firstCycle} onChange={(e) => setFirstCycle(Number(e.target.value) as SignedCycleType)}>
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                {CYCLE_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="schillinger__row">
        <label>
          <input type="checkbox" checked={useBinomial} onChange={(e) => setUseBinomial(e.target.checked)} />
          Binomial progression (add a second cycle, 14 chords total)
        </label>
        {useBinomial && (
          <label>
            Second cycle
            <select value={secondCycle} onChange={(e) => setSecondCycle(Number(e.target.value) as SignedCycleType)}>
              {CYCLES.filter((c) => c !== -firstCycle).map((c) => (
                <option key={c} value={c}>
                  {CYCLE_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="schillinger__row">
        <label>
          Form
          <select
            value={form}
            onChange={(e) => {
              const next = e.target.value as "positive" | "negative";
              setForm(next);
              if (next === "negative") setPassingSixths(false);
            }}
          >
            <option value="positive">Positive (built upward)</option>
            <option value="negative">Negative (built downward)</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={voiceLead}
            onChange={(e) => setVoiceLead(e.target.checked)}
          />
          Voice-led (4-part: bass + 3 transformed upper voices)
        </label>
        {voiceLead && (
          <label>
            Transformation
            <select
              value={passingSixths ? "clockwise" : direction}
              disabled={passingSixths}
              onChange={(e) => setDirection(e.target.value as TransformChoice)}
            >
              <option value="clockwise">↻ Clockwise (root→third→fifth→root)</option>
              <option value="counterclockwise">↺ Counterclockwise (root→fifth→third→root)</option>
              <option value="const3">Const. 3 (3 stays 3, root↔fifth: close ↔ open)</option>
              <option value="binomial">Binomial ↻ + ↺, alternating (p.382)</option>
            </select>
          </label>
        )}
        {voiceLead && (
          <label>
            Starting position
            <select value={positionIndex} onChange={(e) => setPositionIndex(Number(e.target.value))}>
              {POSITION_OPTIONS.map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {voiceLead && (
          <label>
            <input type="checkbox" checked={passingSixths} disabled={form === "negative"} onChange={(e) => setPassingSixths(e.target.checked)} />
            Passing sixth-chords (Ch. 8): G6 = S(5)+S(6)③+S(5)+... (clockwise)
          </label>
        )}
      </div>
      <div className="schillinger__row">
        <label>
          <input type="checkbox" checked={showFourSix} onChange={(e) => setShowFourSix(e.target.checked)} />
          Passing fourth-sixth chords (Ch. 8G): G4/6 = S(5)+S(4/6)+S(6), on the tonic
        </label>
        {showFourSix && (
          <label>
            Doubling
            <select value={fourSixDoubling} onChange={(e) => setFourSixDoubling(e.target.value as FourSixDoubling)}>
              <option value="third">S(6)③ — doubled third</option>
              <option value="root">S(6)① — doubled root</option>
            </select>
          </label>
        )}
        {showFourSix && (
          <label>
            Transformation
            <select
              value={fourSixDirection}
              onChange={(e) => setFourSixDirection(e.target.value as "ascending" | "descending")}
            >
              <option value="ascending">Ascending: S(5)→S(4/6)→S(6)</option>
              <option value="descending">Descending: S(6)→S(4/6)→S(5)</option>
            </select>
          </label>
        )}
      </div>
      <div className="schillinger__readout">
        {progression.length} chords: {progression.map(chordLabel).join(" · ")}
        {positions.length > 0 && (
          <>
            <br />
            Positions: {positions.join(" · ")}
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

      <h4>Groups with a passing sixth-chord: G6 continuity (Ch. 8, Sections A-D)</h4>
      <p className="schillinger__hint">
        G6 = S(5) + S(6)③ + S(5): the extreme chords connected by a cycle, "always clockwise for both
        the positive and the negative cycles," and the intermediate third of the first chord added in
        the bass "without moving the remaining voices" (p.415). The classical form uses C-5, so the
        bass rises c-e-g; "other than C-5 cycles within the group" give G6(C3), G6(C-7) and the rest,
        "each cycle [producing] its own characteristic bass pattern" (p.417). Groups follow one
        another through a cycle chosen between them: H = G6(C-5) + C7 + G6(C3) + … (p.418).
      </p>
      <div className="schillinger__row">
        <label>
          Cycle within each group
          <select value={g6Within} onChange={(e) => setG6Within(Number(e.target.value) as SignedCycleType)}>
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                G6(C{c}){c === -5 ? " — classical" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cycle between groups
          <select value={g6Between} onChange={(e) => setG6Between(Number(e.target.value) as SignedCycleType)}>
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                C{c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Groups
          <input type="number" min={1} max={8} value={g6Groups} onChange={(e) => setG6Groups(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
        </label>
      </div>
      <div className="schillinger__readout">
        {g6Chords.length} chords (bass first): {g6Chords.map(chordLabel).join(" · ")}
      </div>
      <NotePlayback notes={g6Notes} lengthUnits={g6Chords.length} fileName="schillinger-g6-continuity.mid" />
    </section>
  );
}
