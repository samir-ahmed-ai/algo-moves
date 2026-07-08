import { Brain } from 'lucide-react';
import type { ProblemPlugin } from '../../core/types';

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
    <div className="flex flex-col gap-2.5 pb-1 pr-0.5">
      {concept.visual && (
        <p className="rounded-lg border border-edge bg-panel2/40 px-2.5 py-1.5 text-[length:var(--fs-tight)] leading-relaxed text-ink2">
          {concept.visual}
        </p>
      )}

      {steps.length > 0 && (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-panel2 text-[length:var(--fs-2xs)] font-bold text-ink2">
                {i + 1}
              </span>
              <div className="min-w-0">
                {s.title && (
                  <div className="text-[length:var(--fs-tight)] font-semibold text-ink">
                    {s.title}
                  </div>
                )}
                {s.caption && (
                  <p className="text-[length:var(--fs-tight)] leading-snug text-ink2">
                    {s.caption}
                  </p>
                )}
                {s.state && s.state.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.state.map((chip, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 rounded border border-edge bg-panel2/60 px-1 py-0.5 text-[length:var(--fs-2xs)]"
                      >
                        <span className="text-ink3">{chip.k}</span>
                        <span className="font-mono text-ink">{chip.v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {concept.memorize && (
        <div className="rounded-xl border border-accentbg bg-accentbg/40 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-accent">
            <Brain className="h-3 w-3" />
            Remember
          </div>
          <p className="mt-0.5 text-[length:var(--fs-tight)] leading-snug text-ink2">
            {concept.memorize}
          </p>
        </div>
      )}

      {concept.keyPoints && concept.keyPoints.length > 0 && (
        <div>
          <div className="text-[length:var(--fs-2xs)] font-semibold uppercase tracking-wide text-ink3">
            Key points
          </div>
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4">
            {concept.keyPoints.map((p, i) => (
              <li key={i} className="text-[length:var(--fs-tight)] leading-snug text-ink2">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
