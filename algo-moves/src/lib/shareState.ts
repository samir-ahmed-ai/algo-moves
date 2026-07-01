/**
 * Shareable URL state (#86/#92). The current workspace selection is encoded into
 * the URL hash (base64 JSON — no dependency) so a canvas state is just a link;
 * opening that link rehydrates the same problem/mode/theme. "Remix" is simply
 * opening someone's link and then editing.
 */
export interface ShareState {
  item?: string;
  /** Selected sample input id for the active problem. */
  input?: string;
  mode?: string;
  theme?: string;
  palette?: string;
  themePreset?: string;
  dir?: string;
}

/** Legacy catalog item ids → current item ids after imported-canonical migration. */
export const LEGACY_ITEM_REDIRECTS: Record<string, string> = {
  'is-bipartite': 'is-bipartite',
  'number-of-islands': 'number-of-islands',
  'course-schedule': 'course-schedule',
  'topological-sort': 'topological-sort',
  'dijkstra': 'dijkstra',
  'climbing-stairs': 'climbing-stairs',
  'edit-distance': 'edit-distance',
  'subsets': 'subsets',
};

/** Resolve share state item id through legacy redirects (item ids unchanged; pluginIds migrated). */
export function normalizeShareState(s: ShareState): ShareState {
  if (!s.item) return s;
  const next = LEGACY_ITEM_REDIRECTS[s.item] ?? s.item;
  return next === s.item ? s : { ...s, item: next };
}

export function encodeShare(s: ShareState): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(s)));
  } catch {
    return '';
  }
}

export function decodeShare(raw: string): ShareState | null {
  try {
    return JSON.parse(decodeURIComponent(atob(raw))) as ShareState;
  } catch {
    return null;
  }
}

export function readShareFromUrl(): ShareState | null {
  if (typeof location === 'undefined') return null;
  const m = location.hash.match(/[#&]s=([^&]+)/);
  return m ? decodeShare(m[1]) : null;
}

export function buildShareUrl(s: ShareState): string {
  return `${location.origin}${location.pathname}#s=${encodeShare(s)}`;
}

/** Keep the URL hash in sync with workspace state (refresh restores the same view). */
export function writeShareToUrl(s: ShareState) {
  if (typeof location === 'undefined') return;
  const hash = `#s=${encodeShare(s)}`;
  const next = `${location.pathname}${location.search}${hash}`;
  const cur = `${location.pathname}${location.search}${location.hash}`;
  if (cur !== next) history.replaceState(null, '', next);
}
