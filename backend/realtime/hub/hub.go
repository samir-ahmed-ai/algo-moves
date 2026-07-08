// Package hub implements the game-agnostic realtime relay: players pair into a
// room by a short code, and the server forwards messages between the two of
// them, tracks presence, and remembers the host's shared "state" so a late
// joiner sees the current game. It knows nothing about any specific game — the
// games live entirely in the frontend and speak their own JSON over "relay".
package hub

import (
	"crypto/rand"
	"encoding/json"
	"sync"
)

// Hub owns every active room and the code → room map itself. It is safe for
// concurrent use. Hub.mu only ever guards that map (lookup, creation,
// deletion); a room's own state (slots/pids/state) is guarded by the room's
// own mutex instead (see room.go), so a slow operation confined to one room
// can never stall Join/Leave/Relay/SetState for any other room.
type Hub struct {
	mu       sync.Mutex
	rooms    map[string]*room
	maxRooms int // 0 means unlimited
}

// New returns an empty Hub with no cap on concurrent rooms.
func New() *Hub {
	return &Hub{rooms: make(map[string]*room)}
}

// NewWithMaxRooms returns an empty Hub that refuses to create a new room once
// maxRooms distinct room codes are concurrently active (existing rooms, and
// reconnects to them, are unaffected). A non-positive maxRooms means
// unlimited, same as New(). This bounds steady-state memory/goroutine growth,
// which the /ws upgrade-rate limiter alone does not: that limiter only caps
// burst rate, not how many rooms accumulate over time.
func NewWithMaxRooms(maxRooms int) *Hub {
	return &Hub{rooms: make(map[string]*room), maxRooms: maxRooms}
}

// RoomCount reports how many rooms currently exist (for /healthz + tests).
func (h *Hub) RoomCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.rooms)
}

// JoinOptions carries how a client wants to join a room. Capacity sizes the
// room's player seats but only takes effect for the client that creates the
// room (a later cap for an existing room is ignored). AsSpectator asks to watch
// rather than take a player seat.
type JoinOptions struct {
	Capacity    int
	AsSpectator bool
}

// Join places c into the room identified by code as a player with the default
// capacity, creating the room if needed. See JoinWith for the full-control
// variant.
func (h *Hub) Join(code string, c Sender, pid string) (Role, bool) {
	return h.JoinWith(code, c, pid, JoinOptions{})
}

// JoinWith places c into the room identified by code, creating the room if
// needed. It returns the assigned role and true on success. A join past the
// room's player capacity, or one that asks to spectate, lands in the
// spectators (still true). It returns ("", false) — after sending an error to
// c — only when the server is at its room cap or the spectator gallery is full;
// the caller should then close the connection.
func (h *Hub) JoinWith(code string, c Sender, pid string, opts JoinOptions) (Role, bool) {
	for {
		r, ok := h.roomFor(code, c, opts.Capacity)
		if !ok {
			return "", false
		}
		role, ok, retry := r.join(c, pid, opts.AsSpectator)
		if retry {
			// r was emptied and reaped between us fetching it and locking it;
			// go around and get/create a fresh room for code.
			continue
		}
		return role, ok
	}
}

// roomFor returns the room for code, creating it (subject to the maxRooms
// cap, and sized to capacity) if it doesn't exist yet. Only Hub.mu is held
// here — the room's own state is untouched until the caller locks r.mu
// separately.
func (h *Hub) roomFor(code string, c Sender, capacity int) (*room, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	r := h.rooms[code]
	if r == nil {
		if h.maxRooms > 0 && len(h.rooms) >= h.maxRooms {
			c.Send(msgError("server-full"))
			return nil, false
		}
		size := clampCapacity(capacity)
		r = &room{
			capacity: size,
			players:  make([]Sender, size),
			pids:     make([]string, size),
		}
		h.rooms[code] = r
	}
	return r, true
}

func (h *Hub) getRoom(code string) *room {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.rooms[code]
}

// Leave removes c from its room and notifies the remaining player. Empty rooms
// are deleted so their codes are reusable.
func (h *Hub) Leave(code string, c Sender) {
	r := h.getRoom(code)
	if r == nil {
		return
	}
	if r.leave(c) {
		h.deleteIfStillEmpty(code, r)
	}
}

// deleteIfStillEmpty removes r from the map, but only if it is still the room
// registered for code (a newer room may have replaced it already) and it is
// still empty (a concurrent Join may have reoccupied it since r.leave
// observed it as empty).
func (h *Hub) deleteIfStillEmpty(code string, r *room) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[code] != r {
		return
	}
	if r.markDeadIfEmpty() {
		delete(h.rooms, code)
	}
}

// Relay forwards d to the other player(s) in the room, tagged with the sender.
func (h *Hub) Relay(code string, from Sender, d json.RawMessage) {
	r := h.getRoom(code)
	if r == nil {
		return
	}
	r.relay(from, d)
}

// SetState stores the shared room state and broadcasts it to EVERYONE in the
// room, including the sender. Only the host may publish shared state.
func (h *Hub) SetState(code string, from Sender, d json.RawMessage) {
	r := h.getRoom(code)
	if r == nil {
		return
	}
	r.setState(from, d)
}

// SetSeat moves c between the player seats and the spectator gallery. wantPlayer
// true tries to claim a free player seat; false steps down to spectator.
func (h *Hub) SetSeat(code string, c Sender, wantPlayer bool) {
	r := h.getRoom(code)
	if r == nil {
		return
	}
	r.setSeat(c, wantPlayer)
}

// FreshCode returns a short room code not currently in use. Codes avoid
// easily-confused characters so they read cleanly on a phone screen.
func (h *Hub) FreshCode() string {
	h.mu.Lock()
	defer h.mu.Unlock()
	for {
		code := randomCode(4)
		if _, exists := h.rooms[code]; !exists {
			return code
		}
	}
}

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no I,O,0,1

func randomCode(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand should never fail; fall back to a fixed-but-valid code.
		return "ROOM"
	}
	out := make([]byte, n)
	for i, x := range b {
		out[i] = codeAlphabet[int(x)%len(codeAlphabet)]
	}
	return string(out)
}
