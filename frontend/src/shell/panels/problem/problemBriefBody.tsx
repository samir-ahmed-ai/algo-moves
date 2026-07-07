import { cn } from '@/lib/utils/cn';
import type { ProblemBriefCase } from '@/content';
import { looksLikeJson } from '@/lib/utils/formatJsonDisplay';
import { JsonBlock } from '@/components/code/JsonBlock';
import { ControlsAccordion, nodeText } from '@/shell/canvas';

function InfoParagraphs({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={cn('problem-brief-copy leading-relaxed text-ink2', nodeText.sm)}>
          {line}
        </p>
      ))}
    </>
  );
}

function CaseIo({ c }: { c: ProblemBriefCase }) {
  return (
    <>
      <JsonBlock value={c.input} size="xs" variant="nested" maxHeight="200px" />
      {c.output &&
        (looksLikeJson(c.output) ? (
          <div className="mt-1.5">
            <p className={cn('mb-0.5 text-ink3', nodeText.xs)}>Output</p>
            <JsonBlock value={c.output} size="xs" variant="nested" maxHeight="120px" />
          </div>
        ) : (
          <p className={cn('mt-0.5 text-ink3', nodeText.xs)}>
            → <span className="font-mono text-ink">{c.output}</span>
          </p>
        ))}
    </>
  );
}

export function InfoCases({ cases }: { cases: ProblemBriefCase[] }) {
  if (cases.length === 0) return null;
  return (
    <div className="problem-brief-cases mt-1.5 space-y-1">
      {cases.map((c, i) => (
        <div
          key={c.label}
          className="problem-brief-case overflow-hidden rounded-md border border-edge/60 bg-panel2/40 px-1.5 pb-1"
        >
          <ControlsAccordion
            title={c.label}
            defaultOpen
            className="border-t-0"
            right={
              <span className="problem-brief-case-index grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent/15 text-[length:var(--fs-2xs)] font-bold tabular-nums text-accent">
                {i + 1}
              </span>
            }
          >
            {c.note ? (
              <ControlsAccordion title="Example description" defaultOpen className="border-t-0">
                <p className={cn('leading-relaxed text-ink2', nodeText.xs)}>{c.note}</p>
              </ControlsAccordion>
            ) : null}
            <ControlsAccordion title="Input & output" defaultOpen={!c.note} className="border-t-0">
              <CaseIo c={c} />
            </ControlsAccordion>
          </ControlsAccordion>
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
    <div className="problem-brief space-y-1">
      {statements.length > 0 && <InfoParagraphs lines={statements} />}
      <InfoCases cases={cases} />
    </div>
  );
}
