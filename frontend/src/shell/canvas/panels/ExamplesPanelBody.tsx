import { cn } from '../../../lib/cn';
import { inputFrameCount } from '../../../lib/inputFrameCounts';
import { useCanvasStatic } from '../CanvasContext';
import { Code, ControlsAccordion, nodeText, nodeTextWrap, Row } from '../nodeui';

/** Compact preview of a sample input value. */
function formatInputPreview(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    const s = JSON.stringify(value);
    return s.length > 140 ? `${s.slice(0, 137)}…` : s;
  } catch {
    return String(value);
  }
}

/** Example input node: pick which sample input drives the visualization. */
export function ExamplesPanelBody() {
  const { plugin, inputId, setInputId, inputFrameCounts } = useCanvasStatic();
  const active = plugin.inputs.find((i) => i.id === inputId) ?? plugin.inputs[0];
  const preview = active ? formatInputPreview(active.value) : '';
  const totalInputs = plugin.inputs.length;
  const activeIdx = active ? plugin.inputs.findIndex((i) => i.id === active.id) : -1;

  return (
    <div className="flex flex-col gap-[var(--node-gap,6px)]">
      {totalInputs > 1 && (
        <div className="flex items-center gap-1.5 text-[11px] text-ink3">
          <span className="inline-flex items-center rounded-full border border-edge bg-panel2 px-2 py-0.5 text-ink3">
            sample {activeIdx + 1} / {totalInputs}
          </span>
        </div>
      )}
      <div className="nodrag flex flex-col" role="radiogroup" aria-label="sample inputs">
        {plugin.inputs.map((i, idx) => {
          const on = i.id === inputId;
          const ops = inputFrameCount(inputFrameCounts, i.id);
          return (
            <Row
              key={i.id}
              active={on}
              onClick={() => setInputId(i.id)}
              className={cn(nodeText.base, on ? '' : 'text-ink2')}
            >
              <span
                className={cn(
                  'grid size-[17px] shrink-0 place-items-center rounded-full border',
                  on ? 'border-accent bg-accentbg text-accent' : 'border-edge bg-panel2/60 text-ink3',
                )}
              >
                {idx + 1}
              </span>
              <span className={cn('min-w-0 flex-1', nodeTextWrap)}>{i.label}</span>
              <span className="shrink-0 rounded-full border border-edge bg-panel2 px-2 py-0.5 text-[10px] tabular-nums text-ink3">
                {ops > 0 ? `${ops} step${ops === 1 ? '' : 's'}` : '0'}
              </span>
              <input
                type="radio"
                name={`input-${plugin.meta.id}`}
                checked={on}
                onChange={() => setInputId(i.id)}
                className="size-[calc(var(--node-icon,16px)*0.875)] shrink-0 accent-[var(--accent)]"
                tabIndex={-1}
              />
            </Row>
          );
        })}
      </div>
      {preview && (
        <ControlsAccordion title="Preview" defaultOpen={false} className="border-t-0">
          <Code text={preview} />
        </ControlsAccordion>
      )}
    </div>
  );
}
