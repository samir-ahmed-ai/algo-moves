/** Dev-only react-flow error filter for Vim Dojo canvas. */
export function onVimFlowError(code: string, msg: string): void {
  if (code === '002' || code === '008') return;
  if (import.meta.env.DEV) console.warn(`[vim-flow] ${msg}`);
}
