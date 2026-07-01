import { defaultEdgeOpts, type BgVariant, type EdgeOpts } from '../shell/canvas/layout';

export interface CanvasPrefs {
  edgeOpts: EdgeOpts;
  bg: BgVariant;
}

const KEY = 'algo-moves:canvas-prefs';

const DEFAULTS: CanvasPrefs = {
  edgeOpts: defaultEdgeOpts,
  bg: 'dots',
};

export function loadCanvasPrefs(): CanvasPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<CanvasPrefs>;
    return {
      edgeOpts: { ...DEFAULTS.edgeOpts, ...parsed.edgeOpts },
      bg: parsed.bg ?? DEFAULTS.bg,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveCanvasPrefs(p: CanvasPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
