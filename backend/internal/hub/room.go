package hub

import (
	"encoding/json"
	"sync"
)

// Capacity bounds for a room's active-player seats. Spectators are tracked
// separately and bounded by maxSpectators.
const (
	defaultCapacity = 2
	minCapacity     = 2
	maxCapacity     = 8
	maxSpectators   = 64
)

// Sender is the minimal outbound surface a room needs from a connected client.
// Real clients back this with a buffered channel drained to a WebSocket; tests
// back it with a slice recorder.
type Sender interface {
	ID() string
	Name() string
	Role() Role
	SetRole(Role)
	// Send enqueues one server → client message. Implementations must not block
	// the caller (the hub calls this while holding a room's lock).
	Send(payload []byte)
	// Close disconnects the underlying connection. Implementations must not
	// block the caller (the hub may call this while holding a room's lock,
	// e.g. to evict a stale connection during a reconnect).
	Close()
}

func peerOf(s Sender) Peer {
	return Peer{ID: s.ID(), Name: s.Name(), Role: s.Role()}
}

// member pairs a connected spectator with the stable pid used to reclaim its
// place across reconnects.
type member struct {
	sender Sender
	pid    string
}

// room is a single match: up to `capacity` ordered player seats (slot 0 is the
// host, who owns the shared state) plus any number of watch-only spectators.
//
// Player seats are a fixed-length array indexed by seat: a nil entry is free,
// and the parallel pids array remembers which stable player id last held each
// seat so a reconnecting player reclaims their exact seat and role (a
// reconnecting host stays host) even while the seat reads as free. This is the
// two-player relay's original design generalised to N seats. A join past the
// last free seat — or one that asks to spectate — lands in spectators instead
// of being rejected, which is what lets extra people watch a live game.
//
// Each room owns its own lock rather than sharing the Hub's: Join/Leave/Relay/
// SetState/SetSeat all do their real work under r.mu, and the Hub's mutex is
// only ever held briefly to look a room up in (or remove one from) its map.
type room struct {
	mu sync.Mutex
	// dead is set once this room has been removed from Hub.rooms. A Join that
	// fetched this *room just before that removal, then blocked on mu behind it,
	// observes dead and retries against a fresh room for the code instead of
	// resurrecting one the Hub no longer knows about.
	dead       bool
	capacity   int
	players    []Sender // length == capacity; nil = free seat
	pids       []string // parallel to players; retained across reconnects
	spectators []member
	state      json.RawMessage
}

func clampCapacity(c int) int {
	switch {
	case c <= 0:
		return defaultCapacity
	case c < minCapacity:
		return minCapacity
	case c > maxCapacity:
		return maxCapacity
	default:
		return c
	}
}

// roleForSeat maps a seat index to its role. Seat 0 is the host; seat 1 keeps
// the historical "guest" name so existing two-player games need no change; any
// further seats are plain players.
func roleForSeat(i int) Role {
	switch i {
	case 0:
		return RoleHost
	case 1:
		return RoleGuest
	default:
		return RolePlayer
	}
}

// freeSeat returns the lowest unoccupied player seat, or -1 if all are taken.
// Callers must hold r.mu.
func (r *room) freeSeat() int {
	for i, s := range r.players {
		if s == nil {
			return i
		}
	}
	return -1
}

// seatOf returns c's player seat index, or -1 if c holds no seat. Callers must
// hold r.mu.
func (r *room) seatOf(c Sender) int {
	for i, s := range r.players {
		if s != nil && s.ID() == c.ID() {
			return i
		}
	}
	return -1
}

// spectatorIndex returns c's index in the spectator list, or -1. Callers must
// hold r.mu.
func (r *room) spectatorIndex(c Sender) int {
	for i := range r.spectators {
		if r.spectators[i].sender.ID() == c.ID() {
			return i
		}
	}
	return -1
}

// everyone returns every connected sender (players then spectators). Callers
// must hold r.mu.
func (r *room) everyone() []Sender {
	out := make([]Sender, 0, len(r.players)+len(r.spectators))
	for _, s := range r.players {
		if s != nil {
			out = append(out, s)
		}
	}
	for _, m := range r.spectators {
		out = append(out, m.sender)
	}
	return out
}

// others returns every connected sender except the given one. Callers must
// hold r.mu.
func (r *room) others(except Sender) []Sender {
	all := r.everyone()
	out := make([]Sender, 0, len(all))
	for _, s := range all {
		if s.ID() != except.ID() {
			out = append(out, s)
		}
	}
	return out
}

// playerPeers lists the occupied seats in seat order. Callers must hold r.mu.
func (r *room) playerPeers() []Peer {
	peers := make([]Peer, 0, len(r.players))
	for _, s := range r.players {
		if s != nil {
			peers = append(peers, peerOf(s))
		}
	}
	return peers
}

func (r *room) spectatorPeers() []Peer {
	peers := make([]Peer, 0, len(r.spectators))
	for _, m := range r.spectators {
		peers = append(peers, peerOf(m.sender))
	}
	return peers
}

// empty reports whether the room holds no live connection. Callers must hold
// r.mu.
func (r *room) empty() bool {
	for _, s := range r.players {
		if s != nil {
			return false
		}
	}
	return len(r.spectators) == 0
}

// evictStale closes a prior connection being superseded by a reconnect for the
// same pid, unless it is literally the same connection.
func evictStale(prev Sender, c Sender) {
	if prev != nil && prev.ID() != c.ID() {
		prev.Send(msgError("replaced-by-reconnect"))
		prev.Close()
	}
}

// join places c into the room. It first tries to reclaim the exact seat a prior
// connection held for this pid (so a reconnecting host stays host, superseding
// any stale connection still parked there); else it takes the lowest free
// player seat; else — when every seat is taken or c asked to spectate — it
// joins as a spectator. retry reports that the room was concurrently emptied
// and removed from the Hub between the caller fetching it and this call
// acquiring r.mu; the caller should re-fetch and try again.
func (r *room) join(c Sender, pid string, asSpectator bool) (role Role, ok bool, retry bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.dead {
		return "", false, true
	}

	// 1) Reconnect: reclaim the same player seat by pid.
	if pid != "" {
		for i := range r.players {
			if r.pids[i] != pid {
				continue
			}
			evictStale(r.players[i], c)
			r.players[i] = c
			c.SetRole(roleForSeat(i))
			return r.finishJoin(c), true, false
		}
		// ...or the same spectator slot by pid.
		if i := r.spectatorPidIndex(pid); i >= 0 {
			evictStale(r.spectators[i].sender, c)
			r.spectators[i].sender = c
			c.SetRole(RoleSpectator)
			return r.finishJoin(c), true, false
		}
	}

	// 2) The lowest free player seat, unless the joiner wants to spectate.
	if !asSpectator {
		if seat := r.freeSeat(); seat >= 0 {
			r.players[seat] = c
			r.pids[seat] = pid
			c.SetRole(roleForSeat(seat))
			return r.finishJoin(c), true, false
		}
	}

	// 3) Otherwise a spectator (explicit request or overflow past capacity).
	if len(r.spectators) >= maxSpectators {
		c.Send(msgError("room-full"))
		return "", false, false
	}
	c.SetRole(RoleSpectator)
	r.spectators = append(r.spectators, member{sender: c, pid: pid})
	return r.finishJoin(c), true, false
}

func (r *room) spectatorPidIndex(pid string) int {
	if pid == "" {
		return -1
	}
	for i := range r.spectators {
		if r.spectators[i].pid == pid {
			return i
		}
	}
	return -1
}

// finishJoin sends the newcomer its welcome (current roster + shared state) and
// tells everyone else it arrived. Callers must hold r.mu.
func (r *room) finishJoin(c Sender) Role {
	c.Send(msgWelcome(peerOf(c), r.playerPeers(), r.spectatorPeers(), r.capacity, r.state))
	for _, o := range r.others(c) {
		o.Send(msgPeerJoin(peerOf(c)))
	}
	return c.Role()
}

// leave removes c from the room and notifies whoever remains, reporting whether
// the room is now empty. A vacated player seat is kept as a tombstone (its pid
// retained) so a reconnect reclaims it; roles are seat-fixed, so no one is
// promoted or demoted by another's departure — a reconnecting host stays host.
func (r *room) leave(c Sender) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if seat := r.seatOf(c); seat >= 0 {
		r.players[seat] = nil // keep r.pids[seat] for reconnect reclaim
	} else if i := r.spectatorIndex(c); i >= 0 {
		r.spectators = append(r.spectators[:i], r.spectators[i+1:]...)
	}
	// If c was found in neither, it was already superseded by a reconnect; we
	// still announce the leave so peers drop the old id from their roster.

	for _, o := range r.everyone() {
		o.Send(msgPeerLeave(peerOf(c)))
	}
	return r.empty()
}

// setSeat lets a spectator claim a free player seat, or a player step down to
// spectator, and broadcasts the resulting role-change. It is a no-op if the
// move is impossible (no free seat, or c is already in the target group).
func (r *room) setSeat(c Sender, wantPlayer bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.dead {
		return
	}

	if wantPlayer {
		si := r.spectatorIndex(c)
		if si < 0 {
			return // already a player
		}
		seat := r.freeSeat()
		if seat < 0 {
			c.Send(msgError("seats-full"))
			return
		}
		m := r.spectators[si]
		r.spectators = append(r.spectators[:si], r.spectators[si+1:]...)
		r.players[seat] = c
		r.pids[seat] = m.pid
		c.SetRole(roleForSeat(seat))
	} else {
		seat := r.seatOf(c)
		if seat < 0 {
			return // already a spectator
		}
		pid := r.pids[seat]
		r.players[seat] = nil
		r.pids[seat] = "" // released voluntarily; free for anyone to take
		c.SetRole(RoleSpectator)
		r.spectators = append(r.spectators, member{sender: c, pid: pid})
	}

	p := peerOf(c)
	for _, o := range r.everyone() {
		o.Send(msgRoleChange(p))
	}
}

// relay forwards d to every other connected member (players and spectators, so
// watchers see the game too), tagged with from's id.
func (r *room) relay(from Sender, d json.RawMessage) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.dead {
		return
	}
	payload := msgRelay(from.ID(), d)
	for _, o := range r.others(from) {
		o.Send(payload)
	}
}

// setState stores the shared room state and broadcasts it to everyone in the
// room, including from. Only the host may publish shared state.
func (r *room) setState(from Sender, d json.RawMessage) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.dead || from.Role() != RoleHost {
		return
	}
	r.state = append(json.RawMessage(nil), d...)
	payload := msgState(d)
	for _, o := range r.everyone() {
		o.Send(payload)
	}
}

// markDeadIfEmpty marks the room dead and reports true if it is currently
// empty, in which case the caller (which must already hold Hub.mu) should
// remove it from Hub.rooms. It reports false, leaving the room alive, if a
// concurrent Join reoccupied it since the caller last observed it empty.
func (r *room) markDeadIfEmpty() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.empty() {
		return false
	}
	r.dead = true
	return true
}
