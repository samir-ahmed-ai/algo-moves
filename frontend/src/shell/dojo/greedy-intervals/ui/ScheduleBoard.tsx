import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  assignLanes,
  formatTime,
  overlaps,
  type Meeting,
  type ScheduleLevel,
} from '../engine/schedule';
import { useScheduleGame } from '../ScheduleGameProvider';

const W = 720;
const PAD_X = 14;
const TICK_TOP = 22;
const LANES_TOP = 30;
const LANE_H = 42;
const LANE_GAP = 10;
const CAL_LABEL_H = 24;
const CAL_H = 46;
const PAD_BOTTOM = 10;

type BlockState = 'open' | 'hint' | 'booked' | 'blocked';

function xAt(level: ScheduleLevel, t: number): number {
  return PAD_X + ((t - level.dayStart) / (level.dayEnd - level.dayStart)) * (W - 2 * PAD_X);
}

const BLOCK_FILL: Record<BlockState, string> = {
  open: 'var(--panel2)',
  hint: 'var(--accentbg)',
  booked: 'color-mix(in srgb, var(--good) 14%, var(--panel))',
  blocked: 'var(--panel)',
};

const BLOCK_STROKE: Record<BlockState, string> = {
  open: 'var(--edge)',
  hint: 'var(--accent)',
  booked: 'var(--good)',
  blocked: 'var(--edge)',
};

function MeetingBlock({
  level,
  meeting,
  index,
  x,
  y,
  width,
  state,
  clipSuffix,
}: {
  level: ScheduleLevel;
  meeting: Meeting;
  index: number;
  x: number;
  y: number;
  width: number;
  state: BlockState;
  clipSuffix: string;
}) {
  const clipId = `gi-clip-${level.id}-${clipSuffix}-${index}`;
  const muted = state === 'blocked';

  return (
    <g opacity={muted ? 0.45 : 1}>
      <title>{`${meeting.name} · ${formatTime(meeting.start)}–${formatTime(meeting.end)}`}</title>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={width} height={LANE_H} rx={8} />
      </clipPath>
      <rect
        x={x}
        y={y}
        width={width}
        height={LANE_H}
        rx={8}
        fill={BLOCK_FILL[state]}
        stroke={BLOCK_STROKE[state]}
        strokeWidth={state === 'hint' || state === 'booked' ? 2 : 1}
      >
        {state === 'hint' ? (
          <animate
            attributeName="stroke-opacity"
            values="1;0.25;1"
            dur="1.1s"
            repeatCount="indefinite"
          />
        ) : null}
      </rect>
      <g clipPath={`url(#${clipId})`}>
        <rect
          x={x + 6}
          y={y + 6}
          width={16}
          height={16}
          rx={4}
          fill="var(--panel)"
          stroke="var(--edge)"
        />
        <text
          x={x + 14}
          y={y + 18}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={state === 'hint' ? 'var(--accent)' : muted ? 'var(--ink3)' : 'var(--ink)'}
        >
          {index + 1}
        </text>
        <text
          x={x + 27}
          y={y + 18}
          fontSize={12}
          fontWeight={600}
          fill={state === 'booked' ? 'var(--good)' : muted ? 'var(--ink3)' : 'var(--ink)'}
          textDecoration={muted ? 'line-through' : undefined}
        >
          {meeting.name}
        </text>
        <text x={x + 8} y={y + 35} fontSize={10} fill="var(--ink3)">
          {formatTime(meeting.start)}–{formatTime(meeting.end)}
        </text>
      </g>
    </g>
  );
}

export function ScheduleBoard() {
  const { level, booked, hintIndices, complete, shake } = useScheduleGame();

  const lanes = useMemo(() => assignLanes(level), [level]);
  const laneCount = Math.max(...lanes) + 1;

  const calTop = LANES_TOP + laneCount * (LANE_H + LANE_GAP) + CAL_LABEL_H;
  const height = calTop + CAL_H + PAD_BOTTOM;

  const hours: number[] = [];
  for (let t = Math.ceil(level.dayStart / 60) * 60; t <= level.dayEnd; t += 60) hours.push(t);

  const stateOf = (index: number): BlockState => {
    if (booked.includes(index)) return 'booked';
    const meeting = level.meetings[index]!;
    if (booked.some((b) => overlaps(meeting, level.meetings[b]!))) return 'blocked';
    if (hintIndices.includes(index)) return 'hint';
    return 'open';
  };

  return (
    <div className={cn('w-full max-w-3xl min-w-0', shake && 'vim-maze-cursor--shake')}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Meeting timeline from ${formatTime(level.dayStart)} to ${formatTime(level.dayEnd)} with ${level.meetings.length} meetings, ${booked.length} booked`}
      >
        {hours.map((t) => (
          <g key={t}>
            <line
              x1={xAt(level, t)}
              y1={TICK_TOP}
              x2={xAt(level, t)}
              y2={calTop + CAL_H}
              stroke="var(--edge)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={xAt(level, t)}
              y={14}
              textAnchor="middle"
              fontSize={11}
              fill="var(--ink3)"
              className="tabular-nums"
            >
              {formatTime(t)}
            </text>
          </g>
        ))}

        {level.meetings.map((meeting, i) => (
          <MeetingBlock
            key={i}
            level={level}
            meeting={meeting}
            index={i}
            x={xAt(level, meeting.start) + 1}
            y={LANES_TOP + lanes[i]! * (LANE_H + LANE_GAP)}
            width={xAt(level, meeting.end) - xAt(level, meeting.start) - 2}
            state={stateOf(i)}
            clipSuffix="lane"
          />
        ))}

        <text
          x={PAD_X}
          y={calTop - 8}
          fontSize={10}
          fontWeight={700}
          letterSpacing={1}
          fill={complete ? 'var(--good)' : 'var(--ink3)'}
          style={{ textTransform: 'uppercase' }}
        >
          {`YOUR CALENDAR${complete ? ' — OPTIMAL' : ''}`}
        </text>
        <rect
          x={PAD_X - 4}
          y={calTop - 2}
          width={W - 2 * PAD_X + 8}
          height={CAL_H + 4}
          rx={10}
          fill="none"
          stroke={complete ? 'var(--good)' : 'var(--edge)'}
          strokeWidth={complete ? 2 : 1}
          strokeDasharray={complete ? undefined : '4 4'}
        />
        {booked.length === 0 ? (
          <text
            x={W / 2}
            y={calTop + CAL_H / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fill="var(--ink3)"
          >
            Bookings land here — press a meeting&apos;s number
          </text>
        ) : null}
        {booked.map((i) => {
          const meeting = level.meetings[i]!;
          return (
            <MeetingBlock
              key={`cal-${i}`}
              level={level}
              meeting={meeting}
              index={i}
              x={xAt(level, meeting.start) + 1}
              y={calTop}
              width={xAt(level, meeting.end) - xAt(level, meeting.start) - 2}
              state="booked"
              clipSuffix="cal"
            />
          );
        })}
      </svg>
    </div>
  );
}
