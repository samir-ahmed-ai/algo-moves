package platform

import (
	"context"
	"encoding/json"
	"fmt"
)

// GetProfileSettings returns the raw settings JSON blob for a profile.
// Returns an empty object if no settings are stored.
func (s *Store) GetProfileSettings(ctx context.Context, profileID string) (json.RawMessage, error) {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return nil, err
	}
	var raw []byte
	err = s.pool.QueryRow(ctx,
		`select coalesce(settings, '{}'::jsonb) from public.profiles where id = $1`,
		uid,
	).Scan(&raw)
	if isNoRows(err) {
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
func (s *Store) SetProfileSettings(ctx context.Context, profileID string, settings json.RawMessage) error {
	if len(settings) == 0 {
		settings = json.RawMessage("{}")
	}
	// Validate it is a JSON object
	var obj map[string]any
	if err := json.Unmarshal(settings, &obj); err != nil {
		return fmt.Errorf("settings must be a JSON object: %w", err)
	}
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`update public.profiles set settings = $1::jsonb, updated_at = now() where id = $2`,
		[]byte(settings),
		uid,
	)
	if err != nil {
		return fmt.Errorf("set profile settings: %w", err)
	}
	return nil
}
