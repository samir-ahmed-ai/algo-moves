package content

import (
	"testing"
)

func TestNewRepository(t *testing.T) {
	repo := NewRepository(nil)
	if repo == nil {
		t.Errorf("expected non-nil repository")
	}
}
