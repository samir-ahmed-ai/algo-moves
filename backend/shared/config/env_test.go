package config

import "testing"

func TestEnabled(t *testing.T) {
	t.Setenv("TEST_ENV_FLAG", "true")
	if !Enabled("TEST_ENV_FLAG") {
		t.Fatal("expected true")
	}
	t.Setenv("TEST_ENV_FLAG", "1")
	if !Enabled("TEST_ENV_FLAG") {
		t.Fatal("expected 1")
	}
	t.Setenv("TEST_ENV_FLAG", "false")
	if Enabled("TEST_ENV_FLAG") {
		t.Fatal("expected false for false")
	}
	t.Setenv("TEST_ENV_FLAG", "")
	if Enabled("TEST_ENV_FLAG") {
		t.Fatal("expected false for empty")
	}
}
