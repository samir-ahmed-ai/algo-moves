import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { ProblemBriefCase } from '@/content';
import { looksLikeJson } from '@/lib/utils/formatJsonDisplay';
import { JsonBlock } from '@/components/code/JsonBlock';
import { ControlsAccordion, nodeText } from '@/shell/canvas';

function InfoParagraphs({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  const [lead, ...rest] = lines;
  return (
    <div className="problem-brief-copy">
      <p className={cn('problem-brief-lead leading-relaxed text-ink', nodeText.sm)}>{lead}</p>
      {rest.map((line) => (
        <p
          key={line}
          className={cn('problem-brief-insight leading-relaxed text-ink2', nodeText.sm)}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function CaseIo({ c }: { c: ProblemBriefCase }) {
  return (
    <div className="problem-brief-io flex flex-col gap-2">
      <div className="min-w-0 flex-1">
        <p className={cn('mb-1 text-ink3', nodeText.xs)}>Input</p>
        <JsonBlock value={c.input} size="sm" variant="nested" maxHeight="320px" />
      </div>
      {c.output &&
        (looksLikeJson(c.output) ? (
          <div className="min-w-0 flex-1">
            <p className={cn('mb-1 text-ink3', nodeText.xs)}>Output</p>
            <JsonBlock value={c.output} size="sm" variant="nested" maxHeight="240px" />
          </div>
        ) : (
          <div className="min-w-0">
            <p className={cn('mb-1 text-ink3', nodeText.xs)}>Output</p>
            <p className={cn('font-mono text-ink', nodeText.sm)}>{c.output}</p>
          </div>
        ))}
    </div>
  );
}

function CaseContent({ c }: { c: ProblemBriefCase }) {
  return (
    <>
      {c.note ? (
        <ControlsAccordion
          title="Example description"
          defaultOpen
          className="border-t-0"
          bodyClassName="pt-1.5"
        >
          <p className={cn('leading-relaxed text-ink2', nodeText.sm)}>{c.note}</p>
        </ControlsAccordion>
      ) : null}
      <ControlsAccordion
        title="Input & output"
        defaultOpen
        className="border-t-0"
        bodyClassName="pt-1.5"
      >
        <CaseIo c={c} />
      </ControlsAccordion>
    </>
  );
}

function CaseTab({
  index,
  label,
  active,
  onSelect,
  tabId,
  panelId,
}: {
  index: number;
  label: string;
  active: boolean;
  onSelect: () => void;
  tabId: string;
  panelId: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      className={cn(
        'problem-brief-tab flex shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)-2px)] border px-2 py-1 font-medium transition-colors',
        nodeText.xs,
        active
          ? 'problem-brief-tab--active border-accent/25 bg-accent text-white shadow-sm'
          : 'problem-brief-tab--idle border-transparent bg-transparent text-ink2 hover:bg-panel hover:text-ink',
      )}
    >
      <span
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-full text-[length:var(--fs-2xs)] font-bold tabular-nums',
          active ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent',
        )}
      >
        {index + 1}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function InfoCases({ cases }: { cases: ProblemBriefCase[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;

  useEffect(() => {
    if (active > cases.length - 1) setActive(0);
  }, [active, cases.length]);

  if (cases.length === 0) return null;

  const current = cases[Math.min(active, cases.length - 1)] ?? cases[0];
  if (!current) return null;

  // Single example: no tab strip needed, just show the content compactly.
  if (cases.length === 1) {
    return (
      <div className="problem-brief-cases mt-1.5">
        <div className="problem-brief-case overflow-hidden rounded-md border border-edge/60 bg-panel2/40 px-1.5 pb-1.5 pt-1">
          <CaseContent c={current} />
        </div>
      </div>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowLeft' ? -1 : 1;
    const next = (active + delta + cases.length) % cases.length;
    setActive(next);
    const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    btn?.focus();
  };

  const panelId = `problem-brief-panel-${uid}`;

  return (
    <div className="problem-brief-cases mt-1.5">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Examples"
        onKeyDown={onKeyDown}
        className="problem-brief-tabs ws-scroll flex items-center gap-0.5 overflow-x-auto rounded-md border border-edge bg-panel2/50 p-0.5"
      >
        {cases.map((c, i) => (
          <CaseTab
            key={c.label}
            index={i}
            label={c.label}
            active={i === active}
            onSelect={() => setActive(i)}
            tabId={`problem-brief-tab-${uid}-${i}`}
            panelId={panelId}
          />
        ))}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`problem-brief-tab-${uid}-${active}`}
        className="problem-brief-case overflow-hidden rounded-md border border-edge/60 bg-panel2/40 px-1.5 pb-1.5 pt-1"
      >
        <CaseContent c={current} />
      </div>
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
