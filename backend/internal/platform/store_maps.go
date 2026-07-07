package platform

import (
	"encoding/json"
	"time"

	"algomoves/gameserver/internal/platform/arcadedb"
	"github.com/jackc/pgx/v5/pgtype"
)

func pgUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return u.String()
}

func pgTextString(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func pgInt4Int(i pgtype.Int4) int {
	if !i.Valid {
		return 0
	}
	return int(i.Int32)
}

func pgTimestamptzTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

func pgTimestamptzRFC3339(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(time.RFC3339Nano)
}

func pgDateString(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

func jsonBytesToAny(b []byte) any {
	if len(b) == 0 {
		return nil
	}
	var out any
	if json.Unmarshal(b, &out) == nil {
		return normalizeJSON(out)
	}
	return string(b)
}

func gameStatToMap(s arcadedb.GameStat) map[string]any {
	return map[string]any{
		"profile_id":      pgUUIDString(s.ProfileID),
		"game_id":         s.GameID,
		"mmr":             s.Mmr,
		"wins":            s.Wins,
		"losses":          s.Losses,
		"draws":           s.Draws,
		"streak":          s.Streak,
		"best_streak":     s.BestStreak,
		"matches_played":  s.MatchesPlayed,
		"updated_at":      pgTimestamptzRFC3339(s.UpdatedAt),
	}
}

func roomToMap(r arcadedb.Room) map[string]any {
	return map[string]any{
		"code":             r.Code,
		"host_profile_id":  pgUUIDString(r.HostProfileID),
		"title":            pgTextString(r.Title),
		"game_id":          pgTextString(r.GameID),
		"mode":             r.Mode,
		"capacity":         r.Capacity,
		"is_public":        r.IsPublic,
		"created_at":       pgTimestamptzRFC3339(r.CreatedAt),
		"last_active_at":   pgTimestamptzRFC3339(r.LastActiveAt),
	}
}

func friendToMap(f arcadedb.Friend) map[string]any {
	return map[string]any{
		"profile_id":        pgUUIDString(f.ProfileID),
		"friend_profile_id": pgUUIDString(f.FriendProfileID),
		"status":            f.Status,
		"created_at":        pgTimestamptzRFC3339(f.CreatedAt),
	}
}

func achievementToMap(a arcadedb.Achievement) map[string]any {
	return map[string]any{
		"id":          a.ID,
		"title":       a.Title,
		"description": a.Description,
		"icon":        a.Icon,
		"points":      a.Points,
		"sort_order":  a.SortOrder,
	}
}

func dailyChallengeToMap(d arcadedb.DailyChallenge) map[string]any {
	return map[string]any{
		"challenge_date": pgDateString(d.ChallengeDate),
		"game_id":        d.GameID,
		"seed":           d.Seed,
		"config":         jsonBytesToAny(d.Config),
		"created_at":     pgTimestamptzRFC3339(d.CreatedAt),
	}
}

func listCanvasToMap(c arcadedb.ListCanvasesRow) map[string]any {
	return map[string]any{
		"id":         c.ID,
		"title":      c.Title,
		"room_code":  pgTextString(c.RoomCode),
		"updated_at": pgTimestamptzRFC3339(c.UpdatedAt),
	}
}

func matchHistoryToMap(r arcadedb.MatchHistoryRow) map[string]any {
	return map[string]any{
		"id":           pgUUIDString(r.ID),
		"match_id":     pgUUIDString(r.MatchID),
		"profile_id":   pgUUIDString(r.ProfileID),
		"display_name": r.DisplayName,
		"placement":    r.Placement,
		"score":        r.Score,
		"mmr_before":   pgInt4Int(r.MmrBefore),
		"mmr_after":    pgInt4Int(r.MmrAfter),
		"created_at":   pgTimestamptzRFC3339(r.CreatedAt),
		"match":        jsonBytesToAny(r.Match),
	}
}

func leaderboardGameToMap(r arcadedb.LeaderboardGameRow) map[string]any {
	return map[string]any{
		"rank":            r.Rank,
		"profile_id":      pgUUIDString(r.ProfileID),
		"display_name":    r.DisplayName,
		"avatar_seed":     r.AvatarSeed,
		"level":           pgInt4Int(r.Level),
		"mmr":             r.Mmr,
		"wins":            r.Wins,
		"losses":          r.Losses,
		"matches_played":  r.MatchesPlayed,
	}
}

func leaderboardGlobalToMap(r arcadedb.LeaderboardGlobalRow) map[string]any {
	return map[string]any{
		"rank":         r.Rank,
		"profile_id":   pgUUIDString(r.ProfileID),
		"display_name": r.DisplayName,
		"avatar_seed":  r.AvatarSeed,
		"level":        pgInt4Int(r.Level),
		"xp":           r.Xp,
	}
}

func leaderboardRecentToMap(r arcadedb.LeaderboardRecentRow) map[string]any {
	return map[string]any{
		"rank":         r.Rank,
		"profile_id":   pgUUIDString(r.ProfileID),
		"display_name": r.DisplayName,
		"avatar_seed":  r.AvatarSeed,
		"level":        pgInt4Int(r.Level),
		"wins":         r.Wins,
	}
}

func profileFromCreateGuestRow(row arcadedb.CreateGuestProfileRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromCreateEmailRow(row arcadedb.CreateEmailProfileRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}
