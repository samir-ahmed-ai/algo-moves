package hub

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"algomoves/gameserver/internal/ws"
)

// upgradeTestConn performs a real RFC 6455 handshake against a throwaway
// httptest server and returns both sides: the server-side *ws.Conn (what
// Client wraps) and the raw client-side net.Conn. Callers that want to fill
// Client.out deterministically should leave raw un-drained; callers that want
// to observe bytes on the wire can read from it directly.
func upgradeTestConn(t *testing.T) (*ws.Conn, net.Conn) {
	t.Helper()

	connCh := make(chan *ws.Conn, 1)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := ws.Upgrade(w, r)
		if err != nil {
			return
		}
		connCh <- conn
	}))
	t.Cleanup(ts.Close)

	addr := strings.TrimPrefix(ts.URL, "http://")
	raw, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { raw.Close() })

	req := fmt.Sprintf(
		"GET / HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"+
			"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n",
		addr)
	if _, err := raw.Write([]byte(req)); err != nil {
		t.Fatalf("write handshake: %v", err)
	}

	br := bufio.NewReader(raw)
	statusLine, err := br.ReadString('\n')
	if err != nil {
		t.Fatalf("read status: %v", err)
	}
	if !strings.Contains(statusLine, "101") {
		t.Fatalf("expected 101 Switching Protocols, got %q", statusLine)
	}
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			t.Fatalf("read headers: %v", err)
		}
		if line == "\r\n" {
			break
		}
	}

	select {
	case conn := <-connCh:
		return conn, raw
	case <-time.After(2 * time.Second):
		t.Fatal("server never completed the upgrade")
		return nil, nil
	}
}

// TestSendOverflowClosesClient fills a client's sendBuffer-slot outbound
// queue and asserts the default branch in Send closes the peer connection
// rather than blocking, per Client.Send's documented contract.
func TestSendOverflowClosesClient(t *testing.T) {
	conn, _ := upgradeTestConn(t)
	c := newClient(conn, "Victim")
	// Deliberately never start writePump and never read from the raw side: out
	// fills to capacity deterministically with nothing draining it.
	for i := 0; i < sendBuffer; i++ {
		c.Send([]byte("x"))
	}

	select {
	case <-c.closed:
		t.Fatal("client was closed before its outbound buffer overflowed")
	default:
	}

	c.Send([]byte("overflow"))

	select {
	case <-c.closed:
	case <-time.After(2 * time.Second):
		t.Fatal("Send did not close the client once the outbound buffer overflowed")
	}
}

// TestDrainOutboundBlocksUntilWritePumpFlushes exercises drainOutbound's
// flush handshake: it must stay blocked while nothing is servicing the
// queue, and return promptly (well before its timeout) once the write pump
// actually starts and flushes the pending message to the socket.
func TestDrainOutboundBlocksUntilWritePumpFlushes(t *testing.T) {
	conn, raw := upgradeTestConn(t)
	c := newClient(conn, "Drainer")

	c.Send([]byte(`{"t":"error","msg":"room-full"}`))

	done := make(chan struct{})
	go func() {
		c.drainOutbound(2 * time.Second)
		close(done)
	}()

	// No write pump is running yet, so nothing can service the flush request:
	// drainOutbound must still be blocked rather than returning early off a
	// stale read of the queue length.
	select {
	case <-done:
		t.Fatal("drainOutbound returned with no write pump ever running to flush the queue")
	case <-time.After(50 * time.Millisecond):
	}

	go c.writePump()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("drainOutbound did not return after the write pump started flushing")
	}

	buf := make([]byte, 4)
	raw.SetReadDeadline(time.Now().Add(time.Second))
	if _, err := io.ReadFull(raw, buf); err != nil {
		t.Fatalf("expected the queued message to have actually reached the socket: %v", err)
	}
}

func TestMsgLimiterThrottlesBurst(t *testing.T) {
	l := newMsgLimiter(1, 5)
	for i := 0; i < 5; i++ {
		if !l.allow() {
			t.Fatalf("call %d: expected allow within a burst of 5", i)
		}
	}
	if l.allow() {
		t.Fatal("expected the 6th call to be throttled once the burst is exhausted")
	}
}

func TestMsgLimiterRefillsOverTime(t *testing.T) {
	l := newMsgLimiter(1000, 1) // fast refill so the test doesn't need a long sleep
	if !l.allow() {
		t.Fatal("first call should be allowed")
	}
	if l.allow() {
		t.Fatal("second call should be throttled immediately (burst of 1 exhausted)")
	}
	time.Sleep(10 * time.Millisecond) // >> 1 token at 1000/s
	if !l.allow() {
		t.Fatal("expected a token to have refilled after waiting")
	}
}
