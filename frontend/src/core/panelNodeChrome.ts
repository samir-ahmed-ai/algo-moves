export type PanelNodeChrome = {
  hideTargetHandle?: boolean;
  hideSourceHandle?: boolean;
  /** Tailwind classes applied to the panel root when expanded */
  panelMinClass?: string;
  /** Tailwind classes applied to the body wrapper when expanded */
  bodyMinClass?: string;
  /** Treat as code-studio-like for flex/min-h-0 body layout on the panel root */
  codeLike?: boolean;
  /** Expanded body uses min-h-0 flex-1 overflow-hidden (workbench, code panels) */
  bodyFlex?: boolean;
};

export const PANEL_NODE_CHROME: Partial<Record<string, PanelNodeChrome>> = {
  problem: { hideTargetHandle: true },
  workbench: {
    hideTargetHandle: true,
    hideSourceHandle: true,
    panelMinClass: 'min-h-[480px]',
    bodyFlex: true,
  },
  'collab-code': { panelMinClass: 'min-h-[360px]', bodyMinClass: 'min-h-[320px]' },
  whiteboard: { panelMinClass: 'min-h-[360px]', bodyMinClass: 'min-h-[320px]' },
  code: { codeLike: true },
  scratch: { codeLike: true },
  reassemble: { codeLike: true },
  recall: { codeLike: true },
};

const EMPTY: PanelNodeChrome = {};

export function panelNodeChrome(kind: string): PanelNodeChrome {
  return PANEL_NODE_CHROME[kind] ?? EMPTY;
}
