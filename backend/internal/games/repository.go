package games

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

func (r *Repository) GameStats(ctx context.Context, profileID string) ([]map[string]any, error) {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.GameStatsByProfile(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = gameStatToMap(row)
	}
	return out, nil
}

func (r *Repository) MatchHistory(ctx context.Context, profileID string, limit int) ([]map[string]any, error) {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.MatchHistory(ctx, postgres.MatchHistoryParams{
		ProfileID: uid,
		RowLimit:  int32(limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = matchHistoryToMap(row)
	}
	return out, nil
}

func (r *Repository) SubmitMatchResult(ctx context.Context, game, room, mode string, participants json.RawMessage, metadata json.RawMessage) (json.RawMessage, error) {
	if len(metadata) == 0 {
		metadata = json.RawMessage("{}")
	}
	out, err := r.db.Q.SubmitMatchResult(ctx, postgres.SubmitMatchResultParams{
		Game:         game,
		Room:         room,
		Mode:         mode,
		Participants: []byte(participants),
		Metadata:     []byte(metadata),
	})
	if err != nil {
		return nil, err
	}
	return json.RawMessage(out), nil
}

func (r *Repository) LeaderboardGame(ctx context.Context, game string, limit int) ([]map[string]any, error) {
	rows, err := r.db.Q.LeaderboardGame(ctx, postgres.LeaderboardGameParams{
		Game:     game,
		RowLimit: int32(limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = leaderboardGameToMap(row)
	}
	return out, nil
}

func (r *Repository) LeaderboardGlobal(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := r.db.Q.LeaderboardGlobal(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = leaderboardGlobalToMap(row)
	}
	return out, nil
}

func (r *Repository) LeaderboardRecent(ctx context.Context, since time.Time, game *string, limit int) ([]map[string]any, error) {
	var gameArg pgtype.Text
	if game != nil {
		gameArg = pgtype.Text{String: *game, Valid: true}
	}
	rows, err := r.db.Q.LeaderboardRecent(ctx, postgres.LeaderboardRecentParams{
		Since:    pgtype.Timestamptz{Time: since, Valid: true},
		Game:     gameArg,
		RowLimit: int32(limit),
	})
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = leaderboardRecentToMap(row)
	}
	return out, nil
}

func (r *Repository) ListAchievements(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.Q.ListAchievements(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = achievementToMap(row)
	}
	return out, nil
}

func (r *Repository) UnlockedAchievementIDs(ctx context.Context, profileID string) ([]string, error) {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return nil, err
	}
	return r.db.Q.UnlockedAchievementIDs(ctx, uid)
}

func (r *Repository) UnlockAchievement(ctx context.Context, profileID, achID string) error {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return err
	}
	return r.db.Q.UnlockAchievement(ctx, postgres.UnlockAchievementParams{
		ProfileID:     uid,
		AchievementID: achID,
	})
}

func (r *Repository) UpsertRoom(ctx context.Context, row map[string]any) (map[string]any, error) {
	code, _ := row["code"].(string)
	hostID, _ := row["host_profile_id"].(string)
	title, _ := row["title"].(string)
	gameID, _ := row["game_id"].(string)
	mode, _ := row["mode"].(string)
	capacity, _ := row["capacity"].(float64)
	isPublic, _ := row["is_public"].(bool)
	if mode == "" {
		mode = "duel"
	}
	if capacity == 0 {
		capacity = 2
	}
	var hostPtr pgtype.UUID
	if hostID != "" {
		uid, err := database.ParseUUID(hostID)
		if err != nil {
			return nil, err
		}
		hostPtr = uid
	}
	room, err := r.db.Q.UpsertRoom(ctx, postgres.UpsertRoomParams{
		Code:          code,
		HostProfileID: hostPtr,
		Title:         title,
		GameID:        gameID,
		Mode:          mode,
		Capacity:      int32(capacity),
		IsPublic:      isPublic,
	})
	if err != nil {
		return nil, err
	}
	out := roomToMap(room)
	return out, nil
}

func (r *Repository) GetRoom(ctx context.Context, code string) (map[string]any, error) {
	room, err := r.db.Q.GetRoom(ctx, code)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out := roomToMap(room)
	return out, nil
}

func (r *Repository) ListPublicRooms(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := r.db.Q.ListPublicRooms(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = roomToMap(row)
	}
	return out, nil
}

func (r *Repository) TouchRoom(ctx context.Context, code string) error {
	return r.db.Q.TouchRoom(ctx, code)
}

func (r *Repository) ListFriends(ctx context.Context, profileID string) ([]map[string]any, error) {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListFriends(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = friendToMap(row)
	}
	return out, nil
}

func (r *Repository) AddFriend(ctx context.Context, profileID, friendID, status string) error {
	if profileID == friendID {
		return nil
	}
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return err
	}
	fid, err := database.ParseUUID(friendID)
	if err != nil {
		return err
	}
	return r.db.Q.AddFriend(ctx, postgres.AddFriendParams{
		ProfileID:       uid,
		FriendProfileID: fid,
		Status:          status,
	})
}

func (r *Repository) GetOrCreateDailyChallenge(ctx context.Context, date string) (map[string]any, error) {
	var d pgtype.Date
	if err := d.Scan(date); err != nil {
		return nil, err
	}
	row, err := r.db.Q.GetOrCreateDailyChallenge(ctx, d)
	if err != nil {
		return nil, err
	}
	return dailyChallengeToMap(row), nil
}

func (r *Repository) SubmitDailyScore(ctx context.Context, profileID, date string, score int) error {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return err
	}
	var d pgtype.Date
	if err := d.Scan(date); err != nil {
		return err
	}
	return r.db.Q.SubmitDailyScore(ctx, postgres.SubmitDailyScoreParams{
		ProfileID:     uid,
		ChallengeDate: d,
		Score:         int32(score),
	})
}

func (r *Repository) ListGames(ctx context.Context) ([]map[string]any, error) {
	rows, err := r.db.Q.ListActiveGames(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0, len(rows))
	for _, g := range rows {
		out = append(out, gameToMap(g))
	}
	return out, nil
}

func (r *Repository) GetGame(ctx context.Context, id string) (map[string]any, error) {
	g, err := r.db.Q.GetGameByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	m := gameToMap(g)
	return m, nil
}

func gameStatToMap(s postgres.GameStat) map[string]any {
	return map[string]any{
		"profile_id":     database.PgUUIDString(s.ProfileID),
		"game_id":        s.GameID,
		"mmr":            s.Mmr,
		"wins":           s.Wins,
		"losses":         s.Losses,
		"draws":          s.Draws,
		"streak":         s.Streak,
		"best_streak":    s.BestStreak,
		"matches_played": s.MatchesPlayed,
		"updated_at":     database.PgTimestamptzRFC3339(s.UpdatedAt),
	}
}

func roomToMap(r postgres.Room) map[string]any {
	return map[string]any{
		"code":            r.Code,
		"host_profile_id": database.PgUUIDString(r.HostProfileID),
		"title":           database.PgTextString(r.Title),
		"game_id":         database.PgTextString(r.GameID),
		"mode":            r.Mode,
		"capacity":        r.Capacity,
		"is_public":       r.IsPublic,
		"created_at":      database.PgTimestamptzRFC3339(r.CreatedAt),
		"last_active_at":  database.PgTimestamptzRFC3339(r.LastActiveAt),
	}
}

func friendToMap(f postgres.Friend) map[string]any {
	return map[string]any{
		"profile_id":        database.PgUUIDString(f.ProfileID),
		"friend_profile_id": database.PgUUIDString(f.FriendProfileID),
		"status":            f.Status,
		"created_at":        database.PgTimestamptzRFC3339(f.CreatedAt),
	}
}

func achievementToMap(a postgres.Achievement) map[string]any {
	return map[string]any{
		"id":          a.ID,
		"title":       a.Title,
		"description": a.Description,
		"icon":        a.Icon,
		"points":      a.Points,
		"sort_order":  a.SortOrder,
	}
}

func dailyChallengeToMap(d postgres.DailyChallenge) map[string]any {
	return map[string]any{
		"challenge_date": database.PgDateString(d.ChallengeDate),
		"game_id":        d.GameID,
		"seed":           d.Seed,
		"config":         database.JSONBytesToAny(d.Config),
		"created_at":     database.PgTimestamptzRFC3339(d.CreatedAt),
	}
}

func matchHistoryToMap(r postgres.MatchHistoryRow) map[string]any {
	return map[string]any{
		"id":           database.PgUUIDString(r.ID),
		"match_id":     database.PgUUIDString(r.MatchID),
		"profile_id":   database.PgUUIDString(r.ProfileID),
		"display_name": r.DisplayName,
		"placement":    r.Placement,
		"score":        r.Score,
		"mmr_before":   database.PgInt4Int(r.MmrBefore),
		"mmr_after":    database.PgInt4Int(r.MmrAfter),
		"created_at":   database.PgTimestamptzRFC3339(r.CreatedAt),
		"match":        database.JSONBytesToAny(r.Match),
	}
}

func leaderboardGameToMap(r postgres.LeaderboardGameRow) map[string]any {
	return map[string]any{
		"rank":           r.Rank,
		"profile_id":     database.PgUUIDString(r.ProfileID),
		"display_name":   r.DisplayName,
		"avatar_seed":    r.AvatarSeed,
		"level":          database.PgInt4Int(r.Level),
		"mmr":            r.Mmr,
		"wins":           r.Wins,
		"losses":         r.Losses,
		"matches_played": r.MatchesPlayed,
	}
}

func leaderboardGlobalToMap(r postgres.LeaderboardGlobalRow) map[string]any {
	return map[string]any{
		"rank":         r.Rank,
		"profile_id":   database.PgUUIDString(r.ProfileID),
		"display_name": r.DisplayName,
		"avatar_seed":  r.AvatarSeed,
		"level":        database.PgInt4Int(r.Level),
		"xp":           r.Xp,
	}
}

func leaderboardRecentToMap(r postgres.LeaderboardRecentRow) map[string]any {
	return map[string]any{
		"rank":         r.Rank,
		"profile_id":   database.PgUUIDString(r.ProfileID),
		"display_name": r.DisplayName,
		"avatar_seed":  r.AvatarSeed,
		"level":        database.PgInt4Int(r.Level),
		"wins":         r.Wins,
	}
}
