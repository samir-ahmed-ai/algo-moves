/** Arcade-specific API types (games domain). */

export type ArcadeJsonObject = Record<string, unknown>;

export interface GameStats {
  profile_id: string;
  game_id: string;
  mmr: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  best_streak: number;
  matches_played: number;
  updated_at: string;
}

export type RoomMode = 'duel' | 'ffa' | 'tournament';

export interface MatchRow {
  id: string;
  game_id: string;
  room_code: string | null;
  mode: RoomMode;
  winner_profile_id: string | null;
  started_at: string | null;
  ended_at: string;
  metadata: ArcadeJsonObject;
  created_at: string;
}

export interface MatchParticipantRow {
  id: string;
  match_id: string;
  profile_id: string | null;
  display_name: string;
  placement: number;
  score: number;
  mmr_before: number | null;
  mmr_after: number | null;
  created_at: string;
}

export interface MatchHistoryEntry extends MatchParticipantRow {
  match: MatchRow;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  sort_order: number;
}

export interface RoomRow {
  code: string;
  host_profile_id: string | null;
  title: string | null;
  game_id: string | null;
  mode: RoomMode;
  capacity: number;
  is_public: boolean;
  created_at: string;
  last_active_at: string;
}

export type FriendStatus = 'pending' | 'accepted' | 'recent';

export interface Friend {
  profile_id: string;
  friend_profile_id: string;
  status: FriendStatus;
  created_at: string;
}

export interface DailyChallenge {
  challenge_date: string;
  game_id: string;
  seed: string;
  config: ArcadeJsonObject;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  display_name: string;
  avatar_seed: string;
  level: number;
  mmr?: number | undefined;
  xp?: number | undefined;
  wins?: number | undefined;
  losses?: number | undefined;
  matches_played?: number | undefined;
}

export interface MatchResultParticipant {
  profileId: string | null;
  displayName: string;
  placement: number;
  score?: number | undefined;
}

export interface MatchResultInput {
  gameId: string;
  roomCode?: string | null | undefined;
  mode?: RoomMode | undefined;
  participants: MatchResultParticipant[];
  metadata?: ArcadeJsonObject | undefined;
}

export interface MatchResultDelta {
  profile_id: string | null;
  result: 'win' | 'loss' | 'draw';
  mmr_before: number;
  mmr_after: number;
  mmr_delta: number;
  streak: number;
}

export interface SubmitMatchResult {
  match_id: string;
  participants: MatchResultDelta[];
}
