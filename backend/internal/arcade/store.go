package arcade

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"algomoves/gameserver/internal/arcade/arcadedb"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store talks to Postgres for durable arcade data.
type Store struct {
	pool *pgxpool.Pool
	q    *arcadedb.Queries
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool, q: arcadedb.New(pool)}
}

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

type Profile struct {
	ID               string    `json:"id"`
	DisplayName      string    `json:"display_name"`
	AvatarSeed       string    `json:"avatar_seed"`
	PersonalRoomCode string    `json:"personal_room_code"`
	Email            string    `json:"email,omitempty"`
	IsAdmin          bool      `json:"is_admin"`
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

// Canvas is a saved collaborative canvas document. Doc is opaque JSON.
type Canvas struct {
	ID             string          `json:"id"`
	OwnerProfileID *string         `json:"ownerProfileId"`
	RoomCode       *string         `json:"roomCode"`
	Title          string          `json:"title"`
	Doc            json.RawMessage `json:"doc"`
	UpdatedAt      time.Time       `json:"updatedAt"`
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
		if x == float64(int64(x)) {
			return int64(x)
		}
		return x
	default:
		return v
	}
}

func parseUUID(id string) (pgtype.UUID, error) {
	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return uid, fmt.Errorf("invalid uuid: %w", err)
	}
	return uid, nil
}

func parseCanvasUUID(id string) (pgtype.UUID, error) {
	return parseUUID(id)
}
