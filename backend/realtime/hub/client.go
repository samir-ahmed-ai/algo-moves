package hub

import (
	"encoding/json"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"algomoves.dev/realtime/ws"
	"golang.org/x/time/rate"
)

const (
	sendBuffer = 32
	pingPeriod = 25 * time.Second
	pongWait   = 60 * time.Second
	writeWait  = 10 * time.Second

	// Inbound application-message throttling, independent of the /ws upgrade
	// rate limiter: it bounds how fast one already-connected peer can make the
	// hub do relay/state work after the handshake.
	msgRateLimit = 20.0 // sustained messages per second
	msgBurst     = 40.0 // burst allowance above the sustained rate
)

var clientSeq atomic.Uint64

// Client bridges one WebSocket connection to the hub. It satisfies Sender: the
// hub enqueues outbound messages via Send, which the write pump drains to the
// socket. Inbound frames are decoded by the read pump and dispatched to the hub.
type Client struct {
	cid     string
	name    string
	conn    *ws.Conn
	out     chan []byte
	flush   chan chan struct{}
	closed  chan struct{}
	once    sync.Once
	limiter *rate.Limiter

	// role is only ever read or written while the owning room holds its lock
	// (room.join / room.setSeat set it, room.setState reads it), so — like
	// room.players/pids/state — it needs no dedicated mutex of its own.
	role Role
}

func newClient(conn *ws.Conn, name string) *Client {
	if name == "" {
		name = "Player"
	}
	return &Client{
		cid:     "c" + strconv.FormatUint(clientSeq.Add(1), 10),
		name:    name,
		conn:    conn,
		out:     make(chan []byte, sendBuffer),
		flush:   make(chan chan struct{}),
		closed:  make(chan struct{}),
		limiter: rate.NewLimiter(rate.Limit(msgRateLimit), int(msgBurst)),
	}
}

// --- Sender implementation ---

func (c *Client) ID() string     { return c.cid }
func (c *Client) Name() string   { return c.name }
func (c *Client) Role() Role     { return c.role }
func (c *Client) SetRole(r Role) { c.role = r }

// Send enqueues a message without blocking. A client that cannot keep up with
// the buffer is dropped — for a two-player game, a wedged peer is better closed
// than allowed to stall the other side.
func (c *Client) Send(payload []byte) {
	select {
	case <-c.closed:
	case c.out <- payload:
	default:
		c.Close()
	}
}

// Close disconnects the client. It is safe to call from a hub-locked critical
// section: the actual socket teardown runs off this goroutine, since
// Conn.Close can block for up to ~2s writing a close frame to a wedged peer
// and must never stall the caller (e.g. Hub.Join evicting a stale reconnect,
// or another room's unrelated broadcast).
func (c *Client) Close() {
	go c.close()
}

func (c *Client) close() {
	c.once.Do(func() {
		close(c.closed)
		c.conn.Close()
	})
}

// drainOutbound blocks until every message enqueued so far has actually been
// written to the socket by the write pump (not merely dequeued), or until
// timeout elapses / the connection closes. It hands the write pump a private
// ack channel via c.flush rather than polling len(c.out), which — unlike
// polling — cannot race ahead of an in-flight write that has been dequeued but
// not yet sent.
func (c *Client) drainOutbound(timeout time.Duration) {
	ack := make(chan struct{})
	select {
	case c.flush <- ack:
	case <-c.closed:
		return
	case <-time.After(timeout):
		return
	}
	select {
	case <-ack:
	case <-c.closed:
	case <-time.After(timeout):
	}
}

// Serve runs the full lifecycle for a connection: join the room, pump messages
// until the socket dies, then leave. It blocks until the connection ends. The
// pid is a stable per-player id used to reclaim a slot across reconnects; opts
// carries the requested capacity and whether to join as a spectator.
func Serve(h *Hub, conn *ws.Conn, code, name, pid string, opts JoinOptions) {
	c := newClient(conn, name)
	go c.writePump()
	if _, ok := h.JoinWith(code, c, pid, opts); !ok {
		c.drainOutbound(500 * time.Millisecond)
		c.close()
		return
	}
	conn.EnableKeepalive(pongWait)

	c.readPump(h, code) // blocks until read error / close

	h.Leave(code, c)
	c.close()
}

func (c *Client) readPump(h *Hub, code string) {
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		if !c.limiter.Allow() {
			continue // throttle a fast-sending peer rather than processing every frame
		}
		var in Inbound
		if json.Unmarshal(data, &in) != nil {
			continue // ignore malformed frames rather than dropping the game
		}
		switch in.T {
		case typeRelay:
			h.Relay(code, c, in.D)
		case typeState:
			h.SetState(code, c, in.D)
		case typeSeat:
			var s struct {
				Want string `json:"want"`
			}
			if json.Unmarshal(in.D, &s) == nil {
				h.SetSeat(code, c, s.Want == "player")
			}
		case typePing:
			// Optional application-level heartbeat; keepalive already handled.
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-c.closed:
			return
		case msg := <-c.out:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteText(msg); err != nil {
				c.close()
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.Ping(); err != nil {
				c.close()
				return
			}
		case ack := <-c.flush:
			// Write out everything queued as of this request before acking, so a
			// caller blocked in drainOutbound knows every message enqueued before
			// its call has actually reached the socket (not merely left the
			// channel) once ack is closed.
			for drained := false; !drained; {
				select {
				case msg := <-c.out:
					_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
					if err := c.conn.WriteText(msg); err != nil {
						close(ack)
						c.close()
						return
					}
				default:
					drained = true
				}
			}
			close(ack)
		}
	}
}
