// Package ws is a tiny, dependency-free WebSocket (RFC 6455) server
// implementation. It is intentionally minimal: text/binary messages, ping/pong
// keepalive, and clean close handshakes — everything the game relay needs and
// nothing more. Keeping it in the standard library means `go build` and
// `go test` work fully offline with no module downloads.
package ws

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// magicGUID is the fixed value appended to Sec-WebSocket-Key per RFC 6455 §4.2.2.
const magicGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

// Opcodes (RFC 6455 §5.2).
const (
	opContinuation = 0x0
	opText         = 0x1
	opBinary       = 0x2
	opClose        = 0x8
	opPing         = 0x9
	opPong         = 0xA
)

// maxMessageBytes caps a single (possibly fragmented) message. Game payloads are
// tiny JSON blobs; anything larger is treated as abuse and closes the socket.
const maxMessageBytes = 1 << 20 // 1 MiB

// ErrClosed is returned by ReadMessage once the peer has sent a close frame or
// the connection is otherwise finished.
var ErrClosed = errors.New("ws: connection closed")

// Conn is an accepted WebSocket connection. Reads happen from a single
// goroutine; writes are safe from many goroutines (guarded by writeMu).
type Conn struct {
	raw       net.Conn
	r         *bufio.Reader
	writeMu   sync.Mutex
	closed    bool
	keepalive time.Duration
}

// acceptKey computes the Sec-WebSocket-Accept response value for a given key.
func acceptKey(key string) string {
	h := sha1.New()
	io.WriteString(h, key+magicGUID)
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func headerContainsToken(h http.Header, name, token string) bool {
	for _, v := range h.Values(name) {
		for _, part := range strings.Split(v, ",") {
			if strings.EqualFold(strings.TrimSpace(part), token) {
				return true
			}
		}
	}
	return false
}

// Upgrade performs the RFC 6455 handshake and hijacks the connection. On success
// the ResponseWriter must no longer be used by the caller.
func Upgrade(w http.ResponseWriter, r *http.Request) (*Conn, error) {
	if r.Method != http.MethodGet {
		return nil, fmt.Errorf("ws: method %s not allowed", r.Method)
	}
	if !headerContainsToken(r.Header, "Connection", "upgrade") ||
		!strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		return nil, errors.New("ws: not a websocket upgrade")
	}
	if r.Header.Get("Sec-WebSocket-Version") != "13" {
		return nil, errors.New("ws: unsupported websocket version")
	}
	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		return nil, errors.New("ws: missing Sec-WebSocket-Key")
	}

	hj, ok := w.(http.Hijacker)
	if !ok {
		return nil, errors.New("ws: response writer does not support hijacking")
	}
	conn, brw, err := hj.Hijack()
	if err != nil {
		return nil, fmt.Errorf("ws: hijack failed: %w", err)
	}

	resp := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + acceptKey(key) + "\r\n\r\n"
	if _, err := brw.WriteString(resp); err != nil {
		conn.Close()
		return nil, err
	}
	if err := brw.Flush(); err != nil {
		conn.Close()
		return nil, err
	}
	// brw.Reader may already hold buffered bytes from the request; keep using it.
	return &Conn{raw: conn, r: brw.Reader}, nil
}

// SetReadDeadline bounds how long the next read may block; used for keepalive.
func (c *Conn) SetReadDeadline(t time.Time) error { return c.raw.SetReadDeadline(t) }

// EnableKeepalive makes every received frame (including pongs) push the read
// deadline out by d. Combined with periodic Ping calls from a write pump, an
// idle-but-healthy connection stays open while a truly dead one is reaped.
func (c *Conn) EnableKeepalive(d time.Duration) {
	c.keepalive = d
	if d > 0 {
		_ = c.SetReadDeadline(time.Now().Add(d))
	}
}

// SetWriteDeadline bounds how long a write may block; used by the write pump so
// a stuck peer cannot wedge a broadcast forever.
func (c *Conn) SetWriteDeadline(t time.Time) error { return c.raw.SetWriteDeadline(t) }

// RemoteAddr reports the peer address for logging.
func (c *Conn) RemoteAddr() net.Addr { return c.raw.RemoteAddr() }

// ReadMessage returns the next complete application message (text or binary).
// Control frames are handled transparently: pings are answered with pongs and a
// close frame yields ErrClosed. Fragmented messages are reassembled.
func (c *Conn) ReadMessage() (opcode byte, payload []byte, err error) {
	var msg []byte
	var msgOp byte
	fragmented := false

	for {
		fin, op, data, err := c.readFrame()
		if err != nil {
			return 0, nil, err
		}
		if c.keepalive > 0 {
			_ = c.SetReadDeadline(time.Now().Add(c.keepalive))
		}
		switch op {
		case opPing:
			if err := c.writeFrame(opPong, data); err != nil {
				return 0, nil, err
			}
			continue
		case opPong:
			continue
		case opClose:
			_ = c.writeFrame(opClose, nil)
			return 0, nil, ErrClosed
		case opText, opBinary:
			if fragmented {
				return 0, nil, errors.New("ws: expected continuation frame")
			}
			msgOp = op
			msg = append(msg, data...)
			if !fin {
				fragmented = true
				continue
			}
			return msgOp, msg, nil
		case opContinuation:
			if !fragmented {
				return 0, nil, errors.New("ws: unexpected continuation frame")
			}
			msg = append(msg, data...)
			if len(msg) > maxMessageBytes {
				return 0, nil, errors.New("ws: message too large")
			}
			if fin {
				return msgOp, msg, nil
			}
		default:
			return 0, nil, fmt.Errorf("ws: unknown opcode 0x%x", op)
		}
	}
}

// readFrame reads exactly one frame, unmasking client payloads.
func (c *Conn) readFrame() (fin bool, opcode byte, payload []byte, err error) {
	var head [2]byte
	if _, err := io.ReadFull(c.r, head[:]); err != nil {
		return false, 0, nil, err
	}
	fin = head[0]&0x80 != 0
	opcode = head[0] & 0x0f
	masked := head[1]&0x80 != 0
	length := uint64(head[1] & 0x7f)

	switch length {
	case 126:
		var ext [2]byte
		if _, err := io.ReadFull(c.r, ext[:]); err != nil {
			return false, 0, nil, err
		}
		length = uint64(binary.BigEndian.Uint16(ext[:]))
	case 127:
		var ext [8]byte
		if _, err := io.ReadFull(c.r, ext[:]); err != nil {
			return false, 0, nil, err
		}
		length = binary.BigEndian.Uint64(ext[:])
	}
	if length > maxMessageBytes {
		return false, 0, nil, errors.New("ws: frame too large")
	}
	// Per RFC 6455 §5.5 control frames must be <=125 bytes and never fragmented.
	// Enforcing this bounds the ping payload we echo back as a pong.
	if opcode == opClose || opcode == opPing || opcode == opPong {
		if length > 125 || !fin {
			return false, 0, nil, errors.New("ws: invalid control frame")
		}
	}
	// Per RFC 6455 §5.1 every client-to-server frame must be masked.
	if !masked {
		return false, 0, nil, errors.New("ws: client frame not masked")
	}
	var mask [4]byte
	if _, err := io.ReadFull(c.r, mask[:]); err != nil {
		return false, 0, nil, err
	}
	payload = make([]byte, length)
	if _, err := io.ReadFull(c.r, payload); err != nil {
		return false, 0, nil, err
	}
	for i := range payload {
		payload[i] ^= mask[i%4]
	}
	return fin, opcode, payload, nil
}

// writeFrame writes one unmasked server frame (FIN set).
func (c *Conn) writeFrame(opcode byte, payload []byte) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.closed {
		return ErrClosed
	}

	header := make([]byte, 0, 10)
	header = append(header, 0x80|opcode) // FIN + opcode
	n := len(payload)
	switch {
	case n < 126:
		header = append(header, byte(n))
	case n < 1<<16:
		header = append(header, 126, byte(n>>8), byte(n))
	default:
		var ext [8]byte
		binary.BigEndian.PutUint64(ext[:], uint64(n))
		header = append(header, 127)
		header = append(header, ext[:]...)
	}
	if _, err := c.raw.Write(header); err != nil {
		return err
	}
	if n > 0 {
		if _, err := c.raw.Write(payload); err != nil {
			return err
		}
	}
	return nil
}

// WriteText sends a UTF-8 text message.
func (c *Conn) WriteText(s []byte) error { return c.writeFrame(opText, s) }

// Ping sends a ping control frame for keepalive.
func (c *Conn) Ping() error { return c.writeFrame(opPing, nil) }

// Close sends a close frame (best effort) and tears down the socket.
func (c *Conn) Close() error {
	c.writeMu.Lock()
	if c.closed {
		c.writeMu.Unlock()
		return nil
	}
	c.closed = true
	c.writeMu.Unlock()
	// Bound the close-frame write: Close() can be called from the hub goroutine
	// while it holds the room lock, so a dead peer must not block it indefinitely.
	_ = c.raw.SetWriteDeadline(time.Now().Add(2 * time.Second))
	_ = c.writeFrameUnlocked(opClose, nil)
	return c.raw.Close()
}

// writeFrameUnlocked writes a close frame while the caller already released the
// mutex but before the socket is torn down; it tolerates errors.
func (c *Conn) writeFrameUnlocked(opcode byte, payload []byte) error {
	header := []byte{0x80 | opcode, byte(len(payload))}
	if _, err := c.raw.Write(header); err != nil {
		return err
	}
	if len(payload) > 0 {
		_, err := c.raw.Write(payload)
		return err
	}
	return nil
}
