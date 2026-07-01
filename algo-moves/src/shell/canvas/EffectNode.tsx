import { useCallback } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { getEffect, type EffectDataMap } from '../../effects/registry';
import { effectTraceSnippet } from '../../effects/registry';
import type { PanelRunState } from '../../core/panelRegistry';
import { Btn, nodeIconGlyph, nodeText } from './nodeui';
import { NodeHeader, NodeHeaderAction, NodeHeaderActions, NodeHeaderTitle } from './panels/NodeHeader';
import { handleDotClass, portHandleStyle } from './canvasHandles';
import { useConnectedComponentsOptional } from '../../lib/ConnectedComponentsContext';
import { FastEffectControls } from '../../effects/components/FastEffectControls';

const CHAIN_TINTS = [
  'ring-accent/30',
  'ring-good/30',
  'ring-[color-mix(in_srgb,var(--team1-stroke)_40%,transparent)]',
  'ring-[color-mix(in_srgb,var(--team2-stroke)_40%,transparent)]',
] as const;
import { SlowEffectControls } from '../../effects/components/SlowEffectControls';
import { MaskEffectControls } from '../../effects/components/MaskEffectControls';
import { GenericEffectControls } from '../../effects/components/GenericEffectControls';

export interface EffectNodeData extends Record<string, unknown> {
  effectId: keyof EffectDataMap | string;
  effectData?: Record<string, unknown>;
  runState?: PanelRunState;
  title?: string;
  locked?: boolean;
}

export type EffectFlowNode = {
  id: string;
  type: 'effect';
  position: { x: number; y: number };
  data: EffectNodeData;
};

let effectCounter = 0;

export function createEffectByType(
  effectId: string,
  position: { x: number; y: number },
): EffectFlowNode {
  const effect = getEffect(effectId);
  effectCounter += 1;
  return {
    id: `effect-${effectId}-${effectCounter}-${Date.now().toString(36)}`,
    type: 'effect',
    position,
    data: {
      effectId,
      effectData: effect ? { ...(effect.defaultData as object) } : {},
      title: effect?.meta.title ?? effectId,
      runState: 'paused',
    },
  };
}

function EffectControls({
  effectId,
  data,
  onChange,
}: {
  effectId: string;
  data: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  switch (effectId) {
    case 'fast':
      return <FastEffectControls data={data as unknown as EffectDataMap['fast']} onChange={onChange} />;
    case 'slow':
      return <SlowEffectControls data={data as unknown as EffectDataMap['slow']} onChange={onChange} />;
    case 'mask':
      return <MaskEffectControls data={data as unknown as EffectDataMap['mask']} onChange={onChange} />;
    default:
      return <GenericEffectControls effectId={effectId} data={data} onChange={onChange} />;
  }
}

export function EffectNode({ id, data, selected }: NodeProps<EffectFlowNode>) {
  const { setNodes, deleteElements } = useReactFlow();
  const cc = useConnectedComponentsOptional();
  const chainIdx = cc?.indexOf(id) ?? -1;
  const chainTint = chainIdx >= 0 ? CHAIN_TINTS[chainIdx % CHAIN_TINTS.length] : undefined;
  const effectId = data.effectId;
  const effect = getEffect(effectId);
  const runState = data.runState ?? 'paused';
  const snippet = effectTraceSnippet(effectId, data.effectData ?? {});

  const updateData = useCallback(
    (patch: Partial<EffectNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [id, setNodes],
  );

  const toggleRun = () => {
    updateData({ runState: runState === 'running' ? 'paused' : 'running' });
  };

  const onEffectDataChange = (patch: Record<string, unknown>) => {
    updateData({ effectData: { ...(data.effectData ?? {}), ...patch } });
  };

  return (
    <div
      className={cn(
        'panel-node relative flex w-[280px] flex-col rounded-[var(--radius)] bg-panel text-ink transition-[box-shadow,ring-color]',
        Boolean(selected) && 'selected',
        chainTint && `ring-1 ${chainTint}`,
        'hover:ring-1 hover:ring-[color-mix(in_srgb,var(--ring)_25%,transparent)]',
      )}
    >
      <Handle type="target" position={Position.Left} className={handleDotClass} style={portHandleStyle(Position.Left)} />
      <NodeHeader>
        <NodeHeaderTitle>{data.title ?? effect?.meta.title ?? effectId}</NodeHeaderTitle>
        <NodeHeaderActions>
          <NodeHeaderAction onClick={toggleRun} title={runState === 'running' ? 'Pause chain' : 'Run chain'}>
            {runState === 'running' ? <Pause className={nodeIconGlyph} /> : <Play className={nodeIconGlyph} />}
          </NodeHeaderAction>
          <NodeHeaderAction onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete">
            <Trash2 className={nodeIconGlyph} />
          </NodeHeaderAction>
        </NodeHeaderActions>
      </NodeHeader>
      <div className="nodrag flex flex-col gap-[var(--node-gap,0.5rem)] p-[var(--node-px,0.75rem)]">
        <span className={cn('font-mono text-ink3', nodeText.xs)}>{snippet}</span>
        <EffectControls effectId={effectId} data={data.effectData ?? {}} onChange={onEffectDataChange} />
        <Btn variant="quiet" size="sm" onClick={() => updateData({ runState: 'stopped' })}>
          Stop chain
        </Btn>
      </div>
      <Handle type="source" position={Position.Right} className={handleDotClass} style={portHandleStyle(Position.Right)} />
    </div>
  );
}
