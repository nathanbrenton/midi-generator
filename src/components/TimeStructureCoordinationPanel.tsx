import { useState } from "react";
import { coordinateTimeStructures, type Fraction } from "../core/timeStructureCoordination";
import type { Resultant } from "../core/resultant";
import "./SchillingerGenerator.css";

function formatFraction(fraction: Fraction): string {
  return fraction.denominator === 1 ? `${fraction.numerator}` : `${fraction.numerator}/${fraction.denominator}`;
}

export default function TimeStructureCoordinationPanel({ resultant }: { resultant: Resultant }) {
  const [pli, setPli] = useState(4);
  const [pla, setPla] = useState(3);
  const [aa, setAa] = useState(8);
  const [finalDuration, setFinalDuration] = useState(8);

  const aT = resultant.segments.length;
  const duration = resultant.cycleLength;

  const result = coordinateTimeStructures(pli, pla, aa, aT, duration, finalDuration);
  const scaled = result.scaleFactor > 1;

  return (
    <section className="schillinger__section schillinger__section--wide">
      <h3>Coordination of Time Structures (Book I, Ch. 8)</h3>
      <p className="schillinger__hint">
        Chains three synchronizations in sequence: an instrumental group (pli places) against an
        attack-group (pla places), that attack-group's own attack count (aa) against the active
        resultant's own attack count (aT), and the resulting synchronized duration-group against a
        final duration you choose (e.g. a bar length) — reporting how many times everything must
        repeat before it all closes together evenly.
      </p>
      <div className="schillinger__row">
        <label>
          Instrumental places (pli)
          <input type="number" min={2} max={9} value={pli} onChange={(e) => setPli(Math.min(9, Math.max(2, Number(e.target.value))))} />
        </label>
        <label>
          Attack-group places (pla)
          <input type="number" min={2} max={9} value={pla} onChange={(e) => setPla(Math.min(9, Math.max(2, Number(e.target.value))))} />
        </label>
        <label>
          Attack-group attacks (aa)
          <input type="number" min={2} max={9} value={aa} onChange={(e) => setAa(Math.min(9, Math.max(2, Number(e.target.value))))} />
        </label>
        <label>
          Final duration (T'')
          <input
            type="number"
            min={1}
            max={64}
            value={finalDuration}
            onChange={(e) => setFinalDuration(Math.min(64, Math.max(1, Number(e.target.value))))}
          />
        </label>
      </div>

      <div className="schillinger__readout">
        Active resultant supplies aT = {aT} attacks, T = {duration} units (its own cycle length).
      </div>
      <div className="schillinger__readout">
        (1) pli reduced against pla → {result.reducedInstrumentalPlaces}
        <br />
        (2) A = aa · pli′ = {aa} × {result.reducedInstrumentalPlaces} = {result.synchronizedAttacks}
        <br />
        (3) A′ = A / aT = {result.synchronizedAttacks} / {aT} = {formatFraction(result.synchronizedAttacksFraction)}
        <br />
        (4) T′ = T · A′ = {duration} × {formatFraction(result.synchronizedAttacksFraction)} ={" "}
        {formatFraction(result.synchronizedDuration)}t
        <br />
        (5) N(T″) = T′ / T″ = {formatFraction(result.synchronizedDuration)} / {finalDuration} ={" "}
        {formatFraction(result.finalRepeatsFraction)}
      </div>
      <div className="schillinger__readout">
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
    </section>
  );
}
