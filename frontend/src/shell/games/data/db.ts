import { arcadeFetch } from './arcadeClient';
import type {
  Achievement,
  DailyChallenge,
  Friend,
  GameStats,
  LeaderboardEntry,
  MatchHistoryEntry,
  MatchResultInput,
  Profile,
  RoomRow,
  SubmitMatchResult,
} from './types';

/**
 * Data-access layer for the arcade. Every function is a no-op / empty result
 * when the backend has no Postgres configured, so callers never need to branch.
 */

// ---- profiles -------------------------------------------------------------

export async function getProfile(id: string): Promise<Profile | null> {
  return arcadeFetch<Profile>(`/api/profiles/${id}`, { auth: false });
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  return (await arcadeFetch<Profile[]>(`/api/profiles/${ids.join(',')}`, { auth: false })) ?? [];
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'is_anonymous'>>,
): Promise<Profile | null> {
  void id;
  return arcadeFetch<Profile>('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ---- stats & history ------------------------------------------------------

export async function getGameStats(profileId: string): Promise<GameStats[]> {
  void profileId;
  return (await arcadeFetch<GameStats[]>('/api/stats/me')) ?? [];
}

export async function getMatchHistory(profileId: string, limit = 25): Promise<MatchHistoryEntry[]> {
  void profileId;
  void limit;
  return (await arcadeFetch<MatchHistoryEntry[]>('/api/matches/me')) ?? [];
}

export async function submitMatchResult(input: MatchResultInput): Promise<SubmitMatchResult | null> {
  return arcadeFetch<SubmitMatchResult>('/api/matches', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({
      gameId: input.gameId,
      roomCode: input.roomCode ?? null,
      mode: input.mode ?? 'duel',
      participants: input.participants.map((p) => ({
        profile_id: p.profileId,
        display_name: p.displayName,
        placement: p.placement,
        score: p.score ?? 0,
      })),
      metadata: input.metadata ?? {},
    }),
  });
}

// ---- leaderboards ---------------------------------------------------------

export async function leaderboardGame(gameId: string, limit = 50): Promise<LeaderboardEntry[]> {
  return (await arcadeFetch<LeaderboardEntry[]>(`/api/leaderboard/game/${gameId}?limit=${limit}`, { auth: false })) ?? [];
}

export async function leaderboardGlobal(limit = 50): Promise<LeaderboardEntry[]> {
  return (await arcadeFetch<LeaderboardEntry[]>(`/api/leaderboard/global?limit=${limit}`, { auth: false })) ?? [];
}

export async function leaderboardRecent(
  sinceIso: string,
  gameId: string | null = null,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ since: sinceIso, limit: String(limit) });
  if (gameId) params.set('game', gameId);
  return (await arcadeFetch<LeaderboardEntry[]>(`/api/leaderboard/recent?${params}`, { auth: false })) ?? [];
}

// ---- achievements ---------------------------------------------------------

export async function listAchievements(): Promise<Achievement[]> {
  return (await arcadeFetch<Achievement[]>('/api/achievements', { auth: false })) ?? [];
}

export async function listUnlockedAchievementIds(profileId: string): Promise<string[]> {
  void profileId;
  return (await arcadeFetch<string[]>('/api/achievements?unlocked=1')) ?? [];
}

export async function unlockAchievement(achievementId: string): Promise<void> {
  await arcadeFetch(`/api/achievements/${achievementId}`, { method: 'POST' });
}

// ---- rooms ----------------------------------------------------------------

export async function upsertRoom(row: Partial<RoomRow> & { code: string }): Promise<RoomRow | null> {
  return arcadeFetch<RoomRow>(`/api/rooms/${row.code}`, {
    method: 'PUT',
    body: JSON.stringify({ ...row, last_active_at: new Date().toISOString() }),
  });
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  return arcadeFetch<RoomRow>(`/api/rooms/${code}`, { auth: false });
}

export async function listPublicRooms(limit = 20): Promise<RoomRow[]> {
  return (await arcadeFetch<RoomRow[]>(`/api/rooms/public?limit=${limit}`, { auth: false })) ?? [];
}

export async function touchRoom(code: string): Promise<void> {
  await arcadeFetch(`/api/rooms/${code}/touch`, { method: 'POST' });
}

// ---- friends / recent players ---------------------------------------------

export async function listFriends(profileId: string): Promise<Friend[]> {
  void profileId;
  return (await arcadeFetch<Friend[]>('/api/friends')) ?? [];
}

export async function addFriend(
  profileId: string,
  friendProfileId: string,
  status: Friend['status'] = 'pending',
): Promise<void> {
  void profileId;
  if (profileId === friendProfileId) return;
  await arcadeFetch('/api/friends', {
    method: 'POST',
    body: JSON.stringify({ friend_profile_id: friendProfileId, status }),
  });
}

// ---- daily challenge ------------------------------------------------------

export async function getOrCreateDailyChallenge(dateIso?: string): Promise<DailyChallenge | null> {
  const date = dateIso?.slice(0, 10);
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return arcadeFetch<DailyChallenge>(`/api/daily-challenge${q}`, { auth: false });
}

export async function submitDailyScore(dateIso: string, score: number): Promise<void> {
  await arcadeFetch('/api/daily-challenge/score', {
    method: 'POST',
    body: JSON.stringify({ date: dateIso.slice(0, 10), score }),
  });
}
