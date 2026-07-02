package hub

import (
	"encoding/json"
	"sync"
	"sync/atomic"
	"time"

	"algomoves/gameserver/internal/ws"
)

const (
	sendBuffer = 32
	pingPeriod = 25 * time.Second
	pongWait   = 60 * time.Second
	writeWait  = 10 * time.Second
)

var clientSeq atomic.Uint64

// Client bridges one WebSocket connection to the hub. It satisfies Sender: the
// hub enqueues outbound messages via Send, which the write pump drains to the
// socket. Inbound frames are decoded by the read pump and dispatched to the hub.
type Client struct {
	cid    string
	name   string
	conn   *ws.Conn
	out    chan []byte
	closed chan struct{}
	once   sync.Once

	roleMu sync.Mutex
	role   Role
}

func newClient(conn *ws.Conn, name string) *Client {
	if name == "" {
		name = "Player"
	}
	return &Client{
		cid:    "c" + itoa(clientSeq.Add(1)),
		name:   name,
		conn:   conn,
		out:    make(chan []byte, sendBuffer),
		closed: make(chan struct{}),
	}
}

// --- Sender implementation ---

func (c *Client) ID() string   { return c.cid }
func (c *Client) Name() string { return c.name }

func (c *Client) Role() Role {
	c.roleMu.Lock()
	defer c.roleMu.Unlock()
	return c.role
}

func (c *Client) SetRole(r Role) {
	c.roleMu.Lock()
	c.role = r
	c.roleMu.Unlock()
}

// Send enqueues a message without blocking. A client that cannot keep up with
// the buffer is dropped — for a two-player game, a wedged peer is better closed
// than allowed to stall the other side.
func (c *Client) Send(payload []byte) {
	select {
	case <-c.closed:
	case c.out <- payload:
	default:
		c.close()
	}
}

func (c *Client) close() {
	c.once.Do(func() {
		close(c.closed)
		c.conn.Close()
	})
}

// drainOutbound waits until the outbound queue is empty or timeout elapses.
func (c *Client) drainOutbound(timeout time.Duration) {
	deadline := time.After(timeout)
	for {
		select {
		case <-deadline:
			return
		case <-c.closed:
			return
		default:
			if len(c.out) == 0 {
				time.Sleep(30 * time.Millisecond)
				return
			}
			time.Sleep(5 * time.Millisecond)
		}
	}
}

// Serve runs the full lifecycle for a connection: join the room, pump messages
// until the socket dies, then leave. It blocks until the connection ends. The
// pid is a stable per-player id used to reclaim a slot across reconnects.
func Serve(h *Hub, conn *ws.Conn, code, name, pid string) {
	c := newClient(conn, name)
	go c.writePump()
	if _, ok := h.Join(code, c, pid); !ok {
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
		var in Inbound
		if json.Unmarshal(data, &in) != nil {
			continue // ignore malformed frames rather than dropping the game
		}
		switch in.T {
		case "relay":
			h.Relay(code, c, in.D)
		case "state":
			h.SetState(code, c, in.D)
		case "ping":
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
		}
	}
}

// itoa renders a uint64 without pulling in strconv for one call site.
func itoa(n uint64) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
