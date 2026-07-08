import { useEffect, type ComponentType } from 'react';
import { cn } from '@/lib/utils/cn';
import { vizText } from '@/plugins/_shared/vizKit';
import type { Frame, PluginViewProps } from '@/core/types';
import { DesignFlow } from './DesignFlow';
import { designHybridState } from './designHybridState';
import type { DesignDiagramSpec } from './types';

const TABS = [
  { id: 'architecture' as const, label: 'Architecture' },
  { id: 'walkthrough' as const, label: 'Walkthrough' },
];

export function DesignHybridView<S>({
  spec,
  SimView,
  frame,
  onSelectNode,
  selectedNode,
}: {
  spec: DesignDiagramSpec;
  SimView: ComponentType<PluginViewProps<S>>;
  frame: Frame<S>;
  onSelectNode?: (node: number) => void;
  selectedNode?: number | null;
}) {
  const mode = designHybridState.use();

  useEffect(() => {
    designHybridState.reset();
    return () => designHybridState.reset();
  }, [spec.title]);

  return (
    <div
      className="board-area design-hybrid flex min-h-0 flex-1 flex-col overflow-hidden"
      data-design-mode={mode}
    >
      <div
        role="tablist"
        aria-label="Design view"
        className="design-hybrid-tabs flex shrink-0 gap-1 border-b border-edge/60 pb-1.5"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => designHybridState.set(tab.id)}
            className={cn(
              'design-hybrid-tab px-3 py-1 text-[length:var(--fs-tight)] font-medium transition-colors',
              mode === tab.id
                ? 'border border-accent/30 bg-accent/10 text-accent'
                : 'border border-transparent text-ink3 hover:border-edge hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="design-hybrid-body mt-1.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {mode === 'architecture' ? (
          <DesignFlow spec={spec} />
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <SimView
              frame={frame}
              {...(onSelectNode !== undefined ? { onSelectNode } : {})}
              {...(selectedNode !== undefined ? { selectedNode } : {})}
            />
          </div>
        )}
      </div>

      {mode === 'walkthrough' && (
        <p className={cn('mt-1 shrink-0 text-ink3', vizText.sm)}>
          Scrub steps to watch each operation on the data structure.
        </p>
      )}
    </div>
  );
}
