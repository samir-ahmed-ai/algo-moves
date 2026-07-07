package hub

import (
	"encoding/json"
	"testing"
)

// TestMessageTypeConstants verifies the wire tags in message.go stay aligned with
// what client.go readPump expects — centralized in #44 / Phase 8 #77.
func TestMessageTypeConstants(t *testing.T) {
	constants := map[string]string{
		"typeWelcome":    typeWelcome,
		"typePeerJoin":   typePeerJoin,
		"typePeerLeave":  typePeerLeave,
		"typeRoleChange": typeRoleChange,
		"typeRelay":      typeRelay,
		"typeState":      typeState,
		"typeSeat":       typeSeat,
		"typePing":       typePing,
		"typeError":      typeError,
	}
	for name, value := range constants {
		if value == "" {
			t.Fatalf("%s must not be empty", name)
		}
	}

	host := &rec{id: "h", name: "Host"}
	guest := &rec{id: "g", name: "Guest"}
	h := New()
	if _, ok := h.Join("ROOM", host, ""); !ok {
		t.Fatal("join host")
	}
	if _, ok := h.Join("ROOM", guest, ""); !ok {
		t.Fatal("join guest")
	}

	w := host.lastOfType(typeWelcome)
	if w == nil {
		t.Fatal("expected welcome message")
	}
	if w["t"] != typeWelcome {
		t.Fatalf("welcome tag = %v, want %q", w["t"], typeWelcome)
	}

	relayPayload, _ := json.Marshal(map[string]any{"n": 1})
	h.Relay("ROOM", guest, relayPayload)
	relay := host.lastOfType(typeRelay)
	if relay == nil {
		t.Fatal("expected relay message to host")
	}
	if relay["t"] != typeRelay {
		t.Fatalf("relay tag = %v, want %q", relay["t"], typeRelay)
	}
}
