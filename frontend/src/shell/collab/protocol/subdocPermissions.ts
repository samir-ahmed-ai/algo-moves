import type { Role } from '@/shell/realtime';
import {
  DEFAULT_INTERVIEW_SETTINGS,
  type InterviewSettings,
  type SessionMeta,
} from '@/lib/session/types';
import type { SubDocKind } from './subdocProtocol';

export interface SubDocPermissionContext {
  role: Role | null;
  session: SessionMeta;
  isCollaborating: boolean;
}

function guestInterviewSettings(session: SessionMeta): InterviewSettings {
  return session.interview ?? DEFAULT_INTERVIEW_SETTINGS;
}

export function canEditSubDoc(ctx: SubDocPermissionContext, kind: SubDocKind): boolean {
  if (!ctx.isCollaborating) return true;
  if (ctx.role === 'host') return true;
  if (ctx.role === 'spectator') return false;
  if (ctx.session.kind !== 'interview') return true;
  // A locked board (host toggle, broadcast via the envelope) makes guests view-only.
  if (ctx.session.interviewRuntime?.locked) return false;
  const settings = guestInterviewSettings(ctx.session);
  if (kind === 'collab-code') return settings.guestCanEditCode !== false;
  // Whiteboard and shared notes are both facilitator-controlled shared surfaces;
  // the guest board-edit toggle governs both.
  return settings.guestCanEditBoard !== false;
}

export function canMoveCanvasNodes(ctx: SubDocPermissionContext): boolean {
  if (!ctx.isCollaborating) return true;
  if (ctx.role === 'host') return true;
  if (ctx.role === 'spectator') return false;
  if (ctx.session.kind !== 'interview') return true;
  if (ctx.session.interviewRuntime?.locked) return false;
  return guestInterviewSettings(ctx.session).guestCanMoveNodes === true;
}
