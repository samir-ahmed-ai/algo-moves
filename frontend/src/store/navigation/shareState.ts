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
export const LEGACY_ITEM_REDIRECTS: Record<string, string> = {
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

/** Resolve share state item id through legacy redirects (item ids unchanged; pluginIds migrated). */
export function normalizeShareState(s: ShareState): ShareState {
  let out: ShareState = {
    ...s,
    item: cleanText(s.item),
    id: cleanText(s.id),
    input: cleanText(s.input),
    mode: cleanText(s.mode),
    theme: cleanText(s.theme),
    palette: cleanText(s.palette),
    themePreset: cleanText(s.themePreset),
    dir: cleanText(s.dir),
    room: cleanUpper(s.room),
    guestToken: cleanText(s.guestToken),
    trackId: cleanText(s.trackId),
  };
  if (out.variant !== undefined && out.variant !== 'interview') {
    const { variant: _ignored, ...rest } = out;
    out = rest;
  }
  if (
    out.sessionKind !== undefined &&
    out.sessionKind !== 'interview' &&
    out.sessionKind !== 'collab'
  ) {
    const { sessionKind: _ignored, ...rest } = out;
    out = rest;
  }
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
    return normalizeShareState(JSON.parse(decodeURIComponent(atob(b64 + pad))) as ShareState);
  } catch {
    try {
      return normalizeShareState(JSON.parse(decodeURIComponent(atob(encoded))) as ShareState);
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
  const base = { theme, palette, themePreset, dir };
  const cleanItemId = cleanText(itemId);
  const cleanTrackId = cleanText(trackId);
  if (cleanItemId) {
    const id = getPluginMeta(cleanItemId)?.number;
    return buildShareUrl({
      ...base,
      item: cleanItemId,
      id,
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
  const base = buildShareUrl({
    ...s,
    room: cleanUpper(room),
    focus: s.focus ?? 'canvas',
    mode: s.mode ?? 'visualize',
  });
  return base;
}

/** Guest-invite link for a durable interview: carries the room + public token + interview variant. */
export function buildInterviewInviteUrl(s: ShareState, room: string, guestToken?: string): string {
  return buildInviteUrl(
    { ...s, sessionKind: 'interview', variant: 'interview', guestToken: cleanText(guestToken) },
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
  if (parts.length === 0 || (parts.length === 1 && parts[0].startsWith('s='))) return sharePart;
  return `${parts.join('&')}&${sharePart}`;
}

/** Keep the URL in sync with workspace state (refresh restores the same view). */
export function writeShareToUrl(s: ShareState) {
  if (typeof location === 'undefined') return;
  const hashBody = mergeShareHashBody(getHashBody(location.hash), encodeShare(s));
  const next = buildAppUrl('workspace', hashBody, location.search);
  const cur = `${location.pathname}${location.search}${location.hash}`;
  if (cur !== next) history.replaceState(null, '', next);
}
