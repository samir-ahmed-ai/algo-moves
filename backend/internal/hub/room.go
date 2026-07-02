package hub

import "encoding/json"

// Sender is the minimal outbound surface a room needs from a connected client.
// Real clients back this with a buffered channel drained to a WebSocket; tests
// back it with a slice recorder.
type Sender interface {
	ID() string
	Name() string
	Role() Role
	SetRole(Role)
	// Send enqueues one server → client message. Implementations must not block
	// the caller (the hub holds a lock while broadcasting).
	Send(payload []byte)
}

func peerOf(s Sender) Peer {
	return Peer{ID: s.ID(), Name: s.Name(), Role: s.Role()}
}

// room is a single two-player match. slots[0] is the host, slots[1] the guest.
// A nil slot is free. All access is serialised by the owning Hub's mutex.
type room struct {
	code  string
	slots [2]Sender
	// pids remembers which stable player id last held each slot, so a reconnecting
	// player reclaims their original slot/role. Kept even while a slot is nil; it is
	// discarded only when the whole room is deleted (both players gone).
	pids  [2]string
	state json.RawMessage
}

// freeSlot returns the lowest unoccupied slot index, or -1 if the room is full.
func (r *room) freeSlot() int {
	for i, s := range r.slots {
		if s == nil {
			return i
		}
	}
	return -1
}

// occupants returns the currently connected senders.
func (r *room) occupants() []Sender {
	var out []Sender
	for _, s := range r.slots {
		if s != nil {
			out = append(out, s)
		}
	}
	return out
}

// others returns every occupant except the given one.
func (r *room) others(except Sender) []Sender {
	var out []Sender
	for _, s := range r.slots {
		if s != nil && s.ID() != except.ID() {
			out = append(out, s)
		}
	}
	return out
}

// empty reports whether no slot is occupied.
func (r *room) empty() bool {
	return r.slots[0] == nil && r.slots[1] == nil
}

func roleForSlot(i int) Role {
	if i == 0 {
		return RoleHost
	}
	return RoleGuest
}
