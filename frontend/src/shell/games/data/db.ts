import { getSupabase } from './supabaseClient';
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
 * when Supabase is not configured, so callers never need to branch on it.
 */

// ---- profiles -------------------------------------------------------------

export async function getProfile(id: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  const sb = getSupabase();
  if (!sb || ids.length === 0) return [];
  const { data } = await sb.from('profiles').select('*').in('id', ids);
  return (data as Profile[]) ?? [];
}

export async function updateProfile(
  id: string,
  patch: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'is_anonymous'>>,
): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('profiles').update(patch).eq('id', id).select('*').maybeSingle();
  return (data as Profile) ?? null;
}

// ---- stats & history ------------------------------------------------------

export async function getGameStats(profileId: string): Promise<GameStats[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('game_stats').select('*').eq('profile_id', profileId);
  return (data as GameStats[]) ?? [];
}

export async function getMatchHistory(profileId: string, limit = 25): Promise<MatchHistoryEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('match_participants')
    .select('*, match:matches(*)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as MatchHistoryEntry[]) ?? [];
}

export async function submitMatchResult(input: MatchResultInput): Promise<SubmitMatchResult | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('submit_match_result', {
    p_game: input.gameId,
    p_room: input.roomCode ?? null,
    p_mode: input.mode ?? 'duel',
    p_participants: input.participants.map((p) => ({
      profile_id: p.profileId,
      display_name: p.displayName,
      placement: p.placement,
      score: p.score ?? 0,
    })),
    p_metadata: input.metadata ?? {},
  });
  if (error) return null;
  return (data as SubmitMatchResult) ?? null;
}

// ---- leaderboards ---------------------------------------------------------

export async function leaderboardGame(gameId: string, limit = 50): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc('leaderboard_game', { p_game: gameId, p_limit: limit });
  return (data as LeaderboardEntry[]) ?? [];
}

export async function leaderboardGlobal(limit = 50): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc('leaderboard_global', { p_limit: limit });
  return (data as LeaderboardEntry[]) ?? [];
}

export async function leaderboardRecent(
  sinceIso: string,
  gameId: string | null = null,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.rpc('leaderboard_recent', {
    p_since: sinceIso,
    p_game: gameId,
    p_limit: limit,
  });
  return (data as LeaderboardEntry[]) ?? [];
}

// ---- achievements ---------------------------------------------------------

export async function listAchievements(): Promise<Achievement[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('achievements').select('*').order('sort_order');
  return (data as Achievement[]) ?? [];
}

export async function listUnlockedAchievementIds(profileId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('profile_achievements')
    .select('achievement_id')
    .eq('profile_id', profileId);
  return ((data as { achievement_id: string }[]) ?? []).map((r) => r.achievement_id);
}

export async function unlockAchievement(achievementId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc('unlock_achievement', { p_ach: achievementId });
}

// ---- rooms ----------------------------------------------------------------

export async function upsertRoom(row: Partial<RoomRow> & { code: string }): Promise<RoomRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('rooms')
    .upsert({ ...row, last_active_at: new Date().toISOString() })
    .select('*')
    .maybeSingle();
  return (data as RoomRow) ?? null;
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from('rooms').select('*').eq('code', code).maybeSingle();
  return (data as RoomRow) ?? null;
}

export async function listPublicRooms(limit = 20): Promise<RoomRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('rooms')
    .select('*')
    .eq('is_public', true)
    .order('last_active_at', { ascending: false })
    .limit(limit);
  return (data as RoomRow[]) ?? [];
}

export async function touchRoom(code: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('rooms').update({ last_active_at: new Date().toISOString() }).eq('code', code);
}

// ---- friends / recent players ---------------------------------------------

export async function listFriends(profileId: string): Promise<Friend[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('friends')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  return (data as Friend[]) ?? [];
}

export async function addFriend(
  profileId: string,
  friendProfileId: string,
  status: Friend['status'] = 'pending',
): Promise<void> {
  const sb = getSupabase();
  if (!sb || profileId === friendProfileId) return;
  await sb
    .from('friends')
    .upsert({ profile_id: profileId, friend_profile_id: friendProfileId, status });
}

// ---- daily challenge ------------------------------------------------------

export async function getOrCreateDailyChallenge(dateIso?: string): Promise<DailyChallenge | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.rpc('get_or_create_daily_challenge', dateIso ? { p_date: dateIso } : {});
  return (data as DailyChallenge) ?? null;
}

export async function submitDailyScore(dateIso: string, score: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc('submit_daily_score', { p_date: dateIso, p_score: score });
}
