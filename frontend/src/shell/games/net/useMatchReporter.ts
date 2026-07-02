import { useCallback } from 'react';
import { useGameRoom } from './useGameRoom';
import { useRoomComms } from './useRoomComms';
import { submitMatchResult } from '../data/db';
import type { RoomMode, SubmitMatchResult } from '../data/types';

/** One participant's finish, keyed by their live connection (peer) id. */
export interface ReportedParticipant {
  peerId: string;
  /** 1 = winner; ties share a placement. */
  placement: number;
  score?: number;
}

/**
 * Records a finished match to Supabase. Only the host reports — it is the
 * authoritative peer and reporting from every client would double-count. The
 * hook resolves each peer id to a durable Supabase profile via room presence,
 * so stats land on the right accounts. A no-op (returns null) when Supabase is
 * unconfigured or the caller isn't the host.
 */
export function useMatchReporter(gameId: string): {
  isReporter: boolean;
  report: (participants: ReportedParticipant[], opts?: { mode?: RoomMode; metadata?: Record<string, unknown> }) => Promise<SubmitMatchResult | null>;
} {
  const { role, room, players, sharedState } = useGameRoom();
  const { identities, reportResult } = useRoomComms();
  const isReporter = role === 'host';

  const report = useCallback(
    async (participants: ReportedParticipant[], opts?: { mode?: RoomMode; metadata?: Record<string, unknown> }) => {
      if (!isReporter) return null;
      // Feed the running session standings (works even without Supabase).
      reportResult(participants.filter((p) => p.placement === 1).map((p) => p.peerId));
      const mode =
        opts?.mode ??
        ((sharedState as { mode?: RoomMode } | null)?.mode ?? 'duel');
      return submitMatchResult({
        gameId,
        roomCode: room,
        mode,
        participants: participants.map((p) => {
          const id = identities[p.peerId];
          const name = id?.name ?? players.find((pl) => pl.id === p.peerId)?.name ?? 'Player';
          return {
            profileId: id?.profileId ?? null,
            displayName: name,
            placement: p.placement,
            score: p.score,
          };
        }),
        metadata: opts?.metadata,
      });
    },
    [isReporter, gameId, room, players, identities, sharedState, reportResult],
  );

  return { isReporter, report };
}
