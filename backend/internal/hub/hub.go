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

// Hub owns every active room. It is safe for concurrent use.
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

// Join places c into the room identified by code, creating the room if needed.
// It returns the assigned role and true on success. If the room already holds
// two players (and neither slot belongs to this pid), it sends an error to c
// and returns ("", false) — the caller should then close the connection.
func (h *Hub) Join(code string, c Sender, pid string) (Role, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	r := h.rooms[code]
	if r == nil {
		if h.maxRooms > 0 && len(h.rooms) >= h.maxRooms {
			c.Send(msgError("server-full"))
			return "", false
		}
		r = &room{}
		h.rooms[code] = r
	}

	// Reclaim the exact slot this player held before a reconnect (matched by their
	// stable pid), so roles survive a transient drop — a reconnecting host stays
	// host instead of being promoted/demoted by slot order. Unlike a plain free-slot
	// match, this also matches a slot that is still occupied: if the previous
	// connection for this pid never cleanly disconnected (e.g. a phone that lost
	// its network without sending a close frame), the new connection supersedes it
	// immediately instead of the room wrongly reporting "room-full" until the
	// stale peer's 60s keepalive timeout finally reaps it.
	slot := -1
	if pid != "" {
		for i := range r.slots {
			if r.pids[i] != pid {
				continue
			}
			if stale := r.slots[i]; stale != nil && stale.ID() != c.ID() {
				stale.Send(msgError("replaced-by-reconnect"))
				stale.Close()
			}
			slot = i
			break
		}
	}
	if slot < 0 {
		slot = r.freeSlot()
	}
	if slot < 0 {
		c.Send(msgError("room-full"))
		return "", false
	}

	role := roleForSlot(slot)
	c.SetRole(role)
	r.slots[slot] = c
	if pid != "" {
		r.pids[slot] = pid
	}

	// Tell the newcomer who is already here and what the current state is.
	c.Send(msgWelcome(peerOf(c), peersOf(r.others(c)), r.state))
	// Tell the existing player(s) someone arrived.
	for _, o := range r.others(c) {
		o.Send(msgPeerJoin(peerOf(c)))
	}
	return role, true
}

// Leave removes c from its room and notifies the remaining player. Empty rooms
// are deleted so their codes are reusable.
func (h *Hub) Leave(code string, c Sender) {
	h.mu.Lock()
	defer h.mu.Unlock()

	r := h.rooms[code]
	if r == nil {
		return
	}
	for i, s := range r.slots {
		if s != nil && s.ID() == c.ID() {
			r.slots[i] = nil
			break
		}
	}
	for _, o := range r.occupants() {
		o.Send(msgPeerLeave(peerOf(c)))
	}
	if r.empty() {
		delete(h.rooms, code)
	}
}

// Relay forwards d to the other player(s) in the room, tagged with the sender.
func (h *Hub) Relay(code string, from Sender, d json.RawMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	r := h.rooms[code]
	if r == nil {
		return
	}
	payload := msgRelay(from.ID(), d)
	for _, o := range r.others(from) {
		o.Send(payload)
	}
}

// SetState stores the shared room state and broadcasts it to EVERYONE in the
// room, including the sender. Only the host may publish shared state.
func (h *Hub) SetState(code string, from Sender, d json.RawMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	r := h.rooms[code]
	if r == nil {
		return
	}
	if from.Role() != RoleHost {
		return
	}
	r.state = append(json.RawMessage(nil), d...)
	payload := msgState(d)
	for _, o := range r.occupants() {
		o.Send(payload)
	}
}

func peersOf(ss []Sender) []Peer {
	peers := make([]Peer, 0, len(ss))
	for _, s := range ss {
		peers = append(peers, peerOf(s))
	}
	return peers
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
