import type { Role } from '@/shell/realtime';
import { DEFAULT_INTERVIEW_SETTINGS, type InterviewSettings, type SessionMeta } from '@/lib/session/types';
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
  const settings = guestInterviewSettings(ctx.session);
  if (kind === 'whiteboard') return settings.guestCanEditBoard !== false;
  if (kind === 'collab-code') return settings.guestCanEditCode !== false;
  return true;
}

export function canMoveCanvasNodes(ctx: SubDocPermissionContext): boolean {
  if (!ctx.isCollaborating) return true;
  if (ctx.role === 'host') return true;
  if (ctx.role === 'spectator') return false;
  if (ctx.session.kind !== 'interview') return true;
  return guestInterviewSettings(ctx.session).guestCanMoveNodes === true;
}
