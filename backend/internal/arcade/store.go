package arcade

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store talks to Postgres for durable arcade data.
type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

type Profile struct {
	ID               string    `json:"id"`
	DisplayName      string    `json:"display_name"`
	AvatarSeed       string    `json:"avatar_seed"`
	PersonalRoomCode string    `json:"personal_room_code"`
	IsAnonymous      bool      `json:"is_anonymous"`
	XP               int       `json:"xp"`
	Level            int       `json:"level"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type GuestSession struct {
	ProfileID    string  `json:"profile_id"`
	SessionToken string  `json:"session_token"`
	Profile      Profile `json:"profile"`
}

func newSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func newPersonalRoomCode() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(b)), nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func scanProfile(row pgx.Row) (*Profile, error) {
	var p Profile
	err := row.Scan(
		&p.ID, &p.DisplayName, &p.AvatarSeed, &p.PersonalRoomCode,
		&p.IsAnonymous, &p.XP, &p.Level, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

const profileSelectCols = `
	id::text, display_name, avatar_seed, personal_room_code,
	is_anonymous, xp, level, created_at, updated_at`

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
		row := s.pool.QueryRow(ctx, `
			insert into public.profiles (session_token, is_anonymous, personal_room_code)
			values ($1, true, $2)
			returning `+profileSelectCols,
			token, code,
		)
		p, err := scanProfile(row)
		if err == nil {
			return &GuestSession{ProfileID: p.ID, SessionToken: token, Profile: *p}, nil
		}
		if isUniqueViolation(err) {
			continue
		}
		return nil, err
	}
	return nil, fmt.Errorf("could not allocate personal room code")
}

func (s *Store) ProfileByToken(ctx context.Context, token string) (*Profile, error) {
	row := s.pool.QueryRow(ctx, `
		select `+profileSelectCols+`
		from public.profiles where session_token = $1`, token)
	p, err := scanProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) ProfileByID(ctx context.Context, id string) (*Profile, error) {
	row := s.pool.QueryRow(ctx, `
		select `+profileSelectCols+`
		from public.profiles where id = $1`, id)
	p, err := scanProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) ProfilesByIDs(ctx context.Context, ids []string) ([]Profile, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := s.pool.Query(ctx, `
		select `+profileSelectCols+`
		from public.profiles where id = any($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Profile
	for rows.Next() {
		var p Profile
		if err := rows.Scan(
			&p.ID, &p.DisplayName, &p.AvatarSeed, &p.PersonalRoomCode,
			&p.IsAnonymous, &p.XP, &p.Level, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) UpdateProfile(ctx context.Context, id string, displayName, avatarSeed *string) (*Profile, error) {
	row := s.pool.QueryRow(ctx, `
		update public.profiles set
		  display_name = coalesce($2, display_name),
		  avatar_seed  = coalesce($3, avatar_seed)
		where id = $1
		returning `+profileSelectCols,
		id, displayName, avatarSeed,
	)
	p, err := scanProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Store) GameStats(ctx context.Context, profileID string) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		select profile_id, game_id, mmr, wins, losses, draws, streak, best_streak, matches_played, updated_at
		from public.game_stats where profile_id = $1`, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) MatchHistory(ctx context.Context, profileID string, limit int) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		select mp.*, row_to_json(m.*) as match
		from public.match_participants mp
		join public.matches m on m.id = mp.match_id
		where mp.profile_id = $1
		order by mp.created_at desc
		limit $2`, profileID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) SubmitMatchResult(ctx context.Context, game, room, mode string, participants json.RawMessage, metadata json.RawMessage) (json.RawMessage, error) {
	var out json.RawMessage
	err := s.pool.QueryRow(ctx,
		`select public.submit_match_result($1, $2, $3, $4::jsonb, $5::jsonb)`,
		game, room, mode, participants, metadata,
	).Scan(&out)
	return out, err
}

func (s *Store) LeaderboardGame(ctx context.Context, game string, limit int) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `select * from public.leaderboard_game($1, $2)`, game, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) LeaderboardGlobal(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `select * from public.leaderboard_global($1)`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) LeaderboardRecent(ctx context.Context, since time.Time, game *string, limit int) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `select * from public.leaderboard_recent($1, $2, $3)`, since, game, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) ListAchievements(ctx context.Context) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `select * from public.achievements order by sort_order`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) UnlockedAchievementIDs(ctx context.Context, profileID string) ([]string, error) {
	rows, err := s.pool.Query(ctx, `
		select achievement_id from public.profile_achievements where profile_id = $1`, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (s *Store) UnlockAchievement(ctx context.Context, profileID, achID string) error {
	_, err := s.pool.Exec(ctx, `select public.unlock_achievement($1, $2)`, profileID, achID)
	return err
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
	var hostPtr *string
	if hostID != "" {
		hostPtr = &hostID
	}
	var out map[string]any
	rows, err := s.pool.Query(ctx, `
		insert into public.rooms (code, host_profile_id, title, game_id, mode, capacity, is_public, last_active_at)
		values ($1, $2, nullif($3,''), nullif($4,''), $5, $6::int, $7, now())
		on conflict (code) do update set
		  host_profile_id = coalesce(excluded.host_profile_id, public.rooms.host_profile_id),
		  title = coalesce(excluded.title, public.rooms.title),
		  game_id = coalesce(excluded.game_id, public.rooms.game_id),
		  mode = coalesce(excluded.mode, public.rooms.mode),
		  capacity = coalesce(excluded.capacity, public.rooms.capacity),
		  is_public = coalesce(excluded.is_public, public.rooms.is_public),
		  last_active_at = now()
		returning *`, code, hostPtr, title, gameID, mode, int(capacity), isPublic)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list, err := scanRows(rows)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	out = list[0]
	return out, nil
}

func (s *Store) GetRoom(ctx context.Context, code string) (map[string]any, error) {
	rows, err := s.pool.Query(ctx, `select * from public.rooms where code = $1`, code)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list, err := scanRows(rows)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	return list[0], nil
}

func (s *Store) ListPublicRooms(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		select * from public.rooms where is_public = true
		order by last_active_at desc limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) TouchRoom(ctx context.Context, code string) error {
	_, err := s.pool.Exec(ctx, `update public.rooms set last_active_at = now() where code = $1`, code)
	return err
}

func (s *Store) ListFriends(ctx context.Context, profileID string) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		select * from public.friends where profile_id = $1 order by created_at desc`, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) AddFriend(ctx context.Context, profileID, friendID, status string) error {
	if profileID == friendID {
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		insert into public.friends (profile_id, friend_profile_id, status)
		values ($1, $2, $3)
		on conflict (profile_id, friend_profile_id) do update set status = excluded.status`,
		profileID, friendID, status)
	return err
}

func (s *Store) GetOrCreateDailyChallenge(ctx context.Context, date string) (map[string]any, error) {
	rows, err := s.pool.Query(ctx, `select * from public.get_or_create_daily_challenge($1::date)`, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list, err := scanRows(rows)
	if err != nil || len(list) == 0 {
		return nil, fmt.Errorf("daily challenge not found")
	}
	return list[0], nil
}

func (s *Store) SubmitDailyScore(ctx context.Context, profileID, date string, score int) error {
	_, err := s.pool.Exec(ctx, `select public.submit_daily_score($1::uuid, $2::date, $3)`, profileID, date, score)
	return err
}

// Canvas is a saved collaborative canvas document. Doc is opaque JSON.
type Canvas struct {
	ID             string          `json:"id"`
	OwnerProfileID *string         `json:"ownerProfileId"`
	RoomCode       *string         `json:"roomCode"`
	Title          string          `json:"title"`
	Doc            json.RawMessage `json:"doc"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

func canvasDoc(doc json.RawMessage) string {
	if len(doc) == 0 {
		return "{}"
	}
	return string(doc)
}

func (s *Store) CreateCanvas(ctx context.Context, ownerID, title string, doc json.RawMessage, roomCode *string) (string, time.Time, error) {
	var id string
	var updated time.Time
	err := s.pool.QueryRow(ctx, `
		insert into public.canvases (owner_profile_id, title, doc, room_code)
		values ($1, $2, $3::jsonb, $4)
		returning id, updated_at`, ownerID, title, canvasDoc(doc), roomCode).Scan(&id, &updated)
	return id, updated, err
}

func (s *Store) GetCanvas(ctx context.Context, id string) (*Canvas, error) {
	var c Canvas
	err := s.pool.QueryRow(ctx, `
		select id, owner_profile_id, room_code, title, doc, updated_at
		from public.canvases where id = $1`, id).
		Scan(&c.ID, &c.OwnerProfileID, &c.RoomCode, &c.Title, &c.Doc, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// UpdateCanvas writes doc (and optionally title/room_code) for an owner-held
// canvas. The bool is false when the id is missing or not owned by ownerID.
func (s *Store) UpdateCanvas(ctx context.Context, id, ownerID string, doc json.RawMessage, title, roomCode *string) (time.Time, bool, error) {
	var updated time.Time
	err := s.pool.QueryRow(ctx, `
		update public.canvases
		set doc = $3::jsonb,
		    title = coalesce($4, title),
		    room_code = coalesce($5, room_code),
		    updated_at = now()
		where id = $1 and owner_profile_id = $2
		returning updated_at`, id, ownerID, canvasDoc(doc), title, roomCode).Scan(&updated)
	if errors.Is(err, pgx.ErrNoRows) {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, err
	}
	return updated, true, nil
}

func (s *Store) ListCanvases(ctx context.Context, ownerID string) ([]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `
		select id, title, room_code, updated_at
		from public.canvases where owner_profile_id = $1
		order by updated_at desc limit 100`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanRows(rows)
}

func (s *Store) DeleteCanvas(ctx context.Context, id, ownerID string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `delete from public.canvases where id = $1 and owner_profile_id = $2`, id, ownerID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func scanRows(rows pgx.Rows) ([]map[string]any, error) {
	descs := rows.FieldDescriptions()
	var out []map[string]any
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		row := make(map[string]any, len(descs))
		for i, d := range descs {
			row[string(d.Name)] = jsonVal(vals[i])
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func jsonVal(v any) any {
	switch x := v.(type) {
	case nil:
		return nil
	case pgtype.UUID:
		if !x.Valid {
			return nil
		}
		return x.String()
	case [16]byte:
		var u pgtype.UUID
		copy(u.Bytes[:], x[:])
		u.Valid = true
		return u.String()
	case []byte:
		if len(x) > 0 && (x[0] == '{' || x[0] == '[') {
			var out any
			if json.Unmarshal(x, &out) == nil {
				return normalizeJSON(out)
			}
		}
		return string(x)
	case map[string]any:
		return normalizeJSON(x)
	case time.Time:
		return x.UTC().Format(time.RFC3339Nano)
	case int64:
		return x
	case int32:
		return int(x)
	case fmt.Stringer:
		return x.String()
	default:
		return v
	}
}

func normalizeJSON(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, val := range x {
			out[k] = normalizeJSON(val)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, val := range x {
			out[i] = normalizeJSON(val)
		}
		return out
	case string:
		return x
	case float64:
		// JSON numbers from Postgres json often decode as float64.
		if x == float64(int64(x)) {
			return int64(x)
		}
		return x
	default:
		return v
	}
}
