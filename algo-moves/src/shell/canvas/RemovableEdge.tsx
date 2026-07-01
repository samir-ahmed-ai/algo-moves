import { useState, type MouseEvent } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Edge that honors a user-selected path type (data.pathType) and exposes a delete
 * button at its midpoint on hover/select.
 */
export function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  const pathType = (data?.pathType as string) ?? 'bezier';
  const edgeLabel = (data?.label as string) ?? '';
  const base = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [edgePath, labelX, labelY] =
    pathType === 'straight'
      ? getStraightPath({ sourceX, sourceY, targetX, targetY })
      : pathType === 'bezier'
        ? getBezierPath(base)
        : pathType === 'step'
          ? getSmoothStepPath({ ...base, borderRadius: 0 })
          : getSmoothStepPath(base);

  const remove = (e: MouseEvent) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((ed) => ed.id !== id));
  };

  const showDelete = hovered || selected;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} interactionWidth={0} />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="react-flow__edge-interaction"
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute flex items-center gap-1"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            type="button"
            className={cn('edge-delete', showDelete && 'edge-delete--on')}
            onClick={remove}
            title="remove connection"
            aria-label="remove connection"
          >
            <X size={12} />
          </button>
          {edgeLabel && (
            <span className="rounded border border-edge bg-panel/90 px-1 py-px text-[10px] text-ink3 shadow-sm">
              {edgeLabel}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
