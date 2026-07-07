package platform

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"algomoves/gameserver/internal/platform/arcadedb"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Store) CreateGuest(ctx context.Context) (*GuestSession, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, err
	}
	const maxAttempts = 8
	for attempt := 0; attempt < maxAttempts; attempt++ {
		code, err := newPersonalRoomCode()
		if err != nil {
			return nil, err
		}
		row, err := s.q.CreateGuestProfile(ctx, arcadedb.CreateGuestProfileParams{
			SessionToken:     pgtype.Text{String: token, Valid: true},
			PersonalRoomCode: pgtype.Text{String: code, Valid: true},
		})
		if err == nil {
			p := profileFromCreateGuestRow(row)
			return &GuestSession{ProfileID: p.ID, SessionToken: token, Profile: p}, nil
		}
		if isUniqueViolation(err) {
			continue
		}
		return nil, err
	}
	return nil, fmt.Errorf("could not allocate personal room code")
}

func (s *Store) CreateEmailUser(ctx context.Context, email, passwordHash, displayName string) (*GuestSession, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, err
	}
	email = strings.TrimSpace(strings.ToLower(email))
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}
	const maxAttempts = 8
	for attempt := 0; attempt < maxAttempts; attempt++ {
		code, err := newPersonalRoomCode()
		if err != nil {
			return nil, err
		}
		row, err := s.q.CreateEmailProfile(ctx, arcadedb.CreateEmailProfileParams{
			SessionToken:     pgtype.Text{String: token, Valid: true},
			PersonalRoomCode: pgtype.Text{String: code, Valid: true},
			Email:            pgtype.Text{String: email, Valid: true},
			PasswordHash:     pgtype.Text{String: passwordHash, Valid: true},
			DisplayName:      displayName,
		})
		if err == nil {
			p := profileFromCreateEmailRow(row)
			return &GuestSession{ProfileID: p.ID, SessionToken: token, Profile: p}, nil
		}
		if isUniqueViolation(err) {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && strings.Contains(pgErr.ConstraintName, "email") {
				return nil, fmt.Errorf("email already registered")
			}
			continue
		}
		return nil, err
	}
	return nil, fmt.Errorf("could not allocate personal room code")
}

func (s *Store) GameStats(ctx context.Context, profileID string) ([]map[string]any, error) {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.GameStatsByProfile(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = gameStatToMap(row)
	}
	return out, nil
}

func (s *Store) MatchHistory(ctx context.Context, profileID string, limit int) ([]map[string]any, error) {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.MatchHistory(ctx, arcadedb.MatchHistoryParams{
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

func (s *Store) SubmitMatchResult(ctx context.Context, game, room, mode string, participants json.RawMessage, metadata json.RawMessage) (json.RawMessage, error) {
	if len(metadata) == 0 {
		metadata = json.RawMessage("{}")
	}
	out, err := s.q.SubmitMatchResult(ctx, arcadedb.SubmitMatchResultParams{
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

func (s *Store) LeaderboardGame(ctx context.Context, game string, limit int) ([]map[string]any, error) {
	rows, err := s.q.LeaderboardGame(ctx, arcadedb.LeaderboardGameParams{
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

func (s *Store) LeaderboardGlobal(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := s.q.LeaderboardGlobal(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = leaderboardGlobalToMap(row)
	}
	return out, nil
}

func (s *Store) LeaderboardRecent(ctx context.Context, since time.Time, game *string, limit int) ([]map[string]any, error) {
	var gameArg pgtype.Text
	if game != nil {
		gameArg = pgtype.Text{String: *game, Valid: true}
	}
	rows, err := s.q.LeaderboardRecent(ctx, arcadedb.LeaderboardRecentParams{
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

func (s *Store) ListAchievements(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.q.ListAchievements(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = achievementToMap(row)
	}
	return out, nil
}

func (s *Store) UnlockedAchievementIDs(ctx context.Context, profileID string) ([]string, error) {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return nil, err
	}
	return s.q.UnlockedAchievementIDs(ctx, uid)
}

func (s *Store) UnlockAchievement(ctx context.Context, profileID, achID string) error {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return err
	}
	return s.q.UnlockAchievement(ctx, arcadedb.UnlockAchievementParams{
		ProfileID:     uid,
		AchievementID: achID,
	})
}

func (s *Store) UpsertRoom(ctx context.Context, row map[string]any) (map[string]any, error) {
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
		uid, err := parseProfileUUID(hostID)
		if err != nil {
			return nil, err
		}
		hostPtr = uid
	}
	room, err := s.q.UpsertRoom(ctx, arcadedb.UpsertRoomParams{
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

func (s *Store) GetRoom(ctx context.Context, code string) (map[string]any, error) {
	room, err := s.q.GetRoom(ctx, code)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out := roomToMap(room)
	return out, nil
}

func (s *Store) ListPublicRooms(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := s.q.ListPublicRooms(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = roomToMap(row)
	}
	return out, nil
}

func (s *Store) TouchRoom(ctx context.Context, code string) error {
	return s.q.TouchRoom(ctx, code)
}

func (s *Store) ListFriends(ctx context.Context, profileID string) ([]map[string]any, error) {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListFriends(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = friendToMap(row)
	}
	return out, nil
}

func (s *Store) AddFriend(ctx context.Context, profileID, friendID, status string) error {
	if profileID == friendID {
		return nil
	}
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return err
	}
	fid, err := parseProfileUUID(friendID)
	if err != nil {
		return err
	}
	return s.q.AddFriend(ctx, arcadedb.AddFriendParams{
		ProfileID:       uid,
		FriendProfileID: fid,
		Status:          status,
	})
}

func (s *Store) GetOrCreateDailyChallenge(ctx context.Context, date string) (map[string]any, error) {
	var d pgtype.Date
	if err := d.Scan(date); err != nil {
		return nil, err
	}
	row, err := s.q.GetOrCreateDailyChallenge(ctx, d)
	if err != nil {
		return nil, err
	}
	return dailyChallengeToMap(row), nil
}

func (s *Store) SubmitDailyScore(ctx context.Context, profileID, date string, score int) error {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return err
	}
	var d pgtype.Date
	if err := d.Scan(date); err != nil {
		return err
	}
	return s.q.SubmitDailyScore(ctx, arcadedb.SubmitDailyScoreParams{
		ProfileID:     uid,
		ChallengeDate: d,
		Score:         int32(score),
	})
}

func canvasDocBytes(doc json.RawMessage) []byte {
	if len(doc) == 0 {
		return []byte("{}")
	}
	return []byte(doc)
}

func (s *Store) CreateCanvas(ctx context.Context, ownerID, title string, doc json.RawMessage, roomCode *string) (string, time.Time, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return "", time.Time{}, err
	}
	row, err := s.q.CreateCanvas(ctx, arcadedb.CreateCanvasParams{
		OwnerProfileID: uid,
		Title:          title,
		Doc:            canvasDocBytes(doc),
		RoomCode:       optionalText(roomCode),
	})
	if err != nil {
		return "", time.Time{}, err
	}
	return row.ID, pgTimestamptzTime(row.UpdatedAt), nil
}

func (s *Store) GetCanvas(ctx context.Context, id string) (*Canvas, error) {
	canvasID, err := parseCanvasUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := s.q.GetCanvas(ctx, canvasID)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return canvasFromRow(row)
}

func canvasFromRow(row arcadedb.GetCanvasRow) (*Canvas, error) {
	c := Canvas{
		ID:        row.ID,
		Title:     row.Title,
		Doc:       json.RawMessage(row.Doc),
		UpdatedAt: pgTimestamptzTime(row.UpdatedAt),
	}
	if row.OwnerProfileID.Valid {
		s := row.OwnerProfileID.String()
		c.OwnerProfileID = &s
	}
	if row.RoomCode.Valid {
		s := row.RoomCode.String
		c.RoomCode = &s
	}
	return &c, nil
}

func (s *Store) UpdateCanvas(ctx context.Context, id, ownerID string, doc json.RawMessage, title, roomCode *string) (time.Time, bool, error) {
	canvasID, err := parseCanvasUUID(id)
	if err != nil {
		return time.Time{}, false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return time.Time{}, false, err
	}
	updated, err := s.q.UpdateCanvas(ctx, arcadedb.UpdateCanvasParams{
		Doc:            canvasDocBytes(doc),
		Title:          optionalText(title),
		RoomCode:       optionalText(roomCode),
		ID:             canvasID,
		OwnerProfileID: ownerUUID,
	})
	if isNoRows(err) {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, err
	}
	return pgTimestamptzTime(updated), true, nil
}

func (s *Store) ListCanvases(ctx context.Context, ownerID string) ([]map[string]any, error) {
	uid, err := parseProfileUUID(ownerID)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListCanvases(ctx, uid)
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, len(rows))
	for i, row := range rows {
		out[i] = listCanvasToMap(row)
	}
	return out, nil
}

func (s *Store) DeleteCanvas(ctx context.Context, id, ownerID string) (bool, error) {
	canvasID, err := parseCanvasUUID(id)
	if err != nil {
		return false, err
	}
	ownerUUID, err := parseProfileUUID(ownerID)
	if err != nil {
		return false, err
	}
	n, err := s.q.DeleteCanvas(ctx, arcadedb.DeleteCanvasParams{
		ID:             canvasID,
		OwnerProfileID: ownerUUID,
	})
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
