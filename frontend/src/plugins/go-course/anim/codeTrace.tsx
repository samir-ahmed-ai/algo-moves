import { type ComponentType } from 'react';
import { Flag, Sparkles } from 'lucide-react';
import type { Frame, InspectorProps, PluginViewProps } from '../../../core/types';
import { cn } from '@/lib/utils/cn';
import {
  VizStage,
  RailSection,
  InspectorRow,
  VarGrid,
  VizEmpty,
  vizText,
} from '../../_shared/vizKit';
import type { GoConcept, GoStateChip } from '../types';

/** Resolved per-step state the View renders. */
export interface TraceState {
  /** -1 = intro, 0..total-1 = steps, total = recap. */
  step: number;
  total: number;
  title: string;
  caption: string;
  chips: GoStateChip[];
}

/** One frame per walkthrough step, bracketed by an intro and a recap frame. */
export function recordTrace(concept: GoConcept): Frame<TraceState>[] {
  const steps = concept.walkthrough ?? [];
  const total = steps.length;
  const base = { total };
  const frames: Frame<TraceState>[] = [];

  const introCaption = concept.visual || concept.summary || `${concept.title} — step through it`;
  const recapCaption = concept.memorize || concept.summary || concept.title;

  frames.push({
    move: {
      type: 'START',
      note: `${concept.title} — press play to walk through`,
      caption: introCaption,
    },
    state: { ...base, step: -1, title: 'Start', caption: introCaption, chips: [] },
  });

  steps.forEach((s, i) => {
    const label = s.title || `Step ${i + 1}`;
    const caption = s.caption || label;
    frames.push({
      move: { type: label.toUpperCase(), note: caption, caption },
      state: { ...base, step: i, title: label, caption, chips: s.state ?? [] },
    });
  });

  frames.push({
    move: { type: 'RECALL', note: recapCaption, caption: recapCaption, tone: 'good' },
    state: { ...base, step: total, title: 'Recall', caption: recapCaption, chips: [] },
  });

  return frames;
}

function StepBadge({ s }: { s: TraceState }) {
  const label =
    s.step < 0 ? 'Intro' : s.step >= s.total ? 'Recall' : `Step ${s.step + 1} / ${s.total}`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium',
        vizText.sm,
      )}
      style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
    >
      {s.step < 0 ? (
        <Flag className="h-3.5 w-3.5" />
      ) : s.step >= s.total ? (
        <Sparkles className="h-3.5 w-3.5" />
      ) : null}
      {label}
    </span>
  );
}

/** Narrative walkthrough: step caption and state chips update per frame. */
export function TraceView({ frame }: PluginViewProps<TraceState>) {
  const s = frame.state;

  return (
    <VizStage
      className="viz-stage--fill h-full min-h-0"
      railWidth={148}
      rail={
        <>
          <RailSection label="Step">
            <StepBadge s={s} />
          </RailSection>
          {s.chips.length > 0 && (
            <RailSection label="State">
              <div className="flex flex-col gap-1">
                {s.chips.map((c, i) => (
                  <div
                    key={`${c.k}-${i}`}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md border border-edge bg-panel2/50 px-1.5 py-1',
                      vizText.sm,
                    )}
                  >
                    <span className="truncate text-ink3">{c.k}</span>
                    <span className={cn('shrink-0 font-mono text-ink', vizText.mono)}>{c.v}</span>
                  </div>
                ))}
              </div>
            </RailSection>
          )}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className={cn('shrink-0 font-semibold text-ink', vizText.base)}>{s.title}</div>

        <div
          className={cn(
            'min-h-0 flex-1 overflow-auto rounded-[var(--radius)] border-l-2 bg-panel2/40 px-3 py-2.5 leading-relaxed text-ink2',
            vizText.base,
          )}
          style={{ borderColor: s.step >= s.total ? 'var(--good)' : 'var(--accent)' }}
        >
          {s.caption}
        </div>
      </div>
    </VizStage>
  );
}

export function traceVerdict(frames: Frame<TraceState>[]) {
  const total = frames[0]?.state.total ?? 0;
  return { ok: true, label: total ? `${total} steps` : 'trace' };
}

/** Concept inspector: live step + static concept detail (memorize, takeaways, design). */
export function makeGoInspector(concept: GoConcept): ComponentType<InspectorProps<TraceState>> {
  return function GoConceptInspector({ frame }: InspectorProps<TraceState>) {
    if (!frame) return <VizEmpty message="Press play to trace this concept." />;
    const s = frame.state;
    const stage = s.step < 0 ? 'intro' : s.step >= s.total ? 'recall' : `step ${s.step + 1}`;
    return (
      <VarGrid>
        <InspectorRow k="topic" v={concept.tags[0] ?? '—'} />
        <InspectorRow k="pattern" v={concept.pattern || '—'} />
        <InspectorRow k="difficulty" v={concept.difficulty} />
        <InspectorRow k="stage" v={stage} />
        {concept.memorize && (
          <details className="mt-2 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
            <summary className={cn('cursor-pointer text-ink3', vizText.xs)}>Memorize</summary>
            <p className={cn('nodrag mt-1.5 font-mono leading-relaxed text-ink2', vizText.xs)}>
              {concept.memorize}
            </p>
          </details>
        )}
        {concept.keyPoints.length > 0 && (
          <details className="mt-1.5 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
            <summary className={cn('cursor-pointer text-ink3', vizText.xs)}>
              Senior takeaways
            </summary>
            <ul
              className={cn(
                'nodrag mt-1.5 list-disc space-y-1 pl-4 leading-relaxed text-ink2',
                vizText.xs,
              )}
            >
              {concept.keyPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        )}
        {concept.design && (
          <details className="mt-1.5 rounded-md border border-edge bg-panel2/40 px-2 py-1.5">
            <summary className={cn('cursor-pointer text-ink3', vizText.xs)}>
              Design question &amp; model answer
            </summary>
            <p className={cn('nodrag mt-1.5 font-medium leading-relaxed text-ink', vizText.xs)}>
              {concept.design.prompt}
            </p>
            <p className={cn('nodrag mt-1 leading-relaxed text-ink2', vizText.xs)}>
              {concept.design.answer}
            </p>
          </details>
        )}
      </VarGrid>
    );
  };
}
