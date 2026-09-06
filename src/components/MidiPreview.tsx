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
  /** Up/down browse a variation of the currently shown part (e.g. rest patterns, permutations). */
  onCycleUp: () => void;
  onCycleDown: () => void;
  canCycle: boolean;
  /** Drops the piano roll's left-hand lane-label column; pass when the caller labels lanes elsewhere. */
  hideLabels?: boolean;
}

/**
 * A piano-roll preview surrounded by a directional D-pad: left/right walk
 * through adjacent parts of a resultant (or any other sequence a caller
 * windows the same way), up/down browse some other variation axis the
 * caller defines (e.g. Motif Explorer's rest patterns). Purely
 * presentational and carries no status text of its own — like
 * `SchillingerPianoRoll` itself, it owns no state; the caller supplies the
 * already-computed lanes and the navigation callbacks, and shows any
 * position/variation info wherever fits its own layout (a transport bar,
 * typically), not here.
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
  hideLabels,
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
          hideLabels={hideLabels}
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
    </div>
  );
}
