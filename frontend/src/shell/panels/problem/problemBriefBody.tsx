import { cn } from '@/lib/utils/cn';
import type { ProblemBriefCase } from '@/content';
import { nodeText } from '@/shell/canvas';

function InfoParagraphs({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={cn('leading-relaxed text-ink2', nodeText.sm)}>
          {line}
        </p>
      ))}
    </>
  );
}

export function InfoCases({ cases }: { cases: ProblemBriefCase[] }) {
  if (cases.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1.5">
      {cases.map((c, i) => (
        <div key={c.label} className="overflow-hidden rounded-md border border-edge/60 bg-panel2/40">
          <div className="flex items-center gap-2 border-b border-edge/40 bg-panel2/60 px-2 py-1">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent/15 text-[length:var(--fs-2xs)] font-bold tabular-nums text-accent">
              {i + 1}
            </span>
            <p className={cn('font-medium text-ink', nodeText.xs)}>{c.label}</p>
          </div>
          <div className="px-2 py-1.5">
            <p className={cn('font-mono text-ink2', nodeText.xs)}>{c.input}</p>
            {c.output && (
              <p className={cn('mt-0.5 text-ink3', nodeText.xs)}>
                → <span className="font-mono text-ink">{c.output}</span>
              </p>
            )}
            {c.note && <p className={cn('mt-1 leading-relaxed text-ink3', nodeText.xs)}>{c.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProblemBriefBody({
  statements,
  cases,
}: {
  statements: string[];
  cases: ProblemBriefCase[];
}) {
  if (statements.length === 0 && cases.length === 0) return null;
  return (
    <div className="space-y-1">
      {statements.length > 0 && <InfoParagraphs lines={statements} />}
      <InfoCases cases={cases} />
    </div>
  );
}
