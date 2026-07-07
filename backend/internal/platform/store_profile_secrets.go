package platform

import (
	"context"

	"algomoves/gameserver/internal/platform/arcadedb"
)

// OpenAIKeyStatus returns whether a key is configured and a display hint.
func (s *Store) OpenAIKeyStatus(ctx context.Context, profileID string) (OpenAIKeyIntegrationStatus, error) {
	key, ok, err := s.GetOpenAIKeyForProfile(ctx, profileID)
	if err != nil {
		return OpenAIKeyIntegrationStatus{}, err
	}
	if !ok || key == "" {
		return OpenAIKeyIntegrationStatus{Configured: false}, nil
	}
	return OpenAIKeyIntegrationStatus{
		Configured: true,
		Hint:       OpenAIKeyHint(key),
	}, nil
}

var errSecretsEncryptionUnavailable = &secretsEncryptionError{}

type secretsEncryptionError struct{}

func (e *secretsEncryptionError) Error() string {
	return "secret encryption not configured"
}

// IsSecretsEncryptionUnavailable reports store encryption misconfiguration.
func IsSecretsEncryptionUnavailable(err error) bool {
	_, ok := err.(*secretsEncryptionError)
	return ok
}

// OpenAIKeyIntegrationStatus is the safe public view of a user's OpenAI key.
type OpenAIKeyIntegrationStatus struct {
	Configured bool   `json:"configured"`
	Hint       string `json:"hint,omitempty"`
}

// GetOpenAIKeyForProfile decrypts the user's stored OpenAI API key.
func (s *Store) GetOpenAIKeyForProfile(ctx context.Context, profileID string) (string, bool, error) {
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return "", false, err
	}
	row, err := s.q.GetProfileOpenAIKeyEnc(ctx, uid)
	if isNoRows(err) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if row == nil || len(row) == 0 {
		return "", false, nil
	}
	plain, err := DecryptSecret(row)
	if err != nil {
		return "", false, err
	}
	return plain, true, nil
}

// SetOpenAIKeyForProfile encrypts and stores the key, or clears it when empty.
func (s *Store) SetOpenAIKeyForProfile(ctx context.Context, profileID, key string) error {
	if err := ValidateOpenAIAPIKey(key); err != nil {
		return err
	}
	uid, err := parseProfileUUID(profileID)
	if err != nil {
		return err
	}
	var enc []byte
	if key != "" {
		if !SecretsEncryptionConfigured() {
			return errSecretsEncryptionUnavailable
		}
		enc, err = EncryptSecret(key)
		if err != nil {
			return err
		}
	}
	return s.q.SetProfileOpenAIKey(ctx, arcadedb.SetProfileOpenAIKeyParams{
		OpenaiApiKeyEnc: enc,
		ID:              uid,
	})
}
