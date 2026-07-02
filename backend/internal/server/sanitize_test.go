package server

import "testing"

func TestSanitizeName(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"clean ascii", "Ahmed", "Ahmed"},
		{"trims surrounding whitespace", "  Nour  ", "Nour"},
		{"strips control characters", "Ah\x00m\x1fed", "Ahmed"},
		{"strips DEL", "Ahmed\x7f", "Ahmed"},
		{"keeps unicode letters", "Amélie", "Amélie"},
		{"empty input", "", ""},
		{"only whitespace", "   ", ""},
		{"caps at 24 runes", "123456789012345678901234567890", "123456789012345678901234"},
		{"caps at 24 runes counting unicode as one each", "é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀", "é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀é😀"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SanitizeName(tt.in)
			if got != tt.want {
				t.Fatalf("SanitizeName(%q) = %q, want %q", tt.in, got, tt.want)
			}
			if n := len([]rune(got)); n > 24 {
				t.Fatalf("SanitizeName(%q) returned %d runes, want <= 24", tt.in, n)
			}
		})
	}
}

func TestSanitizePid(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"clean url-safe id", "abc-123_XYZ", "abc-123_XYZ"},
		{"strips spaces", "a b c", "abc"},
		{"strips punctuation", "a.b/c?d=e&f", "abcdef"},
		{"strips control characters", "a\x00b\x1fc", "abc"},
		{"empty input", "", ""},
		{"caps at 40 chars", func() string {
			s := ""
			for i := 0; i < 60; i++ {
				s += "a"
			}
			return s
		}(), func() string {
			s := ""
			for i := 0; i < 40; i++ {
				s += "a"
			}
			return s
		}()},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sanitizePid(tt.in)
			if got != tt.want {
				t.Fatalf("sanitizePid(%q) = %q, want %q", tt.in, got, tt.want)
			}
			if len(got) > 40 {
				t.Fatalf("sanitizePid(%q) returned %d chars, want <= 40", tt.in, len(got))
			}
		})
	}
}
