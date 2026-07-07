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
  if (v == null || !Number.isFinite(v)) return 1;
  return Math.min(1, Math.max(0.2, v / 100));
}

export function panelStroke(style: PanelNodeStyle | undefined, accent: string): string {
  const stroke = style?.stroke?.trim();
  return stroke || accent;
}

export function panelFill(style?: PanelNodeStyle): string | undefined {
  const fill = style?.fill?.trim();
  return fill && fill !== 'transparent' ? fill : fill === 'transparent' ? 'transparent' : undefined;
}

export type PanelStylePatch = Partial<{
  [K in keyof PanelNodeStyle]: PanelNodeStyle[K] | undefined;
}>;

/** Merge style updates; undefined values remove keys. */
export function patchPanelStyle(
  prev: PanelNodeStyle | undefined,
  patch: PanelStylePatch | null,
): PanelNodeStyle | undefined {
  if (patch === null) return undefined;
  const next = { ...prev };
  for (const [k, v] of Object.entries(patch) as [
    keyof PanelNodeStyle,
    PanelNodeStyle[keyof PanelNodeStyle],
  ][]) {
    if (v === undefined) delete next[k];
    else if (k === 'opacity' && typeof v === 'number')
      next[k] = Math.max(20, Math.min(100, v)) as never;
    else if ((k === 'fill' || k === 'stroke') && typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) next[k] = trimmed as never;
      else delete next[k];
    } else next[k] = v as never;
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
