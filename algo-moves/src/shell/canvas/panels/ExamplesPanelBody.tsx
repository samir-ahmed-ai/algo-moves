import { cn } from '../../../lib/cn';
import { useCanvasStatic } from '../CanvasContext';
import { Code, ControlsAccordion, nodeText, Row } from '../nodeui';

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
  const { plugin, inputId, setInputId } = useCanvasStatic();
  const active = plugin.inputs.find((i) => i.id === inputId) ?? plugin.inputs[0];
  const preview = active ? formatInputPreview(active.value) : '';

  return (
    <div className="flex flex-col gap-[var(--node-gap,6px)]">
      <div className="nodrag flex flex-col">
        {plugin.inputs.map((i) => {
          const on = i.id === inputId;
          let ops: number | null = null;
          try {
            ops = plugin.record(i.value).length;
          } catch {
            ops = null;
          }
          return (
            <Row key={i.id} active={on} onClick={() => setInputId(i.id)} className={nodeText.base}>
              <input
                type="radio"
                name={`input-${plugin.meta.id}`}
                checked={on}
                onChange={() => setInputId(i.id)}
                className="size-[calc(var(--node-icon,16px)*0.875)] shrink-0 accent-[var(--accent)]"
                tabIndex={-1}
              />
              <span className="min-w-0 flex-1 leading-snug">{i.label}</span>
              {ops != null && (
                <span className={cn('shrink-0 font-mono tabular-nums text-ink3', nodeText.xs)}>{ops}</span>
              )}
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
