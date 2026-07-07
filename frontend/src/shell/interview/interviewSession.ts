import {
  defaultInterviewRuntime,
  interviewSession,
  DEFAULT_INTERVIEW_SETTINGS,
  type InterviewRuntime,
  type SessionMeta,
} from '@/lib/session';
import { readShareFromUrl, writeShareToUrl } from '@/store/navigation/shareState';
import {
  createInterviewSession,
  updateInterviewSession,
  type InterviewSummary,
} from '@/platform/api/interviewApi';
import { markInterviewHost } from './interviewHost';

export interface HostInterviewBootstrap {
  sessionMeta: SessionMeta;
  backendDegraded: boolean;
}

/** Create a durable REST session (when available) and bind it to a live room code. */
export async function bootstrapHostInterviewSession(
  problemId: string,
  roomCode: string,
): Promise<HostInterviewBootstrap> {
  const created = await createInterviewSession('Untitled interview').catch(() => null);
  if (created?.id) void updateInterviewSession(created.id, { roomCode });
  markInterviewHost(roomCode);
  const share = readShareFromUrl() ?? {};
  writeShareToUrl({ ...share, room: roomCode, sessionKind: 'interview' });
  return {
    sessionMeta: interviewSession(problemId, DEFAULT_INTERVIEW_SETTINGS, {
      ...(created?.id !== undefined ? { sessionId: created.id } : {}),
      ...(created?.guestToken !== undefined ? { guestToken: created.guestToken } : {}),
    }),
    backendDegraded: !created?.id,
  };
}

export function buildResumeInterviewSession(row: InterviewSummary): SessionMeta {
  const runtime: InterviewRuntime = { ...defaultInterviewRuntime(), locked: row.canvasLocked };
  return interviewSession('', DEFAULT_INTERVIEW_SETTINGS, {
    sessionId: row.id,
    runtime,
  });
}

export function persistInterviewHostRoom(roomCode: string): void {
  markInterviewHost(roomCode);
  const share = readShareFromUrl() ?? {};
  writeShareToUrl({ ...share, room: roomCode, sessionKind: 'interview' });
}

export function buildJoinInterviewSession(problemId: string, guestToken?: string): SessionMeta {
  return interviewSession(problemId, DEFAULT_INTERVIEW_SETTINGS, {
    ...(guestToken !== undefined ? { guestToken } : {}),
  });
}
