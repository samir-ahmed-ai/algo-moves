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
} from '@/lib/canvas';

export {
  CanvasActionsContext,
  useCanvasActions,
  type CanvasActions,
} from '@/lib/canvas';

import { CanvasStaticContext, CanvasFrameContext } from '@/lib/canvas';
import { CanvasActionsContext } from '@/lib/canvas';

export const CanvasStaticProvider = CanvasStaticContext.Provider;
export const CanvasFrameProvider = CanvasFrameContext.Provider;
export const CanvasActionsProvider = CanvasActionsContext.Provider;
