import { useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatJsonDisplay } from '@/lib/utils/formatJsonDisplay';
import type { InputBuilderKind } from '../../../core/effectTypes';
import { CategorySelectItems } from '../../../components/shared/CategorySelectItems';
import { INPUT_BUILDERS } from '../../../effects/inputBuilders';

import {
  useCanvasFrame,
  useCanvasStatic,
  Btn,
  Chip,
  Field,
  Hint,
  nodeIconGlyph,
  Section,
  TextArea,
  TextInput,
  nodeText,
} from '@/shell/canvas';
/** Input editor with optional visual builders (pad, beat, arpeggiator, etc.). */
export function EditorPanelBody() {
  const { plugin, inputId, setInputId, customInput, setCustomInput } = useCanvasStatic();
  const { player } = useCanvasFrame();
  const fields = plugin.editable;
  const builders = plugin.inputBuilders ?? (['custom'] as InputBuilderKind[]);
  const [builderKind, setBuilderKind] = useState<InputBuilderKind>(builders[0] ?? 'custom');

  const sampleCategories = useMemo(
    () => [
      {
        label: 'Samples',
        items: plugin.inputs.map((i) => ({ id: i.id, label: i.label })),
      },
    ],
    [plugin.inputs],
  );

  const sample = plugin.inputs.find((i) => i.id === inputId)?.value ?? plugin.inputs[0]?.value;
  const value = (customInput ?? sample) as Record<string, unknown>;
  const seed = useMemo(() => {
    const d: Record<string, string> = {};
    for (const f of fields ?? []) {
      const v = value?.[f.key];
      d[f.key] =
        f.type === 'numberArray' ? (Array.isArray(v) ? v.join(', ') : '') : String(v ?? '');
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputId, customInput, plugin]);
  const [draft, setDraft] = useState(seed);
  useEffect(() => setDraft(seed), [seed]);
  const [json, setJson] = useState('');
  const [jsonErr, setJsonErr] = useState('');
  const hasFields = !!fields?.length;

  const importJson = () => {
    try {
      setCustomInput(JSON.parse(json));
      setJsonErr('');
    } catch {
      setJsonErr('Invalid JSON');
    }
  };

  const parse = (f: NonNullable<typeof fields>[number], raw: string): unknown => {
    if (f.type === 'numberArray') {
      let arr = raw
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
      if (f.min != null) arr = arr.map((n) => Math.max(f.min!, n));
      if (f.max != null) arr = arr.map((n) => Math.min(f.max!, n));
      return arr;
    }
    if (f.type === 'number') {
      let n = Number(raw);
      if (Number.isNaN(n)) n = 0;
      if (f.min != null) n = Math.max(f.min, n);
      if (f.max != null) n = Math.min(f.max, n);
      return n;
    }
    return raw;
  };

  const run = () => {
    const next: Record<string, unknown> = { ...value };
    for (const f of fields ?? []) next[f.key] = parse(f, draft[f.key] ?? '');
    setCustomInput(next);
  };

  const Builder = INPUT_BUILDERS[builderKind];
  const playheadCol = player.index % 8;

  const applyBuilder = (v: unknown) => {
    if (Array.isArray(v) && fields?.some((f) => f.type === 'numberArray')) {
      const key = fields.find((f) => f.type === 'numberArray')!.key;
      setCustomInput({ ...value, [key]: v });
    } else {
      setCustomInput(v);
    }
  };

  return (
    <div className="nodrag flex flex-col gap-2.5">
      {builders.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {builders.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBuilderKind(b)}
              className={cn(
                'rounded border px-1.5 py-0.5 capitalize',
                builderKind === b
                  ? 'border-accent bg-accentbg text-accent'
                  : 'border-edge text-ink2',
                nodeText.xs,
              )}
            >
              {b}
            </button>
          ))}
        </div>
      )}
      {builderKind !== 'custom' && Builder && (
        <Section title="Visual builder" collapsible defaultOpen>
          <Builder onApply={applyBuilder} playheadCol={playheadCol} />
        </Section>
      )}
      <Field label="Sample input">
        <CategorySelectItems
          categories={sampleCategories}
          value={inputId}
          onChange={(id) => {
            setInputId(id);
            setCustomInput(null);
          }}
        />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <Hint>
          {hasFields
            ? 'Edit the input, then Run to replay your own case.'
            : 'Paste a full input as JSON to run a custom dataset.'}
        </Hint>
        <Chip tone={customInput != null ? 'accent' : 'muted'} mono>
          {customInput != null ? 'custom' : 'sample'}
        </Chip>
      </div>
      {hasFields &&
        fields!.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            hint={f.type === 'numberArray' ? 'comma / space separated' : undefined}
          >
            <TextInput
              value={draft[f.key] ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') run();
              }}
              className="font-mono"
            />
          </Field>
        ))}
      {hasFields && (
        <div className="flex items-center gap-2">
          <Btn variant="good" size="sm" onClick={run} icon={<Play className={nodeIconGlyph} />}>
            Run
          </Btn>
          {customInput != null && (
            <Btn variant="quiet" size="sm" onClick={() => setCustomInput(null)}>
              Reset to sample
            </Btn>
          )}
        </div>
      )}

      <Section title="Import dataset (JSON)" collapsible defaultOpen={!hasFields}>
        <div className="flex flex-col gap-1.5">
          <TextArea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={'{ "values": [3,1,2] }'}
            rows={8}
            className={cn('ws-scroll max-h-[320px] overflow-auto font-mono', nodeText.base)}
          />
          {jsonErr && (
            <Hint>
              <span className="text-bad">{jsonErr}</span>
            </Hint>
          )}
          <div className="flex gap-2">
            <Btn variant="primary" size="xs" onClick={importJson} disabled={!json.trim()}>
              Load JSON
            </Btn>
            <Btn variant="quiet" size="xs" onClick={() => setJson(formatJsonDisplay(value))}>
              Fill current
            </Btn>
          </div>
        </div>
      </Section>
    </div>
  );
}
