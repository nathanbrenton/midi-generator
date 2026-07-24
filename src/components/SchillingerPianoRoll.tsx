import "./SchillingerPianoRoll.css";

export interface PianoRollSegment {
  duration: number;
  /** Highlights a coincidence point — where more than one generator attacks together. */
  accent?: boolean;
  /** Highlights an occurrence of a searched-for rhythmic pattern (analysis mode). */
  matched?: boolean;
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
}

const LABEL_WIDTH = 130;
const ROLL_WIDTH = 800;
const TOTAL_WIDTH = LABEL_WIDTH + ROLL_WIDTH;
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
}: SchillingerPianoRollProps) {
  const totalHeight = laneY(lanes.length) - LANE_GAP;
  const { beatsPerBar, unitsPerBeat } = timeSignature;
  const barLength = beatsPerBar * unitsPerBeat;
  const barCount = Math.max(1, Math.round(cycleLength / barLength));

  const ruler = [];
  for (let bar = 0; bar < barCount; bar++) {
    for (let beat = 0; beat < beatsPerBar; beat++) {
      const unit = bar * barLength + beat * unitsPerBeat;
      const x = LABEL_WIDTH + (unit / cycleLength) * ROLL_WIDTH;
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
      x1={LABEL_WIDTH + ROLL_WIDTH}
      x2={LABEL_WIDTH + ROLL_WIDTH}
      y1={0}
      y2={totalHeight}
      className="piano-roll__barline piano-roll__barline--edge"
    />,
  );

  return (
    <svg
      viewBox={`0 0 ${TOTAL_WIDTH} ${totalHeight}`}
      className="piano-roll"
      preserveAspectRatio="none"
      role="img"
      aria-label="Piano-roll preview of the generated rhythm"
    >
      {lanes.map((lane, laneIndex) => {
        const y = laneY(laneIndex);
        let cursor = 0;
        const blocks = lane.segments.map((segment, segmentIndex) => {
          const x = LABEL_WIDTH + (cursor / cycleLength) * ROLL_WIDTH;
          const width = (segment.duration / cycleLength) * ROLL_WIDTH;
          cursor += segment.duration;
          const fill = segment.accent ? "#d98c2b" : lane.color;
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
                className={segment.matched ? "piano-roll__note piano-roll__note--matched" : "piano-roll__note"}
              />
              <rect x={x} y={y + 3} width={Math.max(width - 1, 0)} height={4} rx={2} fill={highlight} />
              {width >= MIN_LABEL_WIDTH && (
                <text x={x + width / 2} y={y + LANE_HEIGHT / 2 + 5} className="piano-roll__duration">
                  {segment.duration}
                </text>
              )}
            </g>
          );
        });
        return (
          <g key={lane.label}>
            <text x={4} y={y + LANE_HEIGHT / 2 + 4} className="piano-roll__lanelabel">
              {lane.label}
            </text>
            {blocks}
          </g>
        );
      })}
      {ruler}
      {playheadFraction != null && (
        <line
          x1={LABEL_WIDTH + playheadFraction * ROLL_WIDTH}
          x2={LABEL_WIDTH + playheadFraction * ROLL_WIDTH}
          y1={0}
          y2={totalHeight}
          className="piano-roll__playhead"
        />
      )}
    </svg>
  );
}
