package platform

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
)

var (
	secretsKeyOnce sync.Once
	secretsKey     []byte
	secretsKeyErr  error
)

func loadSecretsKey() ([]byte, error) {
	secretsKeyOnce.Do(func() {
		raw := strings.TrimSpace(os.Getenv("SECRETS_ENCRYPTION_KEY"))
		if raw == "" {
			secretsKeyErr = errors.New("SECRETS_ENCRYPTION_KEY not configured")
			return
		}
		key, err := base64.StdEncoding.DecodeString(raw)
		if err != nil {
			secretsKeyErr = fmt.Errorf("SECRETS_ENCRYPTION_KEY: invalid base64: %w", err)
			return
		}
		if len(key) != 32 {
			secretsKeyErr = fmt.Errorf("SECRETS_ENCRYPTION_KEY must decode to 32 bytes, got %d", len(key))
			return
		}
		secretsKey = key
	})
	return secretsKey, secretsKeyErr
}

// SecretsEncryptionConfigured reports whether per-user secret storage is available.
func SecretsEncryptionConfigured() bool {
	_, err := loadSecretsKey()
	return err == nil
}

// EncryptSecret encrypts plaintext with AES-256-GCM. Output is nonce || ciphertext+tag.
func EncryptSecret(plaintext string) ([]byte, error) {
	key, err := loadSecretsKey()
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	out := make([]byte, 0, len(nonce)+len(plaintext)+gcm.Overhead())
	out = append(out, nonce...)
	out = gcm.Seal(out, nonce, []byte(plaintext), nil)
	return out, nil
}

// DecryptSecret decrypts a value produced by EncryptSecret.
func DecryptSecret(ciphertext []byte) (string, error) {
	key, err := loadSecretsKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, enc := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plain, err := gcm.Open(nil, nonce, enc, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// OpenAIKeyHint returns a safe suffix for display (last 4 runes).
func OpenAIKeyHint(key string) string {
	key = strings.TrimSpace(key)
	if len(key) <= 4 {
		return key
	}
	return key[len(key)-4:]
}

// ValidateOpenAIAPIKey performs basic format checks before storage.
func ValidateOpenAIAPIKey(key string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil
	}
	if !strings.HasPrefix(key, "sk-") {
		return errors.New("OpenAI API key must start with sk-")
	}
	if len(key) < 20 || len(key) > 200 {
		return errors.New("OpenAI API key length invalid")
	}
	return nil
}
