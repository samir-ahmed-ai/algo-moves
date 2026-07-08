import { Brain } from 'lucide-react';
import type { ProblemPlugin } from '../../core/types';

const STATE_CHIP_TINTS = [
  { color: 'var(--accent)', bg: 'var(--accent-bg)' },
  { color: 'var(--good)', bg: 'var(--good-bg)' },
  {
    color: 'var(--team2-stroke)',
    bg: 'color-mix(in srgb, var(--team2-stroke) 14%, transparent)',
  },
  { color: 'var(--ring)', bg: 'color-mix(in srgb, var(--ring) 14%, transparent)' },
] as const;

function ConceptStateChip({ k, v, index }: { k: string; v: string; index: number }) {
  const tint = STATE_CHIP_TINTS[index % STATE_CHIP_TINTS.length]!;
  return (
    <span
      className="concept-state-chip inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[length:var(--fs-xs)]"
      style={{
        color: tint.color,
        background: tint.bg,
        borderColor: `color-mix(in srgb, ${tint.color} 28%, transparent)`,
      }}
    >
      <span className="font-medium opacity-80">{k}</span>
      <span className="font-mono font-semibold">{v}</span>
    </span>
  );
}

/** Concept fields the recall/read views pull off a Go-course plugin's trace input. */
export interface ReadConcept {
  pattern?: string;
  visual?: string;
  memorize?: string;
  keyPoints?: string[];
  walkthrough?: { title?: string; caption?: string; state?: { k: string; v: string }[] }[];
}

/** Read the concept payload a text-only course plugin carries as its first input value. */
export function conceptFromPlugin(plugin: ProblemPlugin<any, any>): ReadConcept {
  return (plugin.inputs[0]?.value ?? {}) as ReadConcept;
}

/**
 * The concept side of a recall/read view: the walkthrough as a numbered prose
 * list, then the memory hook and key points. Shared by the mobile deck's read
 * card and the desktop Learn Studio's text-only Overview.
 */
export function ConceptText({ concept }: { concept: ReadConcept }) {
  const steps = concept.walkthrough ?? [];
  return (
    <div className="concept-text flex flex-col gap-3 pb-1 pr-0.5">
      {concept.visual && (
        <p className="concept-text__visual rounded-lg border border-edge bg-panel2/40 px-3 py-2 text-[length:var(--fs-sm)] leading-relaxed text-ink2">
          {concept.visual}
        </p>
      )}

      {steps.length > 0 && (
        <ol className="concept-text__steps flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="concept-text__step-num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accentbg text-[length:var(--fs-xs)] font-bold text-accent">
                {i + 1}
              </span>
              <div className="min-w-0">
                {s.title && (
                  <div className="text-[length:var(--fs-sm)] font-semibold leading-snug text-ink">
                    {s.title}
                  </div>
                )}
                {s.caption && (
                  <p className="mt-0.5 text-[length:var(--fs-sm)] leading-relaxed text-ink2">
                    {s.caption}
                  </p>
                )}
                {s.state && s.state.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.state.map((chip, j) => (
                      <ConceptStateChip key={j} k={chip.k} v={chip.v} index={j} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {concept.memorize && (
        <div className="concept-text__remember rounded-xl border border-accentbg bg-accentbg/40 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide text-accent">
            <Brain className="h-3.5 w-3.5" />
            Remember
          </div>
          <p className="mt-1 text-[length:var(--fs-sm)] leading-relaxed text-ink2">
            {concept.memorize}
          </p>
        </div>
      )}

      {concept.keyPoints && concept.keyPoints.length > 0 && (
        <div>
          <div className="text-[length:var(--fs-xs)] font-semibold uppercase tracking-wide text-ink3">
            Key points
          </div>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
            {concept.keyPoints.map((p, i) => (
              <li key={i} className="text-[length:var(--fs-sm)] leading-relaxed text-ink2">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
