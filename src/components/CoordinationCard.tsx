import { useEffect, useMemo, useState } from "react";
import { BINARY_SYNCHRONIZATION_CASES } from "../core/resultant";
import { buildResultantForTechnique } from "../core/technique";
import { coordinateTimeStructures, type Fraction } from "../core/timeStructureCoordination";
import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "../pages/MotifExplorerPage.css";
import "./CoordinationCard.css";

function formatFraction(fraction: Fraction): string {
  return fraction.denominator === 1 ? `${fraction.numerator}` : `${fraction.numerator}/${fraction.denominator}`;
}

const ATTACK_COLOR = "#7cb342";
const ATTACK_HIGHLIGHT = "#aed581";
const OUTPUT_COLOR = "#8e24aa";
const OUTPUT_HIGHLIGHT = "#ce93d8";

/**
 * Book I, Ch. 8, "Coordination of Time Structures" (p.34-42) -- a playable,
 * interactive front-end for the already-verified `timeStructureCoordination`
 * math (see that module's own docstring for how its formulas were derived
 * and checked against the book's worked examples). The existing
 * `TimeStructureCoordinationPanel` in the Chapter Tour is a deliberately
 * plain numeric calculator (bare `aa` number input, no piano roll); this
 * card instead builds the attack-group the same way the rest of Motif
 * Explorer builds a motif -- pick a resultant, window a range of it, click
 * blobs to mute individual attacks -- so `aa` is *derived* from something
 * you can see and shape, not just typed in.
 *
 * The duration-group (T, aT) is the page's own shared resultant window,
 * passed in as `durationGroupSegments` -- per direct instruction to reuse
 * "the currently-configured shared resultant" rather than duplicating that
 * whole selection UI a second time here.
 *
 * A literal piano-roll rendering of T' (tiling the duration-group's own
 * segments) is only shown when the full pli/pla/aa/aT chain resolves to a
 * whole number of repeats. When it doesn't -- exactly the book's own
 * Section C example, which needs the whole system scaled ×3 to clear a
 * fraction -- rendering an actual tiled rhythm would require subdividing
 * every unit by the scale factor, which the book itself never mechanizes
 * (its own "Final Scoring" figures for that case are hand-composed, not
 * derived). Showing the exact numeric chain there, without a fabricated
 * rhythm, matches this project's own "no formula, scoped out" honesty
 * principle rather than guessing at a visualization.
 */
export default function CoordinationCard({ durationGroupSegments }: { durationGroupSegments: readonly number[] }) {
  const aT = durationGroupSegments.length;
  const T = useMemo(() => durationGroupSegments.reduce((sum, v) => sum + v, 0), [durationGroupSegments]);

  // The attack-group's own resultant, windowed and mutable -- independent
  // of the shared duration-group above.
  const [caseIndex, setCaseIndex] = useState(0);
  const activeCase = BINARY_SYNCHRONIZATION_CASES[caseIndex];
  const attackResultant = useMemo(() => buildResultantForTechnique("plain", activeCase.a, activeCase.b), [activeCase]);
  const attackTotalSegments = attackResultant.segments.length;

  const [attackStart, setAttackStart] = useState(0);
  const [attackLength, setAttackLength] = useState(Math.min(4, attackTotalSegments));
  const clampedAttackStart = Math.max(0, Math.min(attackStart, attackTotalSegments - 1));
  const maxAttackLength = Math.max(1, attackTotalSegments - clampedAttackStart);
  const clampedAttackLength = Math.max(1, Math.min(attackLength, maxAttackLength));

  const attackWindowDurations = useMemo(
    () => attackResultant.segments.slice(clampedAttackStart, clampedAttackStart + clampedAttackLength).map((s) => s.duration),
    [attackResultant, clampedAttackStart, clampedAttackLength],
  );

  // Which of the windowed positions are muted (clicked off) -- a direct
  // toggle set, not the up/down-browsable rest-variation index the main
  // motif uses, since this card has no keyboard rest-browsing of its own.
  const [mutedPositions, setMutedPositions] = useState<ReadonlySet<number>>(new Set());
  useEffect(() => {
    setMutedPositions(new Set());
  }, [caseIndex, clampedAttackStart, clampedAttackLength]);

  function toggleAttack(_laneIndex: number, segmentIndex: number) {
    setMutedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(segmentIndex)) next.delete(segmentIndex);
      else next.add(segmentIndex);
      return next;
    });
  }

  const aa = attackWindowDurations.length - mutedPositions.size;

  const [pli, setPli] = useState(1);
  const [pla, setPla] = useState(1);
  const [finalDuration, setFinalDuration] = useState(4);

  const result = useMemo(
    () => coordinateTimeStructures(pli, pla, Math.max(1, aa), Math.max(1, aT), Math.max(1, T), Math.max(1, finalDuration)),
    [pli, pla, aa, aT, T, finalDuration],
  );
  const scaled = result.scaleFactor > 1;

  // Only a whole-number repeat count can become an actual tiled piano
  // roll -- see the docstring above for why a fractional one is shown as
  // numbers only rather than a guessed-at rhythm.
  const repeats = result.synchronizedAttacksFraction.denominator === 1 ? result.synchronizedAttacksFraction.numerator : null;

  const outputLane: PianoRollLane | null = useMemo(() => {
    if (repeats == null) return null;
    const tiled = Array.from({ length: repeats }, () => durationGroupSegments).flat();
    return { label: "T'", color: OUTPUT_COLOR, highlight: OUTPUT_HIGHLIGHT, segments: tiled.map((duration) => ({ duration })) };
  }, [repeats, durationGroupSegments]);
  const outputCycleLength = outputLane ? outputLane.segments.reduce((sum, s) => sum + s.duration, 0) : 0;

  const attackLane: PianoRollLane = {
    label: "attack-group",
    color: ATTACK_COLOR,
    highlight: ATTACK_HIGHLIGHT,
    segments: attackWindowDurations.map((duration, i) => ({ duration, rest: mutedPositions.has(i) })),
  };
  const attackCycleLength = attackWindowDurations.reduce((sum, v) => sum + v, 0) || 1;

  return (
    <section className="coordination-card">
      <h2 className="coordination-card__title">Coordination of Time Structures (Ch. 8)</h2>
      <p className="coordination-card__hint">
        Synchronizes an attack-group you build below against the shared resultant above (the
        duration-group), through an optional instrumental-places layer (pli/pla) — reporting how many
        times everything must repeat before it all closes together evenly.
      </p>

      <div className="coordination-card__row">
        <select value={caseIndex} onChange={(e) => setCaseIndex(Number(e.target.value))} aria-label="Attack-group resultant case">
          {BINARY_SYNCHRONIZATION_CASES.map((c, i) => (
            <option key={c.label} value={i}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="motif-transport__rangegroup">
          <span>Start</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, attackTotalSegments - 1)}
            value={clampedAttackStart}
            onChange={(e) => setAttackStart(Number(e.target.value))}
          />
          <input
            type="number"
            min={0}
            max={Math.max(0, attackTotalSegments - 1)}
            value={clampedAttackStart}
            onChange={(e) => setAttackStart(Number(e.target.value))}
          />
        </div>

        <div className="motif-transport__rangegroup">
          <span>Length</span>
          <input type="range" min={1} max={maxAttackLength} value={clampedAttackLength} onChange={(e) => setAttackLength(Number(e.target.value))} />
          <input
            type="number"
            min={1}
            max={maxAttackLength}
            value={clampedAttackLength}
            onChange={(e) => setAttackLength(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="coordination-card__roll">
        <SchillingerPianoRoll
          lanes={[attackLane]}
          cycleLength={attackCycleLength}
          timeSignature={{ beatsPerBar: attackCycleLength, unitsPerBeat: 1 }}
          hideLabels
          onSegmentClick={toggleAttack}
        />
      </div>
      <p className="coordination-card__caption">Click an attack to mute it — aa = {aa} sounding attack{aa === 1 ? "" : "s"}.</p>

      <div className="coordination-card__row">
        <label className="motif-transport__labeled">
          pli
          <input type="number" min={1} max={9} value={pli} onChange={(e) => setPli(Math.max(1, Math.min(9, Number(e.target.value))))} />
        </label>
        <label className="motif-transport__labeled">
          pla
          <input type="number" min={1} max={9} value={pla} onChange={(e) => setPla(Math.max(1, Math.min(9, Number(e.target.value))))} />
        </label>
        <label className="motif-transport__labeled">
          T″ (final grouping)
          <input
            type="number"
            min={1}
            max={64}
            value={finalDuration}
            onChange={(e) => setFinalDuration(Math.max(1, Math.min(64, Number(e.target.value))))}
          />
        </label>
      </div>

      <div className="coordination-card__readout">
        aa = {aa}, aT = {aT}, T = {T} (from the shared resultant above)
        <br />
        (1) pli reduced against pla → {result.reducedInstrumentalPlaces}
        <br />
        (2) A = aa · pli′ = {aa} × {result.reducedInstrumentalPlaces} = {result.synchronizedAttacks}
        <br />
        (3) A′ = A / aT = {result.synchronizedAttacks} / {aT} = {formatFraction(result.synchronizedAttacksFraction)}
        <br />
        (4) T′ = T · A′ = {T} × {formatFraction(result.synchronizedAttacksFraction)} = {formatFraction(result.synchronizedDuration)}t
        <br />
        (5) N(T″) = T′ / T″ = {formatFraction(result.synchronizedDuration)} / {finalDuration} ={" "}
        {formatFraction(result.finalRepeatsFraction)}
      </div>
      <div className="coordination-card__readout">
        {scaled ? (
          <>
            Not a whole number as-is — scaling the entire system ×{result.scaleFactor} clears the
            fraction: the final duration-group repeats <strong>{result.finalRepeats}</strong> times.
          </>
        ) : (
          <>
            Already whole — the final duration-group repeats <strong>{result.finalRepeats}</strong> time
            {result.finalRepeats === 1 ? "" : "s"} to close evenly.
          </>
        )}
      </div>

      {outputLane ? (
        <div className="coordination-card__roll">
          <SchillingerPianoRoll
            lanes={[outputLane]}
            cycleLength={outputCycleLength}
            timeSignature={{ beatsPerBar: outputCycleLength, unitsPerBeat: 1 }}
            hideLabels
          />
        </div>
      ) : (
        <p className="coordination-card__caption">
          T′ isn't a whole number of repeats of the duration-group at this pli/pla/aa — shown as exact
          fractions above rather than a guessed-at rhythm. Adjust pli, pla, or the attack-group's muted
          attacks for a directly playable pattern.
        </p>
      )}
    </section>
  );
}
