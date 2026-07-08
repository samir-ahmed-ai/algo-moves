package profile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"algomoves.dev/shared/crypto"
	"algomoves/gameserver/internal/database"
	"algomoves/gameserver/internal/database/postgres"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// Profile is a user profile row.
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
	SessionToken string  `json:"-"`
	Profile      Profile `json:"profile"`
}

type OpenAIKeyIntegrationStatus struct {
	Configured bool   `json:"configured"`
	Hint       string `json:"hint,omitempty"`
}

type Repository struct{ db *database.DB }

func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

var errSecretsEncryptionUnavailable = &secretsEncryptionError{}

type secretsEncryptionError struct{}

func (e *secretsEncryptionError) Error() string {
	return "secret encryption not configured"
}

func IsSecretsEncryptionUnavailable(err error) bool {
	_, ok := err.(*secretsEncryptionError)
	return ok
}

func (r *Repository) CreateGuest(ctx context.Context) (*GuestSession, error) {
	token, err := database.NewSessionToken()
	if err != nil {
		return nil, err
	}
	const maxAttempts = 8
	for attempt := 0; attempt < maxAttempts; attempt++ {
		code, err := database.NewPersonalRoomCode()
		if err != nil {
			return nil, err
		}
		row, err := r.db.Q.CreateGuestProfile(ctx, postgres.CreateGuestProfileParams{
			SessionToken:     pgtype.Text{String: token, Valid: true},
			PersonalRoomCode: pgtype.Text{String: code, Valid: true},
		})
		if err == nil {
			p := profileFromCreateGuestRow(row)
			return &GuestSession{ProfileID: p.ID, SessionToken: token, Profile: p}, nil
		}
		if database.IsUniqueViolation(err) {
			continue
		}
		return nil, err
	}
	return nil, fmt.Errorf("could not allocate personal room code")
}

func (r *Repository) CreateEmailUser(ctx context.Context, email, passwordHash, displayName string) (*GuestSession, error) {
	token, err := database.NewSessionToken()
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
		code, err := database.NewPersonalRoomCode()
		if err != nil {
			return nil, err
		}
		row, err := r.db.Q.CreateEmailProfile(ctx, postgres.CreateEmailProfileParams{
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
		if database.IsUniqueViolation(err) {
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

func profileFromIDRow(row postgres.GetProfileByIDRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromTokenRow(row postgres.GetProfileByTokenRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromUpdateRow(row postgres.UpdateProfileRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromRotateRow(row postgres.RotateSessionTokenRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromListRow(row postgres.ListProfilesByIDsRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromCommon(
	id, displayName, avatarSeed string,
	personalRoomCode, email pgtype.Text,
	isAdmin, isAnonymous bool,
	xp int32,
	level pgtype.Int4,
	createdAt, updatedAt pgtype.Timestamptz,
) Profile {
	p := Profile{
		ID:          id,
		DisplayName: displayName,
		AvatarSeed:  avatarSeed,
		IsAdmin:     isAdmin,
		IsAnonymous: isAnonymous,
		XP:          int(xp),
	}
	if personalRoomCode.Valid {
		p.PersonalRoomCode = personalRoomCode.String
	}
	if email.Valid {
		p.Email = email.String
	}
	if level.Valid {
		p.Level = int(level.Int32)
	}
	if createdAt.Valid {
		p.CreatedAt = createdAt.Time
	}
	if updatedAt.Valid {
		p.UpdatedAt = updatedAt.Time
	}
	return p
}

func (r *Repository) ProfileByToken(ctx context.Context, token string) (*Profile, error) {
	row, err := r.db.Q.GetProfileByToken(ctx, pgtype.Text{String: token, Valid: true})
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p := profileFromTokenRow(row)
	return &p, nil
}

func (r *Repository) ProfileByID(ctx context.Context, id string) (*Profile, error) {
	uid, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.GetProfileByID(ctx, uid)
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p := profileFromIDRow(row)
	return &p, nil
}

func (r *Repository) ProfilesByIDs(ctx context.Context, ids []string) ([]Profile, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	uuids, err := database.ParseUUIDs(ids)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.Q.ListProfilesByIDs(ctx, uuids)
	if err != nil {
		return nil, err
	}
	out := make([]Profile, len(rows))
	for i, row := range rows {
		out[i] = profileFromListRow(row)
	}
	return out, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id string, displayName, avatarSeed *string) (*Profile, error) {
	uid, err := database.ParseUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := r.db.Q.UpdateProfile(ctx, postgres.UpdateProfileParams{
		ID:          uid,
		DisplayName: database.OptionalText(displayName),
		AvatarSeed:  database.OptionalText(avatarSeed),
	})
	if database.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p := profileFromUpdateRow(row)
	return &p, nil
}

func (r *Repository) ProfileByEmail(ctx context.Context, email string) (*Profile, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	row, err := r.db.Q.GetProfileByEmail(ctx, email)
	if database.IsNoRows(err) {
		return nil, "", nil
	}
	if err != nil {
		return nil, "", err
	}
	p := profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
	passwordHash := ""
	if row.PasswordHash.Valid {
		passwordHash = row.PasswordHash.String
	}
	return &p, passwordHash, nil
}

func (r *Repository) RotateSessionToken(ctx context.Context, profileID string) (string, *Profile, error) {
	token, err := database.NewSessionToken()
	if err != nil {
		return "", nil, err
	}
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return "", nil, err
	}
	row, err := r.db.Q.RotateSessionToken(ctx, postgres.RotateSessionTokenParams{
		ID:           uid,
		SessionToken: pgtype.Text{String: token, Valid: true},
	})
	if database.IsNoRows(err) {
		return "", nil, nil
	}
	if err != nil {
		return "", nil, err
	}
	p := profileFromRotateRow(row)
	return token, &p, nil
}

func (r *Repository) SetAdmin(ctx context.Context, email string) (bool, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return false, nil
	}
	n, err := r.db.Q.SetAdminByEmail(ctx, email)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (r *Repository) UpdatePasswordHash(ctx context.Context, email, passwordHash string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	n, err := r.db.Q.UpdatePasswordHashByEmail(ctx, postgres.UpdatePasswordHashByEmailParams{
		Email:        email,
		PasswordHash: pgtype.Text{String: passwordHash, Valid: true},
	})
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("profile not found for %s", email)
	}
	return nil
}

func profileFromCreateGuestRow(row postgres.CreateGuestProfileRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromCreateEmailRow(row postgres.CreateEmailProfileRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

// GetProfileSettings returns the raw settings JSON blob for a profile.
// Returns an empty object if no settings are stored.

func (r *Repository) GetProfileSettings(ctx context.Context, profileID string) (json.RawMessage, error) {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return nil, err
	}
	var raw []byte
	err = r.db.Pool().QueryRow(ctx,
		`select coalesce(settings, '{}'::jsonb) from public.profiles where id = $1`,
		uid,
	).Scan(&raw)
	if database.IsNoRows(err) {
		return json.RawMessage("{}"), nil
	}
	if err != nil {
		return nil, fmt.Errorf("get profile settings: %w", err)
	}
	if len(raw) == 0 {
		return json.RawMessage("{}"), nil
	}
	return json.RawMessage(raw), nil
}

// SetProfileSettings replaces the settings blob for a profile.
// settings must be a valid JSON object.

func (r *Repository) SetProfileSettings(ctx context.Context, profileID string, settings json.RawMessage) error {
	if len(settings) == 0 {
		settings = json.RawMessage("{}")
	}
	// Validate it is a JSON object
	var obj map[string]any
	if err := json.Unmarshal(settings, &obj); err != nil {
		return fmt.Errorf("settings must be a JSON object: %w", err)
	}
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return err
	}
	_, err = r.db.Pool().Exec(ctx,
		`update public.profiles set settings = $1::jsonb, updated_at = now() where id = $2`,
		[]byte(settings),
		uid,
	)
	if err != nil {
		return fmt.Errorf("set profile settings: %w", err)
	}
	return nil
}

// OpenAIKeyStatus returns whether a key is configured and a display hint.

func (r *Repository) OpenAIKeyStatus(ctx context.Context, profileID string) (OpenAIKeyIntegrationStatus, error) {
	key, ok, err := r.GetOpenAIKeyForProfile(ctx, profileID)
	if err != nil {
		return OpenAIKeyIntegrationStatus{}, err
	}
	if !ok || key == "" {
		return OpenAIKeyIntegrationStatus{Configured: false}, nil
	}
	return OpenAIKeyIntegrationStatus{
		Configured: true,
		Hint:       crypto.OpenAIKeyHint(key),
	}, nil
}

func (r *Repository) GetOpenAIKeyForProfile(ctx context.Context, profileID string) (string, bool, error) {
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return "", false, err
	}
	row, err := r.db.Q.GetProfileOpenAIKeyEnc(ctx, uid)
	if database.IsNoRows(err) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if row == nil || len(row) == 0 {
		return "", false, nil
	}
	plain, err := crypto.DecryptSecret(row)
	if err != nil {
		return "", false, err
	}
	return plain, true, nil
}

// SetOpenAIKeyForProfile encrypts and stores the key, or clears it when empty.

func (r *Repository) SetOpenAIKeyForProfile(ctx context.Context, profileID, key string) error {
	if err := crypto.ValidateOpenAIAPIKey(key); err != nil {
		return err
	}
	uid, err := database.ParseUUID(profileID)
	if err != nil {
		return err
	}
	var enc []byte
	if key != "" {
		if !crypto.SecretsEncryptionConfigured() {
			return errSecretsEncryptionUnavailable
		}
		enc, err = crypto.EncryptSecret(key)
		if err != nil {
			return err
		}
	}
	return r.db.Q.SetProfileOpenAIKey(ctx, postgres.SetProfileOpenAIKeyParams{
		OpenaiApiKeyEnc: enc,
		ID:              uid,
	})
}
