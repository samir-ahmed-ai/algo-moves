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
    <div className="mt-2 space-y-2">
      {cases.map((c) => (
        <div key={c.label} className="rounded-md border border-edge/60 bg-panel2/40 px-2.5 py-2">
          <p className={cn('font-medium text-ink', nodeText.xs)}>{c.label}</p>
          <p className={cn('mt-0.5 font-mono text-ink2', nodeText.xs)}>{c.input}</p>
          {c.output && (
            <p className={cn('mt-0.5 text-ink2', nodeText.xs)}>
              Expected: <span className="font-mono text-ink">{c.output}</span>
            </p>
          )}
          {c.note && <p className={cn('mt-1 leading-relaxed text-ink3', nodeText.xs)}>{c.note}</p>}
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
