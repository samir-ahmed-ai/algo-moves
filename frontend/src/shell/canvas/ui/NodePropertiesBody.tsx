import { Circle } from 'lucide-react';
import { useStore, useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import { useWorkspace } from '@/store/workspace';
import { ACCENTS } from '../layout/layout';
import type { PanelFlowNode, PanelNodeData } from '../nodes/PanelNode';
import {
  patchPanelStyle,
  type PanelCornerStyle,
  type PanelNodeStyle,
} from '../nodes/panelStyle';
import { Btn, RADIUS_CTRL } from './nodeui';
import { chromeText } from '../../chromeUi';
import { InsField, InsGrid, InsSection, InsSelect } from './inspectorUi';

export { useHasSelectedPanel } from '../nodes/useHasSelectedPanel';

const FILL_SWATCHES: { v: string | undefined; label: string }[] = [
  { v: undefined, label: 'Default' },
  { v: 'var(--surface-2)', label: 'Alt' },
  { v: 'var(--accent-bg)', label: 'Tint' },
  { v: 'transparent', label: 'Clear' },
];

const CORNER_OPTIONS: { v: PanelCornerStyle; label: string }[] = [
  { v: 'theme', label: 'Theme' },
  { v: 'sharp', label: 'Sharp' },
  { v: 'soft', label: 'Soft' },
  { v: 'round', label: 'Round' },
];

function useSelectedPanel(): PanelFlowNode | null {
  return useStore((s) => {
    const panels = s.nodes.filter((n) => n.selected && n.type === 'panel');
    return panels.length === 1 ? (panels[0] as PanelFlowNode) : null;
  });
}

export function NodePropertiesBody() {
  const node = useSelectedPanel();
  const { setNodes } = useReactFlow();
  const { mode } = useWorkspace();

  if (!node) {
    return (
      <p className={cn('px-[var(--hpad)] leading-snug text-ink3', chromeText.sm)}>
        Select a panel on the canvas to edit its size, opacity, corners, and colours.
      </p>
    );
  }

  const data = node.data as PanelNodeData;
  const style = data.style ?? {};
  const readOnly = !!data.locked;
  const kind = data.kind ?? '';
  // The fit-to-content observer overrides width/height on auto-sized nodes, so
  // numeric editing only sticks where that observer is off (resizable nodes).
  const resizable =
    !readOnly &&
    ((kind === 'workbench' && mode === 'visualize') ||
      (kind === 'viz' && mode === 'visualize') ||
      kind === 'code' ||
      kind === 'scratch' ||
      kind === 'reassemble' ||
      kind === 'recall');
  const w = Math.round(node.measured?.width ?? node.width ?? 0);
  const h = Math.round(node.measured?.height ?? node.height ?? 0);
  const opacity = style.opacity ?? 100;

  const patch = (p: Partial<PanelNodeStyle>) => {
    if (readOnly) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== node.id) return n;
        const d = n.data as PanelNodeData;
        return { ...n, data: { ...d, style: patchPanelStyle(d.style, p) } };
      }),
    );
  };

  const setSize = (key: 'width' | 'height', raw: string) => {
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, [key]: Math.max(120, v) } : n)));
  };

  const reset = () => {
    if (readOnly) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== node.id) return n;
        const d = n.data as PanelNodeData;
        const { style: _removed, ...rest } = d;
        return { ...n, data: rest };
      }),
    );
  };

  return (
    <div className="flex flex-col gap-3 px-[var(--hpad)] pb-1">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: style.stroke ?? data.accent ?? 'var(--accent)' }} />
        <span className={cn('min-w-0 flex-1 truncate font-medium text-ink', chromeText.sm)}>{data.title || kind}</span>
        {data.locked && <span className={cn('shrink-0 text-ink3', chromeText.xs)}>locked</span>}
      </div>

      <InsSection title="Dimensions">
        <InsGrid>
          <InsField
            icon="W"
            type="number"
            value={w || ''}
            unit="px"
            readOnly={!resizable}
            title={resizable ? 'Width' : 'Auto-sized to content'}
            onChange={resizable ? (v) => setSize('width', v) : undefined}
          />
          <InsField
            icon="H"
            type="number"
            value={h || ''}
            unit="px"
            readOnly={!resizable}
            title={resizable ? 'Height' : 'Auto-sized to content'}
            onChange={resizable ? (v) => setSize('height', v) : undefined}
          />
        </InsGrid>
      </InsSection>

      <InsSection title="Appearance">
        <InsGrid>
          <InsField
            icon={<Circle />}
            type="number"
            min={20}
            max={100}
            step={5}
            value={opacity}
            unit="%"
            readOnly={readOnly}
            title="Opacity"
            onChange={(v) => patch({ opacity: Math.min(100, Math.max(20, Number(v) || 100)) })}
          />
          <InsSelect<PanelCornerStyle>
            value={(style.corners ?? 'theme') as PanelCornerStyle}
            options={CORNER_OPTIONS}
            disabled={readOnly}
            onChange={(c) => patch({ corners: c === 'theme' ? undefined : c })}
          />
        </InsGrid>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={opacity}
          disabled={readOnly}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
          className="nodrag mt-0.5 w-full accent-[var(--accent)]"
          aria-label="Opacity"
        />
      </InsSection>

      <InsSection title="Stroke">
        <div className="flex flex-wrap gap-1">
          {ACCENTS.map((c) => {
            const active = style.stroke === c;
            return (
              <button
                key={c}
                type="button"
                disabled={readOnly}
                title="Stroke colour"
                aria-label="stroke colour"
                onClick={() => patch({ stroke: active ? undefined : c })}
                className={cn(
                  'nodrag h-4 w-4 rounded-full ring-1 transition-transform hover:scale-110 disabled:opacity-40',
                  active ? 'ring-2 ring-accent' : 'ring-edge',
                )}
                style={{ background: c }}
              />
            );
          })}
        </div>
      </InsSection>

      <InsSection title="Fill">
        <div className="flex flex-wrap gap-1">
          {FILL_SWATCHES.map((f) => {
            const active = (style.fill ?? undefined) === f.v;
            return (
              <button
                key={f.label}
                type="button"
                disabled={readOnly}
                onClick={() => patch({ fill: f.v })}
                className={cn(
                  `border px-1.5 py-0.5 font-medium transition-colors ${RADIUS_CTRL}`,
                  chromeText.xs,
                  active ? 'border-accent bg-accentbg text-accent' : 'border-edge text-ink2 hover:text-ink',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </InsSection>

      <Btn variant="ghost" size="sm" disabled={readOnly || !data.style} onClick={reset}>
        Reset appearance
      </Btn>
    </div>
  );
}
