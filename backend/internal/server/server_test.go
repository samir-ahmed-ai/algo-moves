package server

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"algomoves/gameserver/internal/hub"
)

// wsClient is a minimal RFC 6455 client used only for integration testing. It
// speaks just enough of the protocol to exchange text frames with the server.
type wsClient struct {
	conn net.Conn
	r    *bufio.Reader
}

func dialWS(t *testing.T, serverURL, path string) *wsClient {
	t.Helper()
	addr := strings.TrimPrefix(serverURL, "http://")
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	req := fmt.Sprintf(
		"GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"+
			"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n",
		path, addr)
	if _, err := conn.Write([]byte(req)); err != nil {
		t.Fatalf("write handshake: %v", err)
	}
	br := bufio.NewReader(conn)
	// Read the status line + headers up to the blank line.
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
	return &wsClient{conn: conn, r: br}
}

func (c *wsClient) writeText(t *testing.T, payload []byte) {
	t.Helper()
	mask := [4]byte{0x12, 0x34, 0x56, 0x78}
	header := []byte{0x81} // FIN + text
	n := len(payload)
	switch {
	case n < 126:
		header = append(header, 0x80|byte(n))
	case n < 1<<16:
		header = append(header, 0x80|126, byte(n>>8), byte(n))
	default:
		var ext [8]byte
		binary.BigEndian.PutUint64(ext[:], uint64(n))
		header = append(header, 0x80|127)
		header = append(header, ext[:]...)
	}
	header = append(header, mask[:]...)
	masked := make([]byte, n)
	for i := range payload {
		masked[i] = payload[i] ^ mask[i%4]
	}
	if _, err := c.conn.Write(append(header, masked...)); err != nil {
		t.Fatalf("writeText: %v", err)
	}
}

// readMessage returns the next text message, transparently skipping server
// ping/pong control frames.
func (c *wsClient) readMessage(t *testing.T) map[string]any {
	t.Helper()
	c.conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	for {
		var head [2]byte
		if _, err := io.ReadFull(c.r, head[:]); err != nil {
			t.Fatalf("read frame header: %v", err)
		}
		opcode := head[0] & 0x0f
		length := uint64(head[1] & 0x7f)
		switch length {
		case 126:
			var ext [2]byte
			io.ReadFull(c.r, ext[:])
			length = uint64(binary.BigEndian.Uint16(ext[:]))
		case 127:
			var ext [8]byte
			io.ReadFull(c.r, ext[:])
			length = binary.BigEndian.Uint64(ext[:])
		}
		payload := make([]byte, length)
		if _, err := io.ReadFull(c.r, payload); err != nil {
			t.Fatalf("read frame payload: %v", err)
		}
		if opcode == 0x9 || opcode == 0xA { // ping/pong — ignore
			continue
		}
		var v map[string]any
		if err := json.Unmarshal(payload, &v); err != nil {
			t.Fatalf("unmarshal %q: %v", string(payload), err)
		}
		return v
	}
}

func (c *wsClient) close() { c.conn.Close() }

func newTestServer() *httptest.Server {
	return httptest.NewServer(Handler(hub.New()))
}

func TestNewCodeEndpoint(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/new")
	if err != nil {
		t.Fatalf("GET /new: %v", err)
	}
	defer resp.Body.Close()
	if resp.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("missing CORS header on /new")
	}
	var body struct{ Code string }
	json.NewDecoder(resp.Body).Decode(&body)
	if len(body.Code) != 4 {
		t.Fatalf("code = %q, want length 4", body.Code)
	}
}

func TestHealthz(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/healthz")
	if err != nil {
		t.Fatalf("GET /healthz: %v", err)
	}
	defer resp.Body.Close()
	var body struct {
		Status string
		Rooms  int
	}
	json.NewDecoder(resp.Body).Decode(&body)
	if body.Status != "ok" {
		t.Fatalf("status = %q, want ok", body.Status)
	}
}

func TestEndToEndRelay(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	host := dialWS(t, ts.URL, "/ws?room=LOVE&name=Ahmed")
	defer host.close()
	welcome := host.readMessage(t)
	if welcome["t"] != "welcome" || welcome["self"].(map[string]any)["role"] != "host" {
		t.Fatalf("host welcome = %v, want role host", welcome)
	}

	guest := dialWS(t, ts.URL, "/ws?room=LOVE&name=Nour")
	defer guest.close()
	gw := guest.readMessage(t)
	if gw["self"].(map[string]any)["role"] != "guest" {
		t.Fatalf("guest role = %v, want guest", gw["self"])
	}
	if peers := gw["peers"].([]any); len(peers) != 1 {
		t.Fatalf("guest sees %d peers, want 1", len(peers))
	}

	// Host should be notified that the guest joined.
	if pj := host.readMessage(t); pj["t"] != "peer-join" {
		t.Fatalf("host expected peer-join, got %v", pj["t"])
	}

	// Host relays a game move; guest must receive it verbatim.
	host.writeText(t, []byte(`{"t":"relay","d":{"guess":42}}`))
	relay := guest.readMessage(t)
	if relay["t"] != "relay" {
		t.Fatalf("guest expected relay, got %v", relay["t"])
	}
	d := relay["d"].(map[string]any)
	if d["guess"].(float64) != 42 {
		t.Fatalf("relayed guess = %v, want 42", d["guess"])
	}
}

func TestBannerHandler(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/")
	if err != nil {
		t.Fatalf("GET /: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "Algo Moves game server") {
		t.Fatalf("banner body = %q, want it to mention the game server", body)
	}

	resp2, err := http.Get(ts.URL + "/nonexistent")
	if err != nil {
		t.Fatalf("GET /nonexistent: %v", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != http.StatusNotFound {
		t.Fatalf("status for unknown path = %d, want 404", resp2.StatusCode)
	}
}

func TestNewAndHealthzRejectNonGET(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	for _, path := range []string{"/new", "/healthz"} {
		resp, err := http.Post(ts.URL+path, "application/json", nil)
		if err != nil {
			t.Fatalf("POST %s: %v", path, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusMethodNotAllowed {
			t.Fatalf("POST %s status = %d, want 405", path, resp.StatusCode)
		}
	}
}

// TestCorsJSONRequiresOriginOnNewWhenAllowlisted covers the /new vs /healthz
// asymmetry: once ALLOWED_ORIGINS is configured, /new must reject a request
// with no Origin header at all (mirroring /ws's strictness), while /healthz
// must keep serving plain infra healthchecks that never send one.
func TestCorsJSONRequiresOriginOnNewWhenAllowlisted(t *testing.T) {
	t.Setenv("ALLOWED_ORIGINS", "https://good.example")
	ts := httptest.NewServer(Handler(hub.New()))
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/new")
	if err != nil {
		t.Fatalf("GET /new: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("/new with no Origin, allowlist configured: status = %d, want 403", resp.StatusCode)
	}

	req, _ := http.NewRequest(http.MethodGet, ts.URL+"/new", nil)
	req.Header.Set("Origin", "https://good.example")
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET /new with allowed origin: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("/new with allowed Origin: status = %d, want 200", resp2.StatusCode)
	}

	// /healthz must remain reachable with no Origin header even though the
	// allowlist is configured, since infra healthchecks never send one.
	resp3, err := http.Get(ts.URL + "/healthz")
	if err != nil {
		t.Fatalf("GET /healthz: %v", err)
	}
	resp3.Body.Close()
	if resp3.StatusCode != http.StatusOK {
		t.Fatalf("/healthz with no Origin, allowlist configured: status = %d, want 200", resp3.StatusCode)
	}
}

func TestEndToEndRoomFull(t *testing.T) {
	ts := newTestServer()
	defer ts.Close()

	host := dialWS(t, ts.URL, "/ws?room=FULL&name=Host")
	defer host.close()
	host.readMessage(t)

	guest := dialWS(t, ts.URL, "/ws?room=FULL&name=Guest")
	defer guest.close()
	guest.readMessage(t)
	host.readMessage(t) // peer-join

	third := dialWS(t, ts.URL, "/ws?room=FULL&name=Third")
	defer third.close()
	msg := third.readMessage(t)
	if msg["t"] != "error" {
		t.Fatalf("third join expected error, got %v", msg)
	}
	if msg["msg"] != "room-full" {
		t.Fatalf("error msg = %v, want room-full", msg["msg"])
	}
}
