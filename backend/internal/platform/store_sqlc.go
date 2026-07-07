package platform

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"algomoves/gameserver/internal/platform/arcadedb"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func profileFromIDRow(row arcadedb.GetProfileByIDRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromTokenRow(row arcadedb.GetProfileByTokenRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromUpdateRow(row arcadedb.UpdateProfileRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromRotateRow(row arcadedb.RotateSessionTokenRow) Profile {
	return profileFromCommon(
		row.ID, row.DisplayName, row.AvatarSeed, row.PersonalRoomCode, row.Email,
		row.IsAdmin, row.IsAnonymous, row.Xp, row.Level, row.CreatedAt, row.UpdatedAt,
	)
}

func profileFromListRow(row arcadedb.ListProfilesByIDsRow) Profile {
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

func parseProfileUUID(id string) (pgtype.UUID, error) {
	return parseUUID(id)
}

func parseProfileUUIDs(ids []string) ([]pgtype.UUID, error) {
	out := make([]pgtype.UUID, len(ids))
	for i, id := range ids {
		uid, err := parseProfileUUID(id)
		if err != nil {
			return nil, err
		}
		out[i] = uid
	}
	return out, nil
}

func optionalText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func isNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func (s *Store) ProfileByToken(ctx context.Context, token string) (*Profile, error) {
	row, err := s.q.GetProfileByToken(ctx, pgtype.Text{String: token, Valid: true})
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p := profileFromTokenRow(row)
	return &p, nil
}

func (s *Store) ProfileByID(ctx context.Context, id string) (*Profile, error) {
	uid, err := parseProfileUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := s.q.GetProfileByID(ctx, uid)
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p := profileFromIDRow(row)
	return &p, nil
}

func (s *Store) ProfilesByIDs(ctx context.Context, ids []string) ([]Profile, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	uuids, err := parseProfileUUIDs(ids)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListProfilesByIDs(ctx, uuids)
	if err != nil {
		return nil, err
	}
	out := make([]Profile, len(rows))
	for i, row := range rows {
		out[i] = profileFromListRow(row)
	}
	return out, nil
}

func (s *Store) UpdateProfile(ctx context.Context, id string, displayName, avatarSeed *string) (*Profile, error) {
	uid, err := parseProfileUUID(id)
	if err != nil {
		return nil, err
	}
	row, err := s.q.UpdateProfile(ctx, arcadedb.UpdateProfileParams{
		ID:          uid,
		DisplayName: optionalText(displayName),
		AvatarSeed:  optionalText(avatarSeed),
	})
	if isNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p := profileFromUpdateRow(row)
	return &p, nil
}

func (s *Store) ProfileByEmail(ctx context.Context, email string) (*Profile, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	row, err := s.q.GetProfileByEmail(ctx, email)
	if isNoRows(err) {
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

func (s *Store) RotateSessionToken(ctx context.Context, profileID string) (string, *Profile, error) {
	token, err := newSessionToken()
	if err != nil {
		return "", nil, err
	}
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return "", nil, err
	}
	row, err := s.q.RotateSessionToken(ctx, arcadedb.RotateSessionTokenParams{
		ID:           uid,
		SessionToken: pgtype.Text{String: token, Valid: true},
	})
	if isNoRows(err) {
		return "", nil, nil
	}
	if err != nil {
		return "", nil, err
	}
	p := profileFromRotateRow(row)
	return token, &p, nil
}

func (s *Store) SetAdmin(ctx context.Context, email string) (bool, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return false, nil
	}
	n, err := s.q.SetAdminByEmail(ctx, email)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (s *Store) UpdatePasswordHash(ctx context.Context, email, passwordHash string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	n, err := s.q.UpdatePasswordHashByEmail(ctx, arcadedb.UpdatePasswordHashByEmailParams{
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
