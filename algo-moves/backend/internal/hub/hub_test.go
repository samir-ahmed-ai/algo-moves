package hub

import (
	"encoding/json"
	"sync"
	"testing"
)

// rec is a test Sender that records every message it is handed.
type rec struct {
	id, name string
	mu       sync.Mutex
	role     Role
	msgs     [][]byte
}

func (r *rec) ID() string     { return r.id }
func (r *rec) Name() string   { return r.name }
func (r *rec) Role() Role     { r.mu.Lock(); defer r.mu.Unlock(); return r.role }
func (r *rec) SetRole(x Role) { r.mu.Lock(); r.role = x; r.mu.Unlock() }
func (r *rec) Send(p []byte) {
	r.mu.Lock()
	r.msgs = append(r.msgs, append([]byte(nil), p...))
	r.mu.Unlock()
}

func (r *rec) decoded() []map[string]any {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]map[string]any, 0, len(r.msgs))
	for _, m := range r.msgs {
		var v map[string]any
		_ = json.Unmarshal(m, &v)
		out = append(out, v)
	}
	return out
}

func (r *rec) lastOfType(t string) map[string]any {
	msgs := r.decoded()
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i]["t"] == t {
			return msgs[i]
		}
	}
	return nil
}

func TestJoinAssignsHostThenGuest(t *testing.T) {
	h := New()
	host := &rec{id: "h", name: "Ahmed"}
	guest := &rec{id: "g", name: "Nour"}

	role, ok := h.Join("ROOM", host)
	if !ok || role != RoleHost {
		t.Fatalf("host join = (%v,%v), want (host,true)", role, ok)
	}
	role, ok = h.Join("ROOM", guest)
	if !ok || role != RoleGuest {
		t.Fatalf("guest join = (%v,%v), want (guest,true)", role, ok)
	}

	// Host's welcome should list no peers initially.
	w := host.lastOfType("welcome")
	if w == nil {
		t.Fatal("host got no welcome")
	}
	if peers, _ := w["peers"].([]any); len(peers) != 0 {
		t.Fatalf("host welcome peers = %v, want empty", w["peers"])
	}
	// Guest's welcome should include the host as a peer.
	gw := guest.lastOfType("welcome")
	if peers, _ := gw["peers"].([]any); len(peers) != 1 {
		t.Fatalf("guest welcome peers = %v, want 1", gw["peers"])
	}
	// Host should have been told the guest joined.
	if host.lastOfType("peer-join") == nil {
		t.Fatal("host was not notified of peer-join")
	}
}

func TestThirdJoinIsRejected(t *testing.T) {
	h := New()
	h.Join("R", &rec{id: "1"})
	h.Join("R", &rec{id: "2"})
	third := &rec{id: "3"}
	if _, ok := h.Join("R", third); ok {
		t.Fatal("third join should fail")
	}
	if third.lastOfType("error") == nil {
		t.Fatal("third join should receive an error message")
	}
}

func TestRelayReachesOnlyThePeer(t *testing.T) {
	h := New()
	a := &rec{id: "a"}
	b := &rec{id: "b"}
	h.Join("R", a)
	h.Join("R", b)

	h.Relay("R", a, json.RawMessage(`{"guess":42}`))

	if b.lastOfType("relay") == nil {
		t.Fatal("peer b did not receive relay")
	}
	// a should not receive its own relay.
	for _, m := range a.decoded() {
		if m["t"] == "relay" {
			t.Fatal("sender a received its own relay")
		}
	}
	got := b.lastOfType("relay")
	if got["from"] != "a" {
		t.Fatalf("relay from = %v, want a", got["from"])
	}
}

func TestStateIsRememberedForLateJoiner(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	h.Join("R", host)
	h.SetState("R", host, json.RawMessage(`{"game":"number-duel"}`))

	late := &rec{id: "l"}
	h.Join("R", late)

	w := late.lastOfType("welcome")
	state, _ := w["state"].(map[string]any)
	if state == nil || state["game"] != "number-duel" {
		t.Fatalf("late joiner welcome state = %v, want game=number-duel", w["state"])
	}
}

func TestLeaveNotifiesPeerAndReclaimsRoom(t *testing.T) {
	h := New()
	a := &rec{id: "a"}
	b := &rec{id: "b"}
	h.Join("R", a)
	h.Join("R", b)

	h.Leave("R", a)
	if b.lastOfType("peer-leave") == nil {
		t.Fatal("remaining peer not told of leave")
	}
	if h.RoomCount() != 1 {
		t.Fatalf("room count = %d, want 1 (b still present)", h.RoomCount())
	}

	h.Leave("R", b)
	if h.RoomCount() != 0 {
		t.Fatalf("room count = %d, want 0 after empty", h.RoomCount())
	}
}

func TestHostSlotIsReclaimedInOrder(t *testing.T) {
	h := New()
	a := &rec{id: "a"}
	b := &rec{id: "b"}
	h.Join("R", a) // host
	h.Join("R", b) // guest
	h.Leave("R", a)

	c := &rec{id: "c"}
	role, ok := h.Join("R", c)
	if !ok || role != RoleHost {
		t.Fatalf("reclaimed slot role = (%v,%v), want (host,true)", role, ok)
	}
}

func TestFreshCodeIsUniqueAndClean(t *testing.T) {
	h := New()
	code := h.FreshCode()
	if len(code) != 4 {
		t.Fatalf("code %q length = %d, want 4", code, len(code))
	}
	for _, ch := range code {
		if ch == 'I' || ch == 'O' || ch == '0' || ch == '1' {
			t.Fatalf("code %q contains an ambiguous character", code)
		}
	}
}
