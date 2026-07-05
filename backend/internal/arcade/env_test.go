package arcade

import "testing"

func TestEnvEnabled(t *testing.T) {
	t.Setenv("TEST_ENV_FLAG", "true")
	if !envEnabled("TEST_ENV_FLAG") {
		t.Fatal("expected true")
	}
	t.Setenv("TEST_ENV_FLAG", "1")
	if !envEnabled("TEST_ENV_FLAG") {
		t.Fatal("expected 1")
	}
	t.Setenv("TEST_ENV_FLAG", "false")
	if envEnabled("TEST_ENV_FLAG") {
		t.Fatal("expected false for false")
	}
	t.Setenv("TEST_ENV_FLAG", "")
	if envEnabled("TEST_ENV_FLAG") {
		t.Fatal("expected false for empty")
	}
}
