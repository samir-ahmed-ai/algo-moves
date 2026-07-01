/** Dev-only react-flow error filter used by CanvasStage. */
export function onReactFlowError(code: string, msg: string): void {
  // Swallow benign measurement/parent warnings that fire mid-fit/relayout.
  if (code === '002' || code === '008') return;
  if (import.meta.env.DEV) console.warn(`[react-flow] ${msg}`);
}
