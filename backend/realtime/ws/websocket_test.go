package ws

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func TestUpgradeAndRoundTrip(t *testing.T) {
	connCh := make(chan *Conn, 1)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := Upgrade(w, r)
		if err != nil {
			return
		}
		connCh <- conn
	}))
	t.Cleanup(ts.Close)

	ctx := t.Context()
	client, _, err := websocket.Dial(ctx, ts.URL, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { client.Close(websocket.StatusNormalClosure, "") })

	select {
	case conn := <-connCh:
		if err := conn.WriteText([]byte("hello 💍")); err != nil {
			t.Fatalf("WriteText: %v", err)
		}
		_, data, err := client.Read(ctx)
		if err != nil {
			t.Fatalf("client read: %v", err)
		}
		if string(data) != "hello 💍" {
			t.Fatalf("payload = %q", string(data))
		}
	case <-time.After(2 * time.Second):
		t.Fatal("server never completed the upgrade")
	}
}

func TestReadMessageReturnsErrClosed(t *testing.T) {
	connCh := make(chan *Conn, 1)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := Upgrade(w, r)
		if err != nil {
			return
		}
		connCh <- conn
	}))
	t.Cleanup(ts.Close)

	ctx := t.Context()
	client, _, err := websocket.Dial(ctx, ts.URL, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}

	select {
	case conn := <-connCh:
		client.Close(websocket.StatusNormalClosure, "")
		_, _, err := conn.ReadMessage()
		if err != ErrClosed {
			t.Fatalf("err = %v, want ErrClosed", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("server never completed the upgrade")
	}
}

// upgradeTestConn performs a real RFC 6455 handshake for hub tests.
func upgradeTestConn(t *testing.T) (*Conn, net.Conn) {
	t.Helper()

	connCh := make(chan *Conn, 1)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := Upgrade(w, r)
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
