import { Position } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { HANDLE_DOT_CLASS } from '../ui/canvasTokens';

const OFFSET = 'var(--node-handle-offset, 10px)';

/** Symmetric port placement — dots sit just outside the node edge on any side. */
export function portHandleStyle(position: Position): CSSProperties {
  switch (position) {
    case Position.Left:
      return { top: '50%', left: 0, transform: `translate(calc(-100% - ${OFFSET}), -50%)` };
    case Position.Right:
      return { top: '50%', right: 0, transform: `translate(calc(100% + ${OFFSET}), -50%)` };
    case Position.Top:
      return { top: 0, left: '50%', transform: `translate(-50%, calc(-100% - ${OFFSET}))` };
    case Position.Bottom:
      return { bottom: 0, left: '50%', transform: `translate(-50%, calc(100% + ${OFFSET}))` };
    default:
      return {};
  }
}

export { HANDLE_DOT_CLASS as handleDotClass };
