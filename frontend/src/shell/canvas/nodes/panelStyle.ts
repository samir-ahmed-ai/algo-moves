import type { PanelCornerStyle, PanelNodeStyle } from '@/core/panelFlowTypes';

export type { PanelCornerStyle, PanelNodeStyle } from '@/core/panelFlowTypes';

const CORNER_RADIUS: Record<PanelCornerStyle, string> = {
  theme: 'var(--radius)',
  sharp: '0',
  soft: 'calc(var(--radius) * 0.5)',
  round: 'calc(var(--radius) * 1.5)',
};

export function panelBorderRadius(corners?: PanelCornerStyle): string {
  return CORNER_RADIUS[corners ?? 'theme'];
}

export function panelOpacity(style?: PanelNodeStyle): number {
  const v = style?.opacity;
  if (v == null) return 1;
  return Math.min(1, Math.max(0.2, v / 100));
}

export function panelStroke(style: PanelNodeStyle | undefined, accent: string): string {
  return style?.stroke ?? accent;
}

export function panelFill(style?: PanelNodeStyle): string | undefined {
  const fill = style?.fill;
  return fill && fill !== 'transparent' ? fill : fill === 'transparent' ? 'transparent' : undefined;
}

/** Merge style updates; undefined values remove keys. */
export function patchPanelStyle(
  prev: PanelNodeStyle | undefined,
  patch: Partial<PanelNodeStyle> | null,
): PanelNodeStyle | undefined {
  if (patch === null) return undefined;
  const next = { ...prev };
  for (const [k, v] of Object.entries(patch) as [
    keyof PanelNodeStyle,
    PanelNodeStyle[keyof PanelNodeStyle],
  ][]) {
    if (v === undefined) delete next[k];
    else next[k] = v as never;
  }
  return Object.keys(next).length ? next : undefined;
}

export function styleSig(style?: PanelNodeStyle): string {
  if (!style) return '';
  return JSON.stringify({
    o: style.opacity ?? '',
    f: style.fill ?? '',
    s: style.stroke ?? '',
    c: style.corners ?? '',
  });
}
