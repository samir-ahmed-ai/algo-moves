import { useEffect, useRef, useState } from 'react';
import { readShareFromUrl } from '@/store/navigation/shareState';
import { useCanvasCollab } from '@/shell/collab/CanvasCollabProvider';
import { fetchPublicInterviewSession } from '@/platform/api/interviewApi';
import { isInterviewHostRoom } from './interviewHost';

export type GuestGatePhase = 'inactive' | 'loading' | 'name' | 'closed';

export interface InterviewGuestGate {
  phase: GuestGatePhase;
  title: string;
  /** Join the room with the chosen display name. */
  submit: (name: string) => void;
}

/**
 * Drives the interview guest onboarding: resolves the room (from a `guestToken`
 * or a raw room code in the invite URL), surfaces a name-gate, and degrades to
 * a "closed" state when the session ended or its link was disabled. Inactive
 * for non-interview links and once the local peer has joined.
 */
export function useInterviewGuestGate(): InterviewGuestGate {
  const { joinSession, isCollaborating } = useCanvasCollab();
  const share = readShareFromUrl();
  const linkRoom = share?.room ?? null;
  const guestToken = share?.guestToken ?? null;
  const isInterviewLink = share?.sessionKind === 'interview' && (!!linkRoom || !!guestToken);

  // A host who reloaded their own room rejoins as host — never gated as a guest.
  const hostReturning = isInterviewLink && !!linkRoom && isInterviewHostRoom(linkRoom);
  const [phase, setPhase] = useState<GuestGatePhase>(
    isInterviewLink && !hostReturning ? 'loading' : 'inactive',
  );
  const [room, setRoom] = useState<string | null>(linkRoom);
  const [title, setTitle] = useState('Interview');
  const resolved = useRef(false);

  // Host reload path: silently rejoin the room (relay re-seats seat-0 as host).
  const rejoined = useRef(false);
  useEffect(() => {
    if (!hostReturning || rejoined.current || isCollaborating || !linkRoom) return;
    rejoined.current = true;
    joinSession(linkRoom);
  }, [hostReturning, isCollaborating, linkRoom, joinSession]);

  useEffect(() => {
    if (!isInterviewLink || hostReturning || resolved.current) return;
    resolved.current = true;
    if (!guestToken) {
      // Plain interview room code — no durable lookup available.
      setPhase(linkRoom ? 'name' : 'closed');
      return;
    }
    void fetchPublicInterviewSession(guestToken).then((s) => {
      if (!s || s.status !== 'active') {
        setPhase('closed');
        return;
      }
      setRoom(s.roomCode ?? linkRoom);
      setTitle(s.title || 'Interview');
      setPhase(s.roomCode || linkRoom ? 'name' : 'closed');
    });
  }, [isInterviewLink, guestToken, linkRoom]);

  const submit = (name: string) => {
    if (!room) return;
    joinSession(room, name);
  };

  // Once we've joined, the gate is done.
  if (isCollaborating && phase !== 'inactive') return { phase: 'inactive', title, submit };

  return { phase, title, submit };
}
