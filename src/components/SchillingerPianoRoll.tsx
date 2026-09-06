import "./SchillingerPianoRoll.css";

export interface PianoRollSegment {
  duration: number;
  /** Highlights a coincidence point — where more than one generator attacks together. */
  accent?: boolean;
  /** Highlights an occurrence of a searched-for rhythmic pattern (analysis mode). */
  matched?: boolean;
  /** Highlights a segment within the currently selected loop/cycle range. */
  looped?: boolean;
  /** Marks this segment as silence rather than a sounding note — rendered hollow instead of filled. */
  rest?: boolean;
}

export interface PianoRollLane {
  label: string;
  color: string;
  highlight: string;
  segments: PianoRollSegment[];
}

export interface SchillingerPianoRollProps {
  lanes: PianoRollLane[];
  cycleLength: number;
  timeSignature: { beatsPerBar: number; unitsPerBeat: number };
  /** Fraction (0-1) of the cycle currently playing; omit to hide the playhead. */
  playheadFraction?: number;
  /** Drops the left-hand lane-label column entirely, giving the roll the full width. */
  hideLabels?: boolean;
}

const LABEL_WIDTH = 130;
const ROLL_WIDTH = 800;
const RULER_HEIGHT = 22;
const LANE_HEIGHT = 34;
const LANE_GAP = 8;
const MIN_LABEL_WIDTH = 18;

function laneY(index: number): number {
  return RULER_HEIGHT + index * (LANE_HEIGHT + LANE_GAP);
}

export default function SchillingerPianoRoll({
  lanes,
  cycleLength,
  timeSignature,
  playheadFraction,
  hideLabels = false,
}: SchillingerPianoRollProps) {
  const labelWidth = hideLabels ? 0 : LABEL_WIDTH;
  const totalWidth = labelWidth + ROLL_WIDTH;
  const totalHeight = laneY(lanes.length) - LANE_GAP;
  const { beatsPerBar, unitsPerBeat } = timeSignature;
  const barLength = beatsPerBar * unitsPerBeat;
  // Guards against a transient cycleLength of 0 (e.g. one render before an
  // async effect populates real data) producing NaN positions below.
  const safeCycleLength = cycleLength > 0 ? cycleLength : 1;
  const barCount = Math.max(1, Math.round(safeCycleLength / barLength));

  const ruler = [];
  for (let bar = 0; bar < barCount; bar++) {
    for (let beat = 0; beat < beatsPerBar; beat++) {
      const unit = bar * barLength + beat * unitsPerBeat;
      const x = labelWidth + (unit / safeCycleLength) * ROLL_WIDTH;
      const isBarStart = beat === 0;
      ruler.push(
        <line
          key={`line-${bar}-${beat}`}
          x1={x}
          x2={x}
          y1={0}
          y2={totalHeight}
          className={isBarStart ? "piano-roll__barline piano-roll__barline--edge" : "piano-roll__barline"}
        />,
      );
      ruler.push(
        <text key={`label-${bar}-${beat}`} x={x + 4} y={RULER_HEIGHT - 7} className="piano-roll__barnumber">
          {bar + 1}.{beat + 1}
        </text>,
      );
    }
  }
  ruler.push(
    <line
      key="line-end"
      x1={labelWidth + ROLL_WIDTH}
      x2={labelWidth + ROLL_WIDTH}
      y1={0}
      y2={totalHeight}
      className="piano-roll__barline piano-roll__barline--edge"
    />,
  );

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="piano-roll"
      preserveAspectRatio="none"
      role="img"
      aria-label="Piano-roll preview of the generated rhythm"
    >
      {lanes.map((lane, laneIndex) => {
        const y = laneY(laneIndex);
        let cursor = 0;
        const blocks = lane.segments.map((segment, segmentIndex) => {
          const x = labelWidth + (cursor / safeCycleLength) * ROLL_WIDTH;
          const width = (segment.duration / safeCycleLength) * ROLL_WIDTH;
          cursor += segment.duration;
          const isRest = segment.rest ?? false;
          const fill = isRest ? "transparent" : segment.accent ? "#d98c2b" : lane.color;
          const highlight = segment.accent ? "#f2b25c" : lane.highlight;
          return (
            <g key={segmentIndex}>
              <rect
                x={x}
                y={y}
                width={Math.max(width - 1, 0)}
                height={LANE_HEIGHT}
                rx={3}
                fill={fill}
                stroke={isRest ? lane.color : undefined}
                className={[
                  "piano-roll__note",
                  isRest && "piano-roll__note--rest",
                  segment.matched && "piano-roll__note--matched",
                  segment.looped && "piano-roll__note--looped",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              {!isRest && <rect x={x} y={y + 3} width={Math.max(width - 1, 0)} height={4} rx={2} fill={highlight} />}
              {width >= MIN_LABEL_WIDTH && (
                <text
                  x={x + width / 2}
                  y={y + LANE_HEIGHT / 2 + 5}
                  className={isRest ? "piano-roll__duration piano-roll__duration--rest" : "piano-roll__duration"}
                >
                  {isRest ? "rest" : segment.duration}
                </text>
              )}
            </g>
          );
        });
        return (
          <g key={lane.label}>
            {!hideLabels && (
              <text x={4} y={y + LANE_HEIGHT / 2 + 4} className="piano-roll__lanelabel">
                {lane.label}
              </text>
            )}
            {blocks}
          </g>
        );
      })}
      {ruler}
      {playheadFraction != null && (
        <line
          x1={labelWidth + playheadFraction * ROLL_WIDTH}
          x2={labelWidth + playheadFraction * ROLL_WIDTH}
          y1={0}
          y2={totalHeight}
          className="piano-roll__playhead"
        />
      )}
    </svg>
  );
}
