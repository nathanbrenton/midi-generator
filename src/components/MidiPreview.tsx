import SchillingerPianoRoll, { type PianoRollLane } from "./SchillingerPianoRoll";
import "./MidiPreview.css";

export interface MidiPreviewProps {
  lanes: PianoRollLane[];
  cycleLength: number;
  timeSignature: { beatsPerBar: number; unitsPerBeat: number };
  playheadFraction?: number;
  /** Left/right shift which adjacent part of the underlying sequence is shown. */
  onShiftLeft: () => void;
  onShiftRight: () => void;
  canShiftLeft: boolean;
  canShiftRight: boolean;
  /** Up/down browse the available permutations of the currently shown part. */
  onCycleUp: () => void;
  onCycleDown: () => void;
  canCycle: boolean;
  /** Small readouts under the roll, e.g. "window 3-6 of 12" / "rotation 2 of 4". */
  positionLabel?: string;
  variationLabel?: string;
}

/**
 * A piano-roll preview surrounded by a directional D-pad: left/right walk
 * through adjacent parts of a resultant (or any other sequence a caller
 * windows the same way), up/down cycle through that window's available
 * permutations (Book I Ch. 9's `circularPermutations`, typically). Purely
 * presentational — like `SchillingerPianoRoll` itself, it owns no state of
 * its own; the caller supplies the already-computed lanes and the
 * navigation callbacks.
 */
export default function MidiPreview({
  lanes,
  cycleLength,
  timeSignature,
  playheadFraction,
  onShiftLeft,
  onShiftRight,
  canShiftLeft,
  canShiftRight,
  onCycleUp,
  onCycleDown,
  canCycle,
  positionLabel,
  variationLabel,
}: MidiPreviewProps) {
  return (
    <div className="midi-preview">
      <button type="button" className="midi-preview__arrow midi-preview__arrow--up" onClick={onCycleUp} disabled={!canCycle}>
        ▲
      </button>
      <button
        type="button"
        className="midi-preview__arrow midi-preview__arrow--left"
        onClick={onShiftLeft}
        disabled={!canShiftLeft}
      >
        ◀
      </button>
      <div className="midi-preview__roll">
        <SchillingerPianoRoll
          lanes={lanes}
          cycleLength={cycleLength}
          timeSignature={timeSignature}
          playheadFraction={playheadFraction}
        />
      </div>
      <button
        type="button"
        className="midi-preview__arrow midi-preview__arrow--right"
        onClick={onShiftRight}
        disabled={!canShiftRight}
      >
        ▶
      </button>
      <button type="button" className="midi-preview__arrow midi-preview__arrow--down" onClick={onCycleDown} disabled={!canCycle}>
        ▼
      </button>
      {(positionLabel || variationLabel) && (
        <div className="midi-preview__caption">
          {positionLabel}
          {positionLabel && variationLabel && " · "}
          {variationLabel}
        </div>
      )}
    </div>
  );
}
