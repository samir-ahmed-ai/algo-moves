package database

import (
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
)

// NewSessionToken mints a random hex session token.
func NewSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// NewPersonalRoomCode mints a short uppercase room code.
func NewPersonalRoomCode() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return strings.ToUpper(hex.EncodeToString(b)), nil
}

// IsUniqueViolation reports Postgres unique constraint violations.
func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// NormalizeJSON coerces JSON numbers to int64 where exact.
func NormalizeJSON(v any) any {
	switch x := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, val := range x {
			out[k] = NormalizeJSON(val)
		}
		return out
	case []any:
		out := make([]any, len(x))
		for i, val := range x {
			out[i] = NormalizeJSON(val)
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

// ParseUUID parses a string into pgtype.UUID.
func ParseUUID(id string) (pgtype.UUID, error) {
	var uid pgtype.UUID
	if err := uid.Scan(id); err != nil {
		return uid, fmt.Errorf("invalid uuid: %w", err)
	}
	return uid, nil
}

// ParseUUIDs parses a slice of UUID strings.
func ParseUUIDs(ids []string) ([]pgtype.UUID, error) {
	out := make([]pgtype.UUID, len(ids))
	for i, id := range ids {
		uid, err := ParseUUID(id)
		if err != nil {
			return nil, err
		}
		out[i] = uid
	}
	return out, nil
}

// OptionalText converts an optional string pointer to pgtype.Text.
func OptionalText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// IsNoRows reports pgx.ErrNoRows.
func IsNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

// JSONBytesToAny unmarshals JSON bytes to any with normalization.
func JSONBytesToAny(b []byte) any {
	if len(b) == 0 {
		return nil
	}
	var out any
	if json.Unmarshal(b, &out) == nil {
		return NormalizeJSON(out)
	}
	return string(b)
}

// PgUUIDString returns the string form of a pgtype.UUID.
func PgUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return u.String()
}

// PgTextString returns the string form of pgtype.Text.
func PgTextString(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

// PgInt4Int returns int from pgtype.Int4.
func PgInt4Int(i pgtype.Int4) int {
	if !i.Valid {
		return 0
	}
	return int(i.Int32)
}

// PgTimestamptzTime returns time from pgtype.Timestamptz.
func PgTimestamptzTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

// PgTimestamptzRFC3339 formats a timestamptz as RFC3339Nano UTC.
func PgTimestamptzRFC3339(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.UTC().Format(time.RFC3339Nano)
}

// PgDateString formats a pgtype.Date as YYYY-MM-DD.
func PgDateString(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}
