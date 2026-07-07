/**
 * Shareable URL state (#86/#92). The current workspace selection is encoded into
 * the URL hash (base64 JSON — no dependency) on `/workspace#s=...` so a canvas
 * state is just a link; opening that link rehydrates the same problem/mode/theme.
 */
import { buildAppUrl, getHashBody } from '@/lib/navigation/appRoute';
import { catalog } from '@/content';
import { getPluginMeta, listPluginMeta } from '@/core';
export interface ShareState {
  item?: string;
  /** Problem number from the manifest, e.g. "1.6". */
  id?: string;
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
  /** Standalone canvas layout variant — `interview` restores the interview board on load. */
  variant?: 'interview';
  /** Public interview guest-invite token — resolves the room without a code. */
  guestToken?: string;
  /** Track id — restores the track-browse board when opening workspace from the landing page. */
  trackId?: string;
}

/** Legacy catalog item ids → current item ids after imported-canonical migration. */
export const LEGACY_ITEM_REDIRECTS: Readonly<Record<string, string>> = {
  'is-bipartite': 'is-bipartite',
  'number-of-islands': 'number-of-islands',
  'course-schedule': 'course-schedule',
  'topological-sort': 'topological-sort',
  dijkstra: 'dijkstra',
  'climbing-stairs': 'climbing-stairs',
  'edit-distance': 'edit-distance',
  subsets: 'subsets',
};

function cleanText(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text || undefined;
}

function cleanUpper(value: string | undefined): string | undefined {
  return cleanText(value)?.toUpperCase();
}

function isShareObject(value: unknown): value is ShareState {
  return value !== null && typeof value === 'object';
}

/** Resolve share state item id through legacy redirects (item ids unchanged; pluginIds migrated). */
export function normalizeShareState(s: ShareState): ShareState {
  const item = cleanText(s.item);
  const id = cleanText(s.id);
  const input = cleanText(s.input);
  const mode = cleanText(s.mode);
  const theme = cleanText(s.theme);
  const palette = cleanText(s.palette);
  const themePreset = cleanText(s.themePreset);
  const dir = cleanText(s.dir);
  const room = cleanUpper(s.room);
  const guestToken = cleanText(s.guestToken);
  const trackId = cleanText(s.trackId);
  let out: ShareState = {
    ...(item ? { item } : {}),
    ...(id ? { id } : {}),
    ...(input ? { input } : {}),
    ...(mode ? { mode } : {}),
    ...(s.focus === 'problem' || s.focus === 'canvas' ? { focus: s.focus } : {}),
    ...(theme ? { theme } : {}),
    ...(palette ? { palette } : {}),
    ...(themePreset ? { themePreset } : {}),
    ...(dir ? { dir } : {}),
    ...(room ? { room } : {}),
    ...(s.sessionKind === 'interview' || s.sessionKind === 'collab'
      ? { sessionKind: s.sessionKind }
      : {}),
    ...(s.variant === 'interview' ? { variant: s.variant } : {}),
    ...(guestToken ? { guestToken } : {}),
    ...(trackId ? { trackId } : {}),
  };
  if (!out.item) return out;
  const next = LEGACY_ITEM_REDIRECTS[out.item] ?? out.item;
  return next === out.item ? out : { ...out, item: next };
}

const itemIdByNumber = new Map<string, string>(
  listPluginMeta().flatMap((m) => (m.number ? [[m.number, m.id] as const] : [])),
);

/** Resolve the catalog item id from share state (`item` slug or manifest `id` number). */
export function resolveShareItemId(shared: ShareState | null | undefined): string | undefined {
  if (!shared) return undefined;
  const normalized = normalizeShareState(shared);
  if (normalized.item && catalog.getItem(normalized.item)) return normalized.item;
  if (normalized.id) {
    const itemId = itemIdByNumber.get(normalized.id);
    if (itemId && catalog.getItem(itemId)) return itemId;
  }
  return undefined;
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
    return btoa(encodeURIComponent(JSON.stringify(normalizeShareState(s))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function decodeShare(raw: string): ShareState | null {
  const encoded = raw.trim();
  if (!encoded) return null;
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const parsed = JSON.parse(decodeURIComponent(atob(b64 + pad)));
    return isShareObject(parsed) ? normalizeShareState(parsed) : null;
  } catch {
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(encoded)));
      return isShareObject(parsed) ? normalizeShareState(parsed) : null;
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
  const origin = typeof location === 'undefined' ? '' : location.origin;
  return `${origin}${buildAppUrl('workspace', `s=${encodeShare(s)}`)}`;
}

/**
 * Build a standalone workspace entry URL for opening in a new tab.
 * - canvas: pass no itemId and no trackId → standalone freeform canvas
 * - problem: pass itemId (+ optional mode, defaults to 'learn')
 * - track browse: pass trackId (no itemId) → track-board in workspace
 */
export function buildWorkspaceEntryUrl(input: {
  theme?: string;
  palette?: string;
  themePreset?: string;
  dir?: string;
  itemId?: string;
  mode?: string;
  trackId?: string;
}): string {
  const { theme, palette, themePreset, dir, itemId, mode, trackId } = input;
  const cleanTheme = cleanText(theme);
  const cleanPalette = cleanText(palette);
  const cleanThemePreset = cleanText(themePreset);
  const cleanDir = cleanText(dir);
  const base: ShareState = {
    ...(cleanTheme ? { theme: cleanTheme } : {}),
    ...(cleanPalette ? { palette: cleanPalette } : {}),
    ...(cleanThemePreset ? { themePreset: cleanThemePreset } : {}),
    ...(cleanDir ? { dir: cleanDir } : {}),
  };
  const cleanItemId = cleanText(itemId);
  const cleanTrackId = cleanText(trackId);
  if (cleanItemId) {
    const id = getPluginMeta(cleanItemId)?.number;
    return buildShareUrl({
      ...base,
      item: cleanItemId,
      ...(id ? { id } : {}),
      mode: cleanText(mode) ?? 'learn',
      focus: 'problem',
    });
  }
  if (cleanTrackId) {
    return buildShareUrl({ ...base, trackId: cleanTrackId, focus: 'problem' });
  }
  return buildShareUrl({ ...base, mode: 'visualize', focus: 'canvas' });
}

/** Invite link for a live collab/interview room (includes workspace context + room code). */
export function buildInviteUrl(s: ShareState, room: string): string {
  const roomCode = cleanUpper(room);
  const base = buildShareUrl({
    ...s,
    ...(roomCode ? { room: roomCode } : {}),
    focus: s.focus ?? 'canvas',
    mode: s.mode ?? 'visualize',
  });
  return base;
}

/** Guest-invite link for a durable interview: carries the room + public token + interview variant. */
export function buildInterviewInviteUrl(s: ShareState, room: string, guestToken?: string): string {
  const token = cleanText(guestToken);
  return buildInviteUrl(
    {
      ...s,
      sessionKind: 'interview',
      variant: 'interview',
      ...(token ? { guestToken: token } : {}),
    },
    room,
  );
}

export function readRoomFromUrl(): string | null {
  if (typeof location === 'undefined') return null;
  const fromHash = getHashParam(location.hash, 'room');
  if (fromHash) return cleanUpper(fromHash) ?? null;
  const share = readShareFromUrl();
  return cleanUpper(share?.room) ?? null;
}

export function readGuestTokenFromUrl(): string | null {
  const share = readShareFromUrl();
  return share?.guestToken?.trim() || null;
}

/** Merge workspace share state into the current hash body. */
function mergeShareHashBody(currentBody: string, encoded: string): string {
  const sharePart = `s=${encoded}`;
  if (!currentBody) return sharePart;
  const parts = currentBody.split('&').filter((p) => !p.startsWith('s='));
  if (parts.length === 0 || (parts.length === 1 && parts[0] != null && parts[0].startsWith('s=')))
    return sharePart;
  return `${parts.join('&')}&${sharePart}`;
}

/** Keep the URL in sync with workspace state (refresh restores the same view). */
export function writeShareToUrl(s: ShareState): void {
  if (typeof location === 'undefined') return;
  const hashBody = mergeShareHashBody(getHashBody(location.hash), encodeShare(s));
  const next = buildAppUrl('workspace', hashBody, location.search);
  const cur = `${location.pathname}${location.search}${location.hash}`;
  if (cur !== next && typeof history !== 'undefined') history.replaceState(null, '', next);
}
