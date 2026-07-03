import {
  collabSession,
  defaultSession,
  isSessionMeta,
  type SessionMeta,
} from '@/lib/session/types';
import type { CanvasDoc } from '@/shell/canvas/collab/protocol/collabProtocol';
import { isCanvasDoc } from '@/shell/canvas/collab/protocol/canvasDoc';
import type { SubDocSnapshot } from '@/shell/canvas/collab/protocol/subdocProtocol';

export const ROOM_STATE_V = 1 as const;

/**
 * Host-authoritative room blob. Canvas collab publishes `session` + `canvas` +
 * optional `subDocs` for panel interiors (whiteboard, shared editor).
 */
export interface RoomSharedEnvelope {
  v: typeof ROOM_STATE_V;
  session: SessionMeta;
  canvas?: CanvasDoc;
  subDocs?: Record<string, SubDocSnapshot>;
  game?: unknown;
}

export function isRoomEnvelope(value: unknown): value is RoomSharedEnvelope {
  const e = value as Partial<RoomSharedEnvelope> | null;
  return !!e && e.v === ROOM_STATE_V && isSessionMeta(e.session);
}

/** Accept legacy bare {@link CanvasDoc} snapshots and v1 envelopes. */
export function extractCanvasDoc(value: unknown): CanvasDoc | null {
  if (isRoomEnvelope(value)) {
    const doc = value.canvas;
    return doc && isCanvasDoc(doc) ? doc : null;
  }
  return isCanvasDoc(value) ? value : null;
}

export function extractSubDocs(value: unknown): Record<string, SubDocSnapshot> {
  if (isRoomEnvelope(value) && value.subDocs && typeof value.subDocs === 'object') {
    return value.subDocs;
  }
  return {};
}

export function extractSessionMeta(value: unknown): SessionMeta {
  if (isRoomEnvelope(value)) return value.session;
  if (isCanvasDoc(value)) return collabSession();
  return defaultSession('solo');
}

export function buildCanvasRoomState(
  session: SessionMeta,
  canvas: CanvasDoc,
  subDocs?: Record<string, SubDocSnapshot>,
): RoomSharedEnvelope {
  const env: RoomSharedEnvelope = { v: ROOM_STATE_V, session, canvas };
  if (subDocs && Object.keys(subDocs).length > 0) env.subDocs = subDocs;
  return env;
}
