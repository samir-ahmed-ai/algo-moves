package ws

import (
	"bufio"
	"encoding/binary"
	"net"
	"testing"
	"time"
)

func TestAcceptKey(t *testing.T) {
	// The canonical example from RFC 6455 §1.3.
	got := acceptKey("dGhlIHNhbXBsZSBub25jZQ==")
	want := "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
	if got != want {
		t.Fatalf("acceptKey = %q, want %q", got, want)
	}
}

// writeMaskedFrame writes a single client frame (always masked) to w.
func writeMaskedFrame(w net.Conn, opcode byte, payload []byte) error {
	mask := [4]byte{0xA1, 0xB2, 0xC3, 0xD4}
	header := []byte{0x80 | opcode}
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
	if _, err := w.Write(header); err != nil {
		return err
	}
	_, err := w.Write(masked)
	return err
}

func newTestConn(raw net.Conn) *Conn {
	return &Conn{raw: raw, r: bufio.NewReader(raw)}
}

func TestReadMessage(t *testing.T) {
	cli, srv := net.Pipe()
	defer cli.Close()
	conn := newTestConn(srv)

	go func() { _ = writeMaskedFrame(cli, opText, []byte("hello 💍")) }()

	op, data, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("ReadMessage error: %v", err)
	}
	if op != opText {
		t.Fatalf("opcode = 0x%x, want text", op)
	}
	if string(data) != "hello 💍" {
		t.Fatalf("payload = %q", string(data))
	}
}

func TestReadFragmented(t *testing.T) {
	cli, srv := net.Pipe()
	defer cli.Close()
	conn := newTestConn(srv)

	go func() {
		// text frame, FIN=0
		mask := [4]byte{1, 2, 3, 4}
		part1 := []byte("foo")
		h1 := []byte{opText, 0x80 | byte(len(part1))}
		h1 = append(h1, mask[:]...)
		m1 := make([]byte, len(part1))
		for i := range part1 {
			m1[i] = part1[i] ^ mask[i%4]
		}
		cli.Write(h1)
		cli.Write(m1)
		// continuation, FIN=1
		_ = writeMaskedFrame(cli, opContinuation, []byte("bar"))
	}()

	_, data, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("ReadMessage error: %v", err)
	}
	if string(data) != "foobar" {
		t.Fatalf("reassembled = %q, want foobar", string(data))
	}
}

func TestWriteTextIsUnmasked(t *testing.T) {
	cli, srv := net.Pipe()
	defer cli.Close()
	conn := newTestConn(srv)

	go func() { _ = conn.WriteText([]byte("hi")) }()

	buf := make([]byte, 4)
	cli.SetReadDeadline(time.Now().Add(time.Second))
	if _, err := readFull(cli, buf); err != nil {
		t.Fatalf("read: %v", err)
	}
	// FIN|text, len=2 (no mask bit), then raw payload.
	if buf[0] != 0x81 || buf[1] != 0x02 || buf[2] != 'h' || buf[3] != 'i' {
		t.Fatalf("unexpected server frame bytes: % x", buf)
	}
}

func TestPingAutoPong(t *testing.T) {
	cli, srv := net.Pipe()
	defer cli.Close()
	conn := newTestConn(srv)

	errc := make(chan error, 1)
	go func() {
		_, _, err := conn.ReadMessage() // will block after auto-ponging the ping
		errc <- err
	}()

	// send a ping; expect a pong back on the wire.
	go func() { _ = writeMaskedFrame(cli, opPing, nil) }()

	cli.SetReadDeadline(time.Now().Add(time.Second))
	head := make([]byte, 2)
	if _, err := readFull(cli, head); err != nil {
		t.Fatalf("read pong: %v", err)
	}
	if head[0] != 0x80|opPong {
		t.Fatalf("expected pong frame, got 0x%x", head[0])
	}
	cli.Close()
	select {
	case <-errc:
	case <-time.After(time.Second):
		t.Fatal("ReadMessage did not return after close")
	}
}

func TestCloseFrameYieldsErrClosed(t *testing.T) {
	cli, srv := net.Pipe()
	defer cli.Close()
	conn := newTestConn(srv)

	go func() { _ = writeMaskedFrame(cli, opClose, nil) }()
	// drain the server's close echo so the write does not block on the pipe.
	go func() {
		buf := make([]byte, 8)
		cli.SetReadDeadline(time.Now().Add(time.Second))
		cli.Read(buf)
	}()

	_, _, err := conn.ReadMessage()
	if err != ErrClosed {
		t.Fatalf("err = %v, want ErrClosed", err)
	}
}

// readFull is io.ReadFull without importing io in the test's tiny surface.
func readFull(r net.Conn, buf []byte) (int, error) {
	total := 0
	for total < len(buf) {
		n, err := r.Read(buf[total:])
		total += n
		if err != nil {
			return total, err
		}
	}
	return total, nil
}
