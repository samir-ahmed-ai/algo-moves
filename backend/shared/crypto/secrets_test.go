package crypto

import (
	"encoding/base64"
	"testing"
)

func TestEncryptDecryptSecretRoundTrip(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i + 1)
	}
	t.Setenv("SECRETS_ENCRYPTION_KEY", base64.StdEncoding.EncodeToString(key))

	plain := "sk-test-key-abcdefghijklmnopqrstuvwxyz"
	enc, err := EncryptSecret(plain)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	got, err := DecryptSecret(enc)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}
	if got != plain {
		t.Fatalf("round trip = %q, want %q", got, plain)
	}
}

func TestValidateOpenAIAPIKey(t *testing.T) {
	if err := ValidateOpenAIAPIKey(""); err != nil {
		t.Fatalf("empty should be allowed: %v", err)
	}
	if err := ValidateOpenAIAPIKey("sk-" + string(make([]byte, 20))); err != nil {
		t.Fatalf("valid key rejected: %v", err)
	}
	if err := ValidateOpenAIAPIKey("bad-key"); err == nil {
		t.Fatal("expected prefix error")
	}
}

func TestOpenAIKeyHint(t *testing.T) {
	if OpenAIKeyHint("sk-abcdef1234") != "1234" {
		t.Fatalf("hint = %q", OpenAIKeyHint("sk-abcdef1234"))
	}
}
