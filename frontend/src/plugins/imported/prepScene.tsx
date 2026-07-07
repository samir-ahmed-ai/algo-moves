/**
 * Generic ANIMATED scene player for imported prep problems that don't have a
 * hand-built simulator. Every prep problem ships a cinematic `scene` mnemonic,
 * a `visual` (how it runs) and a `memorize` line. This module turns those into
 * a stepped, word-by-word reveal so the canvas player animates them like any
 * other visualization — Scene → How it runs → Memorize → Complexity.
 */
import { Clapperboard, Film, KeyRound, Timer } from 'lucide-react';
import { type Frame, type InspectorProps, type PluginViewProps } from '../../core/types';
import { cn } from '@/lib/utils/cn';
import { InspectorRow, VarGrid, VizEmpty, vizText } from '../_shared/vizKit';
import type { PrepProblem } from './prepTypes';

export interface PrepSceneState {
  p: PrepProblem;
  /** -1 = title hero, 0..2 = the three reveal stages, 3 = complexity. */
  stageIdx: number;
  /** Words revealed so far within the active stage. */
  reveal: number;
}

interface Stage {
  key: 'scene' | 'visual' | 'memorize';
  label: string;
  pick: (p: PrepProblem) => string;
  mono?: boolean;
}

const STAGES: Stage[] = [
  { key: 'scene', label: 'Scene', pick: (p) => p.scene },
  { key: 'visual', label: 'How it runs', pick: (p) => p.visual },
  { key: 'memorize', label: 'Memorize', pick: (p) => p.memorize, mono: true },
];

const CHUNK = 3; // words revealed per frame

function words(s: string): string[] {
  return (s || '').trim().split(/\s+/).filter(Boolean);
}

/** Stepped reveal frames so the player animates the mnemonic beat by beat. */
export function recordScene(p: PrepProblem): Frame<PrepSceneState>[] {
  const frames: Frame<PrepSceneState>[] = [];
  const push = (
    stageIdx: number,
    reveal: number,
    type: string,
    note: string,
    caption: string,
    tone?: 'good' | 'bad',
  ) =>
    frames.push({
      move: { type, note, caption, ...(tone !== undefined ? { tone } : {}) },
      state: { p, stageIdx, reveal },
    });

  push(
    -1,
    0,
    'TITLE',
    p.pattern || 'scene',
    `“${p.title}” — picture the scene, watch it run, then lock in the line.`,
  );

  STAGES.forEach((stage, si) => {
    const ws = words(stage.pick(p));
    if (ws.length === 0) return;
    const steps = Math.max(1, Math.ceil(ws.length / CHUNK));
    for (let k = 1; k <= steps; k++) {
      const reveal = Math.min(ws.length, k * CHUNK);
      push(si, reveal, stage.key.toUpperCase(), stage.label, ws.slice(0, reveal).join(' '));
    }
  });

  push(
    STAGES.length,
    0,
    'COMPLEXITY',
    'cost',
    `Runs in ${p.time || '—'} time and ${p.space || '—'} space.`,
    'good',
  );
  return frames;
}

const STAGE_ICON = [Clapperboard, Film, KeyRound];

function StageCard({
  stage,
  index,
  state,
}: {
  stage: Stage;
  index: number;
  state: PrepSceneState;
}) {
  const full = words(stage.pick(state.p));
  if (full.length === 0) return null; // stage was skipped (empty text) — don't render an empty 'done' card
  const active = state.stageIdx === index;
  const done = state.stageIdx > index;
  const shown = active ? full.slice(0, state.reveal) : done ? full : [];
  const pending = active ? full.slice(state.reveal) : done ? [] : full;
  const Icon = STAGE_ICON[index] ?? Film;
  return (
    <div
      className="rounded-[var(--radius)] border p-3 transition-all duration-300"
      style={{
        borderColor: active ? 'var(--accent)' : done ? 'var(--good)' : 'var(--border)',
        background: active ? 'var(--accent-bg)' : 'transparent',
        opacity: active || done ? 1 : 0.5,
      }}
    >
      <div
        className={cn(
          'mb-1.5 flex items-center gap-1.5 font-medium uppercase tracking-wide',
          vizText.xs,
        )}
        style={{ color: active ? 'var(--accent)' : done ? 'var(--good)' : 'var(--text-3)' }}
      >
        <Icon className="h-3.5 w-3.5" />
        {stage.label}
      </div>
      <p className={cn('scene-body leading-relaxed', stage.mono && 'font-mono', vizText.base)}>
        <span className="text-ink">{shown.join(' ')}</span>
        {active && state.reveal < full.length && (
          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-accent align-middle" />
        )}
        {pending.length > 0 && !active && <span className="text-ink3">{pending.join(' ')}</span>}
      </p>
    </div>
  );
}

export function SceneView({ frame }: PluginViewProps<PrepSceneState>) {
  const s = frame.state;
  const { p } = s;
  const complexity = s.stageIdx >= STAGES.length;
  return (
    <div className="board-area flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium',
            vizText.sm,
          )}
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
        >
          <Film className="h-3.5 w-3.5" /> {p.topicTitle}
        </span>
        {p.pattern && (
          <span
            className={cn('rounded-md px-2 py-0.5 text-ink2', vizText.sm)}
            style={{ background: 'var(--surface-2)' }}
          >
            {p.pattern}
          </span>
        )}
      </div>

      {s.stageIdx < 0 ? (
        <div
          className="grid place-items-center rounded-[var(--radius)] border border-dashed border-edge py-8 text-center"
          style={{ background: 'var(--surface-2)' }}
        >
          <Clapperboard className="mb-2 h-7 w-7 text-accent" />
          <div className={cn('font-semibold text-ink', vizText.expr)}>{p.title}</div>
          <div className={cn('mt-1 max-w-[42ch] text-ink3', vizText.sm)}>
            Play to reveal the scene →
          </div>
        </div>
      ) : (
        STAGES.map((stage, i) => <StageCard key={stage.key} stage={stage} index={i} state={s} />)
      )}

      <div
        className="flex items-center gap-2 rounded-[var(--radius)] border p-3 transition-all duration-300"
        style={{
          borderColor: complexity ? 'var(--good)' : 'var(--border)',
          background: complexity ? 'var(--good-bg)' : 'transparent',
          opacity: complexity ? 1 : 0.5,
        }}
      >
        <Timer
          className="h-3.5 w-3.5"
          style={{ color: complexity ? 'var(--good)' : 'var(--text-3)' }}
        />
        <span className={cn(vizText.base, 'text-ink2')}>
          <span className="font-mono text-ink">{p.time || '—'}</span> time ·{' '}
          <span className="font-mono text-ink">{p.space || '—'}</span> space
        </span>
      </div>
    </div>
  );
}

export function SceneInspector({ frame }: InspectorProps<PrepSceneState>) {
  // Guard: this is also the default inspector fallback for simulators that omit
  // their own Inspector, whose frame.state is NOT a PrepSceneState (has no `p`).
  const p = frame?.state?.p;
  if (!frame || !p) return <VizEmpty />;
  const stage = frame.state.stageIdx;
  return (
    <VarGrid>
      <InspectorRow k="topic" v={p.topicTitle} />
      <InspectorRow k="pattern" v={p.pattern || '—'} />
      <InspectorRow
        k="stage"
        v={stage < 0 ? 'intro' : stage >= STAGES.length ? 'complexity' : STAGES[stage]!.label}
      />
      <InspectorRow k="time" v={p.time || '—'} />
      <InspectorRow k="space" v={p.space || '—'} />
      {p.memorize && (
        <details className="mt-2 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
          <summary className={cn('cursor-pointer', vizText.xs, 'text-ink3')}>Memorize</summary>
          <p className={cn('nodrag mt-1.5 font-mono leading-relaxed text-ink2', vizText.xs)}>
            {p.memorize}
          </p>
        </details>
      )}
      {p.acquired && (
        <details className="mt-1.5 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
          <summary className={cn('cursor-pointer', vizText.xs, 'text-ink3')}>Acquired</summary>
          <p className={cn('nodrag mt-1.5 leading-relaxed text-ink2', vizText.xs)}>{p.acquired}</p>
        </details>
      )}
    </VarGrid>
  );
}

export function sceneVerdict(frames: Frame<PrepSceneState>[]) {
  const p = frames[0]?.state.p;
  return { ok: true, label: p?.time ? `${p.time}` : 'scene' };
}
