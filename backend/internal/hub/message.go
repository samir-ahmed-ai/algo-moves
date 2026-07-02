package hub

import "encoding/json"

// Role marks which side of a two-player room a client occupies. The host (slot
// 0) owns the shared room state; the guest (slot 1) follows it.
type Role string

const (
	RoleHost  Role = "host"
	RoleGuest Role = "guest"
)

// Peer is the public description of a connected player.
type Peer struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role Role   `json:"role"`
}

// Inbound is a message sent by a client to the server.
//
//	{"t":"relay","d":{...}}  — forward d verbatim to the other player
//	{"t":"state","d":{...}}  — host sets shared room state (echoed to peers)
type Inbound struct {
	T string          `json:"t"`
	D json.RawMessage `json:"d,omitempty"`
}

// The set of server → client message builders. Each returns marshalled JSON
// ready to hand to Conn.WriteText. Keeping them as small helpers avoids scattering
// map[string]any literals across the hub.

func msgWelcome(self Peer, peers []Peer, state json.RawMessage) []byte {
	return mustJSON(map[string]any{
		"t":     "welcome",
		"self":  self,
		"peers": peers,
		"state": rawOrNull(state),
	})
}

func msgPeerJoin(p Peer) []byte {
	return mustJSON(map[string]any{"t": "peer-join", "peer": p})
}

func msgPeerLeave(p Peer) []byte {
	return mustJSON(map[string]any{"t": "peer-leave", "peer": p})
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
