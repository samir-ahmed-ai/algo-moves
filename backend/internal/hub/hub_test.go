package hub

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
)

// rec is a test Sender that records every message it is handed.
type rec struct {
	id, name string
	mu       sync.Mutex
	role     Role
	msgs     [][]byte
	closed   bool
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
func (r *rec) Close() {
	r.mu.Lock()
	r.closed = true
	r.mu.Unlock()
}
func (r *rec) isClosed() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.closed
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

	role, ok := h.Join("ROOM", host, "")
	if !ok || role != RoleHost {
		t.Fatalf("host join = (%v,%v), want (host,true)", role, ok)
	}
	role, ok = h.Join("ROOM", guest, "")
	if !ok || role != RoleGuest {
		t.Fatalf("guest join = (%v,%v), want (guest,true)", role, ok)
	}

	// Host's first welcome lists only itself in the players roster.
	w := host.decoded()[0]
	if w["t"] != "welcome" {
		t.Fatalf("host's first message = %v, want welcome", w["t"])
	}
	if players, _ := w["players"].([]any); len(players) != 1 {
		t.Fatalf("host welcome players = %v, want 1 (itself)", w["players"])
	}
	// Guest's welcome should include both players.
	gw := guest.lastOfType("welcome")
	if players, _ := gw["players"].([]any); len(players) != 2 {
		t.Fatalf("guest welcome players = %v, want 2", gw["players"])
	}
	if specs, _ := gw["spectators"].([]any); len(specs) != 0 {
		t.Fatalf("guest welcome spectators = %v, want empty", gw["spectators"])
	}
	// Host should have been told the guest joined.
	if host.lastOfType("peer-join") == nil {
		t.Fatal("host was not notified of peer-join")
	}
}

func TestThirdJoinBecomesSpectator(t *testing.T) {
	h := New() // default capacity 2
	h.Join("R", &rec{id: "1"}, "")
	h.Join("R", &rec{id: "2"}, "")
	third := &rec{id: "3"}
	role, ok := h.Join("R", third, "")
	if !ok || role != RoleSpectator {
		t.Fatalf("third join = (%v,%v), want (spectator,true)", role, ok)
	}
	w := third.lastOfType("welcome")
	if players, _ := w["players"].([]any); len(players) != 2 {
		t.Fatalf("spectator welcome players = %v, want 2", w["players"])
	}
	if specs, _ := w["spectators"].([]any); len(specs) != 1 {
		t.Fatalf("spectator welcome spectators = %v, want 1 (itself)", w["spectators"])
	}
}

func TestRelayReachesOnlyThePeer(t *testing.T) {
	h := New()
	a := &rec{id: "a"}
	b := &rec{id: "b"}
	h.Join("R", a, "")
	h.Join("R", b, "")

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
	h.Join("R", host, "")
	h.SetState("R", host, json.RawMessage(`{"game":"number-duel"}`))

	late := &rec{id: "l"}
	h.Join("R", late, "")

	w := late.lastOfType("welcome")
	state, _ := w["state"].(map[string]any)
	if state == nil || state["game"] != "number-duel" {
		t.Fatalf("late joiner welcome state = %v, want game=number-duel", w["state"])
	}
}

func TestGuestSetStateIsIgnored(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	guest := &rec{id: "g"}
	h.Join("R", host, "")
	h.Join("R", guest, "")

	before := len(host.decoded())
	h.SetState("R", guest, json.RawMessage(`{"game":"tic-tac-toe"}`))
	if len(host.decoded()) != before {
		t.Fatal("guest setState should not broadcast to host")
	}
	if host.lastOfType("state") != nil {
		t.Fatal("guest setState should not change room state")
	}
}

func TestLeaveNotifiesPeerAndReclaimsRoom(t *testing.T) {
	h := New()
	a := &rec{id: "a"}
	b := &rec{id: "b"}
	h.Join("R", a, "")
	h.Join("R", b, "")

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
	h.Join("R", a, "") // host
	h.Join("R", b, "") // guest
	h.Leave("R", a)

	c := &rec{id: "c"}
	role, ok := h.Join("R", c, "")
	if !ok || role != RoleHost {
		t.Fatalf("reclaimed slot role = (%v,%v), want (host,true)", role, ok)
	}
}

func TestReconnectReclaimsSameSlotByPid(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	guest := &rec{id: "g"}
	h.Join("R", host, "pid-host")   // slot 0 / host
	h.Join("R", guest, "pid-guest") // slot 1 / guest

	// Host drops; its slot frees but the pid is remembered.
	h.Leave("R", host)

	// The original host reconnects with the same pid and must reclaim host, even
	// though slot 0 is the lowest free slot a stranger would also take.
	hostAgain := &rec{id: "h2"}
	role, ok := h.Join("R", hostAgain, "pid-host")
	if !ok || role != RoleHost {
		t.Fatalf("reconnecting host role = (%v,%v), want (host,true)", role, ok)
	}
}

func TestReconnectBeforeTimeoutEvictsStaleConnection(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	guest := &rec{id: "g"}
	if _, ok := h.Join("R", host, "pid-host"); !ok {
		t.Fatal("host join failed")
	}
	if _, ok := h.Join("R", guest, "pid-guest"); !ok {
		t.Fatal("guest join failed")
	}

	// Unlike TestReconnectReclaimsSameSlotByPid, the host's connection never
	// calls Leave: it just goes stale (e.g. a phone that lost network without a
	// clean close), so slot 0 is still occupied when the reconnect arrives.
	// Without active eviction this would wrongly report room-full even though
	// two live players are trying to occupy the two-player room.
	hostAgain := &rec{id: "h2"}
	role, ok := h.Join("R", hostAgain, "pid-host")
	if !ok || role != RoleHost {
		t.Fatalf("reconnecting host role = (%v,%v), want (host,true)", role, ok)
	}

	if !host.isClosed() {
		t.Fatal("stale host connection was not evicted (Close was never called)")
	}
	if host.lastOfType("error") == nil {
		t.Fatal("stale host connection was not notified it was replaced")
	}

	// The guest should not have been touched by the eviction.
	if guest.isClosed() {
		t.Fatal("unrelated guest connection should not be evicted")
	}

	// A third connection now finds both seats occupied (hostAgain + guest) and
	// so joins as a spectator, proving the stale slot was truly replaced rather
	// than just added on top of.
	third := &rec{id: "third"}
	role, ok = h.Join("R", third, "")
	if !ok || role != RoleSpectator {
		t.Fatalf("third join = (%v,%v), want (spectator,true) once both seats are full", role, ok)
	}
}

func TestReconnectSamePidSameConnectionIsNotSelfEvicted(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	if _, ok := h.Join("R", host, "pid-host"); !ok {
		t.Fatal("host join failed")
	}
	// Re-joining with the very same Sender and pid must not evict itself.
	if _, ok := h.Join("R", host, "pid-host"); !ok {
		t.Fatal("re-join with same sender+pid should succeed")
	}
	if host.isClosed() {
		t.Fatal("a client must never evict its own connection")
	}
}

func TestMaxRoomsCeilingRejectsNewRooms(t *testing.T) {
	h := NewWithMaxRooms(1)
	first := &rec{id: "1"}
	if _, ok := h.Join("A", first, ""); !ok {
		t.Fatal("first room should be allowed under the cap")
	}

	blocked := &rec{id: "2"}
	if _, ok := h.Join("B", blocked, ""); ok {
		t.Fatal("second distinct room should be rejected once at the cap")
	}
	if blocked.lastOfType("error") == nil {
		t.Fatal("rejected join should receive an error message")
	}
	if h.RoomCount() != 1 {
		t.Fatalf("room count = %d, want 1 (rejected room must not be created)", h.RoomCount())
	}

	// Joining (including reconnecting into) an existing room must still work
	// even at the cap.
	second := &rec{id: "3"}
	if _, ok := h.Join("A", second, ""); !ok {
		t.Fatal("joining an existing room at the cap should still succeed")
	}
}

func TestHubConcurrentAccessIsRaceSafe(t *testing.T) {
	h := New()
	const rooms = 8
	const playersPerRoom = 6 // several reconnect/evict cycles per room, plus a spectator or two

	var wg sync.WaitGroup
	for room := 0; room < rooms; room++ {
		code := string(rune('A' + room))
		for p := 0; p < playersPerRoom; p++ {
			wg.Add(1)
			go func(code string, p int) {
				defer wg.Done()
				c := &rec{id: code + string(rune('0'+p))}
				pid := "pid-" + code + "-" + string(rune('0'+p%2)) // some pid collisions to exercise eviction
				role, ok := h.Join(code, c, pid)
				if ok {
					h.Relay(code, c, json.RawMessage(`{"x":1}`))
					if role == RoleHost {
						h.SetState(code, c, json.RawMessage(`{"y":2}`))
					}
					h.Leave(code, c)
				}
			}(code, p)
		}
	}
	wg.Wait()

	// No assertion beyond "the race detector found nothing and this didn't
	// deadlock": the point of this test is concurrent-safety, not a specific
	// end state, per the Hub's "safe for concurrent use" doc comment.
	_ = h.RoomCount()
}

// TestConcurrentJoinLeaveSameCodeReclaimsRoomCleanly hammers Join/Leave for a
// single room code from many goroutines at once. It specifically exercises
// the per-room dead-flag/retry handshake between Hub.deleteIfStillEmpty and
// room.join: a room emptied by Leave and concurrently re-fetched by Join must
// never be resurrected once deleted, and Join must never resurrect a deleted
// room instead of creating a fresh one.
func TestConcurrentJoinLeaveSameCodeReclaimsRoomCleanly(t *testing.T) {
	h := New()
	const code = "R"
	const iterations = 200

	var wg sync.WaitGroup
	for i := 0; i < iterations; i++ {
		for _, prefix := range [2]string{"a", "b"} {
			wg.Add(1)
			go func(id string) {
				defer wg.Done()
				c := &rec{id: id}
				if _, ok := h.Join(code, c, ""); ok {
					h.Leave(code, c)
				}
			}(fmt.Sprintf("%s%d", prefix, i))
		}
	}
	wg.Wait()

	if got := h.RoomCount(); got != 0 {
		t.Fatalf("room count = %d, want 0 once every joiner has left", got)
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
