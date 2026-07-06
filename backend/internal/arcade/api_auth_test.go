package arcade

import "testing"

func TestValidEmail(t *testing.T) {
	tests := []struct {
		email string
		ok    bool
	}{
		{"you@example.com", true},
		{"  YOU@Example.COM  ", true},
		{"bad", false},
		{"@example.com", false},
		{"you@", false},
		{"you@example", false},
		{"", false},
	}
	for _, tc := range tests {
		if got := validEmail(tc.email); got != tc.ok {
			t.Fatalf("validEmail(%q) = %v, want %v", tc.email, got, tc.ok)
		}
	}
}
