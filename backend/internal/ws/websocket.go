// Package ws wraps github.com/coder/websocket with the small Conn API the game
// relay expects: text messages, ping/pong keepalive, and clean close handshakes.
package ws

import (
	"context"
	"errors"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// Opcodes kept for tests that assert wire-level message kinds.
const (
	opText   = 0x1
	opBinary = 0x2
)

// maxMessageBytes caps a single message; game payloads are tiny JSON blobs.
const maxMessageBytes = 1 << 20 // 1 MiB

// ErrClosed is returned by ReadMessage once the peer has closed the connection.
var ErrClosed = errors.New("ws: connection closed")

// Conn is an accepted WebSocket connection.
type Conn struct {
	conn          *websocket.Conn
	remote        net.Addr
	keepalive     time.Duration
	writeDeadline time.Time
	writeMu       sync.Mutex
}

// Upgrade performs the RFC 6455 handshake.
func Upgrade(w http.ResponseWriter, r *http.Request) (*Conn, error) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return nil, err
	}
	conn.SetReadLimit(maxMessageBytes)
	return &Conn{conn: conn, remote: stringAddr(r.RemoteAddr)}, nil
}

type stringAddr string

func (a stringAddr) Network() string { return "tcp" }
func (a stringAddr) String() string  { return string(a) }

// SetReadDeadline is retained for API compatibility; reads use EnableKeepalive duration.
func (c *Conn) SetReadDeadline(t time.Time) error { return nil }

// EnableKeepalive makes every successful read push the read deadline out by d.
func (c *Conn) EnableKeepalive(d time.Duration) {
	c.keepalive = d
	if d > 0 {
		_ = c.SetReadDeadline(time.Now().Add(d))
	}
}

// SetWriteDeadline bounds how long the next write may block.
func (c *Conn) SetWriteDeadline(t time.Time) error {
	c.writeMu.Lock()
	c.writeDeadline = t
	c.writeMu.Unlock()
	return nil
}

// RemoteAddr reports the peer address for logging.
func (c *Conn) RemoteAddr() net.Addr {
	if c.remote != nil {
		return c.remote
	}
	return &net.TCPAddr{}
}

func (c *Conn) readCtx() context.Context {
	if c.keepalive > 0 {
		ctx, _ := context.WithTimeout(context.Background(), c.keepalive)
		return ctx
	}
	return context.Background()
}

func (c *Conn) writeCtx() context.Context {
	c.writeMu.Lock()
	deadline := c.writeDeadline
	c.writeMu.Unlock()
	if !deadline.IsZero() {
		ctx, _ := context.WithDeadline(context.Background(), deadline)
		return ctx
	}
	return context.Background()
}

// ReadMessage returns the next complete application message (text or binary).
func (c *Conn) ReadMessage() (opcode byte, payload []byte, err error) {
	typ, data, err := c.conn.Read(c.readCtx())
	if err != nil {
		if websocket.CloseStatus(err) != -1 || errors.Is(err, context.DeadlineExceeded) {
			return 0, nil, ErrClosed
		}
		return 0, nil, err
	}
	if c.keepalive > 0 {
		_ = c.SetReadDeadline(time.Now().Add(c.keepalive))
	}
	switch typ {
	case websocket.MessageText:
		return opText, data, nil
	case websocket.MessageBinary:
		return opBinary, data, nil
	default:
		return 0, nil, errors.New("ws: unsupported message type")
	}
}

// WriteText sends a UTF-8 text message.
func (c *Conn) WriteText(s []byte) error {
	return c.conn.Write(c.writeCtx(), websocket.MessageText, s)
}

// Ping sends a ping control frame for keepalive.
func (c *Conn) Ping() error {
	return c.conn.Ping(c.writeCtx())
}

// Close sends a close frame (best effort) and tears down the socket.
func (c *Conn) Close() error {
	return c.conn.Close(websocket.StatusNormalClosure, "")
}
