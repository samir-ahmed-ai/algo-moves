package openai

import (
	"testing"
)

func TestNewClient(t *testing.T) {
	c := NewClient()
	if c == nil {
		t.Errorf("expected non-nil client")
	}
}
