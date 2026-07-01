/**
 * Re-exports canvas context types and providers for the shell.
 * Plugin code should import hooks from `lib/canvasContext` and `lib/canvasActions`.
 */
export {
  CanvasStaticContext,
  CanvasFrameContext,
  useCanvasStatic,
  useCanvasFrame,
  type CanvasStatic,
  type CanvasFrame,
} from '../../lib/canvasContext';

export {
  CanvasActionsContext,
  useCanvasActions,
  type CanvasActions,
} from '../../lib/canvasActions';

import { CanvasStaticContext, CanvasFrameContext } from '../../lib/canvasContext';
import { CanvasActionsContext } from '../../lib/canvasActions';

export const CanvasStaticProvider = CanvasStaticContext.Provider;
export const CanvasFrameProvider = CanvasFrameContext.Provider;
export const CanvasActionsProvider = CanvasActionsContext.Provider;
