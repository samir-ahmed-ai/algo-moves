import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWorkspace } from '@/store/workspace';
import { cn } from '@/lib/utils/cn';
import { inputFrameCount, type InputFrameCounts } from '@/lib/canvas';
import type { SampleInput } from '../../../core/types';
import { isConceptCourse } from '@/lib/canvas/conceptCourse';
import { HighlightedCode } from '@/components/code/HighlightedCode';
import { JsonBlock } from '@/components/code/JsonBlock';
import { TONE_BAR } from '@/design/tone';
import { briefFor } from '@/content';
import {
  useCanvasStatic,
  stepExampleInput,
  Chip,
  ControlsAccordion,
  difficultyTone,
  NodeTagChip,
  nodeText,
  nodeTextWrap,
  Row,
  Section,
  useFlash,
} from '@/shell/canvas';
import { ProblemBriefBody } from './problemBriefBody';

function StepBadge({ count }: { count: number }) {
  return (
    <span className="problem-step-badge ml-auto shrink-0 rounded-full border border-edge bg-panel2 px-2 py-0.5 text-[length:var(--fs-2xs)] tabular-nums text-ink3">
      {count > 0 ? `${count} step${count === 1 ? '' : 's'}` : '0'}
    </span>
  );
}

function ExamplePills({
  inputs,
  inputId,
  pluginId,
  inputFrameCounts,
  onSelect,
}: {
  inputs: SampleInput[];
  inputId: string;
  pluginId: string;
  inputFrameCounts: InputFrameCounts;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="problem-example-pills nodrag flex flex-wrap gap-1"
      role="radiogroup"
      aria-label="sample inputs"
    >
      {inputs.map((i) => {
        const on = i.id === inputId;
        const ops = inputFrameCount(inputFrameCounts, i.id);
        return (
          <button
            key={i.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(i.id)}
            className={cn(
              'problem-example-pill inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--node-fs-xs,0.75rem)] transition-colors',
              on
                ? 'problem-example-pill--active border-accent bg-accentbg text-accent'
                : 'problem-example-pill--idle border-edge bg-panel2/60 text-ink2 hover:bg-panel2 hover:text-ink',
            )}
          >
            <span className={cn('min-w-0 truncate', nodeTextWrap)}>{i.label}</span>
            {ops > 0 && <span className="shrink-0 tabular-nums text-ink3">{ops}</span>}
            <input
              type="radio"
              name={`input-${pluginId}`}
              checked={on}
              onChange={() => onSelect(i.id)}
              className="sr-only"
              tabIndex={-1}
            />
          </button>
        );
      })}
    </div>
  );
}

function ExampleList({
  inputs,
  inputId,
  pluginId,
  inputFrameCounts,
  onSelect,
  flash,
}: {
  inputs: SampleInput[];
  inputId: string;
  pluginId: string;
  inputFrameCounts: InputFrameCounts;
  onSelect: (id: string) => void;
  flash: boolean;
}) {
  return (
    <div
      className="problem-example-list nodrag flex flex-col"
      role="radiogroup"
      aria-label="sample inputs"
    >
      {inputs.map((i, idx) => {
        const on = i.id === inputId;
        const ops = inputFrameCount(inputFrameCounts, i.id);
        return (
          <Row
            key={i.id}
            active={on}
            onClick={() => onSelect(i.id)}
            className={cn(
              nodeText.base,
              'problem-example-row',
              on ? 'ring-2 ring-accent/30' : 'text-ink2',
              on && flash && 'ring-2 ring-accent/50',
            )}
          >
            <span
              className={cn(
                'problem-example-index grid size-[17px] shrink-0 place-items-center rounded-full border text-[length:var(--fs-2xs)] font-semibold',
                on ? 'border-accent bg-accent text-white' : 'border-edge bg-panel2/60 text-ink3',
              )}
            >
              {idx + 1}
            </span>
            <span className={cn('min-w-0 flex-1', nodeTextWrap)}>{i.label}</span>
            <StepBadge count={ops} />
            <input
              type="radio"
              name={`input-${pluginId}`}
              checked={on}
              onChange={() => onSelect(i.id)}
              className="size-[calc(var(--node-icon,16px)*0.875)] shrink-0 accent-[var(--accent)]"
              tabIndex={-1}
            />
          </Row>
        );
      })}
    </div>
  );
}

/** Pick which sample input drives the visualization. */
function ExampleInputPicker() {
  const { plugin, inputId, setInputId, inputFrameCounts } = useCanvasStatic();
  const inputs = plugin.inputs;
  const active = inputs.find((i) => i.id === inputId) ?? inputs[0];
  const previewValue = active?.value;
  const hasPreview = previewValue != null && previewValue !== '';
  const description = active?.hint?.trim();
  const hasDescription = !!description;
  const flash = useFlash(inputId);
  const pickerRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback((id: string) => setInputId(id), [setInputId]);

  useEffect(() => {
    const el = pickerRef.current;
    if (!el || inputs.length <= 1) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const delta = e.key === 'ArrowLeft' ? -1 : 1;
      const next = stepExampleInput(inputs, inputId, delta);
      if (next) setInputId(next.id);
    };

    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [inputs, inputId, setInputId]);

  if (inputs.length <= 1) {
    if (!hasPreview && !hasDescription) return null;
    return (
      <>
        {hasDescription && (
          <ControlsAccordion title="Example description" defaultOpen bodyClassName="pt-1">
            <p className={cn('leading-relaxed text-ink2', nodeText.sm)}>{description}</p>
          </ControlsAccordion>
        )}
        {hasPreview && (
          <ControlsAccordion
            title="Input preview"
            defaultOpen={!hasDescription}
            {...(hasDescription ? { className: 'border-t-0' } : {})}
            bodyClassName="pt-1"
          >
            <JsonBlock value={previewValue} />
          </ControlsAccordion>
        )}
      </>
    );
  }

  const activeIdx = active ? inputs.findIndex((i) => i.id === active.id) : -1;
  const usePills = inputs.length <= 4;

  return (
    <div ref={pickerRef} tabIndex={0} className="problem-example-picker outline-none">
      <Section
        title="Examples"
        bordered={false}
        collapsible
        defaultOpen
        right={
          <span className="rounded-full border border-edge bg-panel2 px-2 py-0.5 text-[length:var(--fs-2xs)] font-semibold tabular-nums text-ink2">
            {activeIdx + 1} / {inputs.length}
          </span>
        }
      >
        {usePills ? (
          <ExamplePills
            inputs={inputs}
            inputId={inputId}
            pluginId={plugin.meta.id}
            inputFrameCounts={inputFrameCounts}
            onSelect={onSelect}
          />
        ) : (
          <ExampleList
            inputs={inputs}
            inputId={inputId}
            pluginId={plugin.meta.id}
            inputFrameCounts={inputFrameCounts}
            onSelect={onSelect}
            flash={flash}
          />
        )}
        {hasDescription && (
          <ControlsAccordion
            title="Example description"
            defaultOpen
            className="mt-1.5 border-t-0"
            bodyClassName="pt-1"
          >
            <p className={cn('leading-relaxed text-ink2', nodeText.sm)}>{description}</p>
          </ControlsAccordion>
        )}
        {hasPreview && (
          <ControlsAccordion
            title="Input preview"
            defaultOpen={!hasDescription}
            className={cn(
              'border-t-0',
              (hasDescription || usePills || inputs.length > 4) && 'mt-1.5',
            )}
            bodyClassName="pt-1"
          >
            <JsonBlock value={previewValue} />
          </ControlsAccordion>
        )}
      </Section>
    </div>
  );
}

/** Problem node: statement metadata and sample-input picker. */
export function ProblemPanelBody() {
  const { item, plugin } = useCanvasStatic();
  const { mode } = useWorkspace();
  const inVisualize = mode === 'visualize';
  const conceptCourse = isConceptCourse(item);
  const referenceCode = inVisualize && conceptCourse ? plugin.code?.text : undefined;
  const hasOverview = !!(item.difficulty || item.summary || item.tags.length > 0);
  const problemBrief = useMemo(() => briefFor(item, plugin.inputs), [item, plugin.inputs]);

  const tone = difficultyTone(item.difficulty);
  const hasProblemBrief = problemBrief.statements.length > 0 || problemBrief.cases.length > 0;
  const showHeaderDivider = hasOverview || hasProblemBrief || !inVisualize;

  return (
    <div className="problem-panel flex flex-col">
      {!inVisualize && (
        <header
          className="problem-panel-hero flex flex-col gap-1.5 rounded-xl border border-edge bg-panel2/35 px-2.5 py-2"
          style={{ borderLeftColor: item.difficulty ? TONE_BAR[tone] : 'transparent' }}
        >
          <div className="flex flex-wrap items-center gap-[var(--node-gap,6px)]">
            <h2
              className={cn(
                nodeText.title,
                nodeTextWrap,
                'min-w-0 flex-1 font-semibold leading-tight text-ink',
              )}
            >
              {item.title}
            </h2>
            {item.difficulty && <Chip tone={tone}>{item.difficulty}</Chip>}
          </div>
          {item.tags.length > 0 && (
            <div className="problem-tags flex flex-wrap gap-[var(--node-gap,6px)]">
              {item.tags.map((t) => (
                <NodeTagChip key={t} id={t} />
              ))}
            </div>
          )}
        </header>
      )}
      {inVisualize && hasOverview && (
        <ControlsAccordion title="Overview" defaultOpen={false} className="border-t-0">
          {item.difficulty && (
            <div className="mb-1">
              <Chip tone={tone}>{item.difficulty}</Chip>
            </div>
          )}
          {item.summary && (
            <p className={cn('leading-relaxed text-ink2', nodeText.sm)}>{item.summary}</p>
          )}
          {item.tags.length > 0 && (
            <div className="problem-tags mt-1.5 flex flex-wrap gap-[var(--node-gap,6px)]">
              {item.tags.map((t) => (
                <NodeTagChip key={t} id={t} />
              ))}
            </div>
          )}
        </ControlsAccordion>
      )}
      {hasProblemBrief && (
        <ControlsAccordion
          title="Problem brief"
          defaultOpen
          {...(inVisualize ? {} : { className: 'border-t-0' })}
        >
          <ProblemBriefBody statements={problemBrief.statements} cases={problemBrief.cases} />
        </ControlsAccordion>
      )}
      {referenceCode && (
        <ControlsAccordion title="Reference code" defaultOpen className="mt-1.5">
          <div className="problem-reference-code overflow-hidden rounded-lg border border-edge bg-[var(--surface-2)]">
            <HighlightedCode
              code={referenceCode}
              lang={plugin.code?.lang ?? 'go'}
              gutter
              className="ws-scroll max-h-[420px] overflow-auto p-2 font-mono"
            />
          </div>
        </ControlsAccordion>
      )}
      <div
        className={cn('problem-examples-shell', showHeaderDivider && 'border-t border-edge pt-2')}
      >
        <ExampleInputPicker />
      </div>
    </div>
  );
}
