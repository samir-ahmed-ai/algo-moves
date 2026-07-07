import { useEffect, useMemo, useRef } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { Frame } from '../core/types';
import { generateTrace, transformFramesForGraph, type WorkflowNode } from '@/lib/canvas';
import { useReplayStoreOptional } from '@/store/replay';

const DEBOUNCE_MS = 50;

export interface WorkflowRunnerInput {
  baseFrames: Frame[];
  nodes: Node[];
  edges: Edge[];
  /** Immediate re-run (tempo / scale changes). */
  immediate?: boolean;
}

/**
 * Debounced workflow runner — re-transforms frames when graph or input changes.
 * Strudel's useWorkflowRunner analogue for Algo Moves.
 */
export function useWorkflowRunner({
  baseFrames,
  nodes,
  edges,
  immediate,
}: WorkflowRunnerInput): Frame[] {
  const replay = useReplayStoreOptional();
  const debounceRef = useRef<number | null>(null);

  const runStates = useMemo(() => {
    const map = new Map<string, 'running' | 'paused' | 'stopped'>();
    for (const n of nodes) {
      const rs = (n.data as { runState?: string })?.runState;
      if (rs === 'running' || rs === 'paused' || rs === 'stopped') map.set(n.id, rs);
    }
    return map;
  }, [nodes]);

  const chainPaused = useMemo(
    () => [...runStates.values()].some((s) => s === 'paused'),
    [runStates],
  );

  const workflowNodes = nodes as WorkflowNode[];

  const transformed = useMemo(
    () => transformFramesForGraph(baseFrames, workflowNodes, edges, runStates),
    [baseFrames, workflowNodes, edges, runStates],
  );

  const trace = useMemo(
    () => generateTrace(transformed, workflowNodes, edges, { chainPaused }),
    [transformed, workflowNodes, edges, chainPaused],
  );

  useEffect(() => {
    const apply = () => {
      replay?.setTransformedFrames(transformed);
      replay?.setTrace(trace);
      replay?.setChainPaused(chainPaused);
    };

    if (immediate) {
      apply();
      return;
    }

    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(apply, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, [transformed, trace, chainPaused, immediate, replay]);

  return transformed;
}
