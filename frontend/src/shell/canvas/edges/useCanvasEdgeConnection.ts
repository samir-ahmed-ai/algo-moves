import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { addEdge, reconnectEdge, type Connection, type Edge } from '@xyflow/react';
import type { PanelFlowNode } from '../nodes/PanelNode';
import { edgeConnectionLabel, styleEdges, type EdgeOpts } from '../layout/layout';

/**
 * Edge connect / reconnect / validation handlers, extracted from CanvasStage.
 * Connect wires a new removable edge; reconnect drags an endpoint (dropping in
 * empty space deletes it); isValidConnection blocks self-loops and duplicates.
 */
export function useCanvasEdgeConnection({
  nodes,
  edges,
  edgeOpts,
  setEdges,
}: {
  nodes: PanelFlowNode[];
  edges: Edge[];
  edgeOpts: EdgeOpts;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}) {
  // Connect mode: dragging from a handle wires a new (removable, styled) edge.
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      const label = edgeConnectionLabel(c, nodes);
      setEdges((eds) =>
        styleEdges(addEdge({ ...c, type: 'removable', data: { label } }, eds), edgeOpts),
      );
    },
    [setEdges, edgeOpts, nodes],
  );

  // Edge reconnection: drag an edge endpoint to a new handle (drop in empty space deletes it).
  const reconnectOk = useRef(true);
  const onReconnectStart = useCallback(() => {
    reconnectOk.current = false;
  }, []);
  const onReconnect = useCallback(
    (oldEdge: Edge, newConn: Connection) => {
      reconnectOk.current = true;
      setEdges((els) => styleEdges(reconnectEdge(oldEdge, newConn, els), edgeOpts));
    },
    [setEdges, edgeOpts],
  );
  const onReconnectEnd = useCallback(
    (_e: unknown, edge: Edge) => {
      if (!reconnectOk.current) setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      reconnectOk.current = true;
    },
    [setEdges],
  );

  const isValidConnection = useCallback(
    (c: Connection | Edge) => c.source !== c.target && !edges.some((e) => e.source === c.source && e.target === c.target),
    [edges],
  );

  return { onConnect, onReconnectStart, onReconnect, onReconnectEnd, isValidConnection };
}
