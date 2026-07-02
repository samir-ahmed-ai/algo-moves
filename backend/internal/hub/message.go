package hub

import "encoding/json"

// Role marks a client's standing in a room. The host (players[0]) owns the
// shared room state; guest/player are the other active seats; a spectator
// watches without a seat. Guest is retained as the name for seat 1 so existing
// two-player games keep working unchanged.
type Role string

const (
	RoleHost      Role = "host"
	RoleGuest     Role = "guest"
	RolePlayer    Role = "player"
	RoleSpectator Role = "spectator"
)

// Peer is the public description of a connected client.
type Peer struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role Role   `json:"role"`
}

// Inbound is a message sent by a client to the server.
//
//	{"t":"relay","d":{...}}          — forward d verbatim to everyone else
//	{"t":"state","d":{...}}          — host sets shared room state (echoed to all)
//	{"t":"seat","d":{"want":"..."}}  — request to become "player" or "spectator"
//	{"t":"ping"}                     — optional app-level heartbeat (no-op)
//
// It is only ever json.Unmarshal'd, never marshaled, so D has no omitempty tag.
type Inbound struct {
	T string          `json:"t"`
	D json.RawMessage `json:"d"`
}

// The set of server → client message builders. Each returns marshalled JSON
// ready to hand to Conn.WriteText. Keeping them as small helpers avoids
// scattering map[string]any literals across the hub.

func msgWelcome(self Peer, players, spectators []Peer, capacity int, state json.RawMessage) []byte {
	return mustJSON(map[string]any{
		"t":          "welcome",
		"self":       self,
		"players":    players,
		"spectators": spectators,
		"capacity":   capacity,
		"state":      rawOrNull(state),
	})
}

func msgPeerJoin(p Peer) []byte {
	return mustJSON(map[string]any{"t": "peer-join", "peer": p})
}

func msgPeerLeave(p Peer) []byte {
	return mustJSON(map[string]any{"t": "peer-leave", "peer": p})
}

// msgRoleChange announces that a peer's role changed (host handoff after the
// host leaves, or a spectator/player seat swap), so clients re-bucket it.
func msgRoleChange(p Peer) []byte {
	return mustJSON(map[string]any{"t": "role-change", "peer": p})
}

func msgRelay(from string, d json.RawMessage) []byte {
	return mustJSON(map[string]any{"t": "relay", "from": from, "d": rawOrNull(d)})
}

func msgState(d json.RawMessage) []byte {
	return mustJSON(map[string]any{"t": "state", "d": rawOrNull(d)})
}

func msgError(reason string) []byte {
	return mustJSON(map[string]any{"t": "error", "msg": reason})
}

// rawOrNull renders an absent RawMessage as JSON null rather than empty bytes.
func rawOrNull(r json.RawMessage) json.RawMessage {
	if len(r) == 0 {
		return json.RawMessage("null")
	}
	return r
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		// The inputs are all server-controlled maps of marshalable values, so a
		// failure here is a programming error, not a runtime condition.
		return []byte(`{"t":"error","msg":"internal encode error"}`)
	}
	return b
}
