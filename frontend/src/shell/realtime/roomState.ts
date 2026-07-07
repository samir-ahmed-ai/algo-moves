import {
  defaultSession,
  isSessionMeta,
  type InterviewRuntime,
  type SessionMeta,
} from '@/lib/session/types';
import type { CanvasDoc, SubDocSnapshot } from '@/shell/canvas';
import { isCanvasDoc } from '@/shell/canvas';

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

export function extractCanvasDoc(value: unknown): CanvasDoc | null {
  if (!isRoomEnvelope(value)) return null;
  const doc = value.canvas;
  return doc && isCanvasDoc(doc) ? doc : null;
}

export function extractSubDocs(value: unknown): Record<string, SubDocSnapshot> {
  if (isRoomEnvelope(value) && value.subDocs && typeof value.subDocs === 'object') {
    return value.subDocs;
  }
  return {};
}

export function extractSessionMeta(value: unknown): SessionMeta {
  if (isRoomEnvelope(value)) return value.session;
  return defaultSession('solo');
}

/** Convenience: pull the host-broadcast interview runtime (timer/lock/follow). */
export function extractInterviewRuntime(value: unknown): InterviewRuntime | null {
  return extractSessionMeta(value).interviewRuntime ?? null;
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

/** Session + interview metadata only — canvas/subDocs live in Yjs when transport is on. */
export function buildSessionRoomState(session: SessionMeta): RoomSharedEnvelope {
  return { v: ROOM_STATE_V, session };
}
