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
  /** `canvas` = standalone freeform canvas; `problem` (or omitted) = problem-focused workspace. */
  focus?: 'problem' | 'canvas';
  theme?: string;
  palette?: string;
  themePreset?: string;
  dir?: string;
  /** Realtime room code — auto-join on load when present. */
  room?: string;
  /** Hint for session kind when joining via invite link. */
  sessionKind?: 'interview' | 'collab';
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

function getHashParam(hash: string, key: string): string | null {
  if (!hash) return null;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const prefix = `${key}=`;
  for (const part of raw.split('&')) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

export function encodeShare(s: ShareState): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeShare(raw: string): ShareState | null {
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return JSON.parse(decodeURIComponent(atob(b64 + pad))) as ShareState;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(atob(raw))) as ShareState;
    } catch {
      return null;
    }
  }
}

export function readShareFromUrl(): ShareState | null {
  if (typeof location === 'undefined') return null;
  const raw = getHashParam(location.hash, 's');
  if (!raw) return null;
  const decoded = decodeShare(raw);
  return decoded ? normalizeShareState(decoded) : null;
}

export function buildShareUrl(s: ShareState): string {
  return `${location.origin}${location.pathname}#s=${encodeShare(s)}`;
}

/** Invite link for a live collab/interview room (includes workspace context + room code). */
export function buildInviteUrl(s: ShareState, room: string): string {
  const base = buildShareUrl({ ...s, room, focus: s.focus ?? 'canvas', mode: s.mode ?? 'visualize' });
  return base;
}

export function readRoomFromUrl(): string | null {
  if (typeof location === 'undefined') return null;
  const fromHash = getHashParam(location.hash, 'room');
  if (fromHash) return fromHash.trim().toUpperCase();
  const share = readShareFromUrl();
  return share?.room?.trim().toUpperCase() ?? null;
}

/** Merge workspace share state into the current hash, preserving route segments like #mobile. */
function mergeShareHash(currentHash: string, encoded: string): string {
  const sharePart = `s=${encoded}`;
  if (!currentHash || currentHash === '#') return `#${sharePart}`;
  const raw = currentHash.startsWith('#') ? currentHash.slice(1) : currentHash;
  const parts = raw.split('&').filter((p) => !p.startsWith('s='));
  if (parts.length === 0 || (parts.length === 1 && parts[0].startsWith('s='))) return `#${sharePart}`;
  return `#${parts.join('&')}&${sharePart}`;
}

/** Keep the URL hash in sync with workspace state (refresh restores the same view). */
export function writeShareToUrl(s: ShareState) {
  if (typeof location === 'undefined') return;
  const hash = mergeShareHash(location.hash, encodeShare(s));
  const next = `${location.pathname}${location.search}${hash}`;
  const cur = `${location.pathname}${location.search}${location.hash}`;
  if (cur !== next) history.replaceState(null, '', next);
}
