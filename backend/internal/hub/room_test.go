package hub

import (
	"encoding/json"
	"fmt"
	"testing"
)

func TestSpectatorGalleryCapRejectsOverflow(t *testing.T) {
	h := New() // capacity 2
	h.Join("R", &rec{id: "p1"}, "")
	h.Join("R", &rec{id: "p2"}, "")

	// Fill the spectator gallery exactly to its cap; every one should get in.
	for i := 0; i < maxSpectators; i++ {
		s := &rec{id: fmt.Sprintf("s%d", i)}
		if role, ok := h.Join("R", s, ""); !ok || role != RoleSpectator {
			t.Fatalf("spectator %d join = (%v,%v), want (spectator,true)", i, role, ok)
		}
	}

	// One more spectator past the cap is rejected with room-full.
	over := &rec{id: "over"}
	if _, ok := h.Join("R", over, ""); ok {
		t.Fatal("a spectator past the gallery cap should be rejected")
	}
	if over.lastOfType("error") == nil {
		t.Fatal("the rejected spectator should receive an error message")
	}
}

func TestCapacityAllowsMorePlayersThenSpectators(t *testing.T) {
	h := New()
	opts := JoinOptions{Capacity: 4}

	wantRoles := []Role{RoleHost, RoleGuest, RolePlayer, RolePlayer}
	for i, want := range wantRoles {
		c := &rec{id: string(rune('a' + i))}
		role, ok := h.JoinWith("R", c, "", opts)
		if !ok || role != want {
			t.Fatalf("player %d join = (%v,%v), want (%v,true)", i, role, ok, want)
		}
	}

	// The fifth joiner overflows the four seats and becomes a spectator.
	fifth := &rec{id: "e"}
	role, ok := h.JoinWith("R", fifth, "", opts)
	if !ok || role != RoleSpectator {
		t.Fatalf("fifth join = (%v,%v), want (spectator,true)", role, ok)
	}
	w := fifth.lastOfType("welcome")
	if players, _ := w["players"].([]any); len(players) != 4 {
		t.Fatalf("welcome players = %v, want 4", w["players"])
	}
	if capVal, _ := w["capacity"].(float64); int(capVal) != 4 {
		t.Fatalf("welcome capacity = %v, want 4", w["capacity"])
	}
}

func TestCapacityIsClampedToBounds(t *testing.T) {
	h := New()
	// A wildly large request is clamped to maxCapacity; a 100th joiner still
	// can't take a seat beyond it.
	big := &rec{id: "big"}
	h.JoinWith("R", big, "", JoinOptions{Capacity: 999})
	w := big.lastOfType("welcome")
	if capVal, _ := w["capacity"].(float64); int(capVal) != maxCapacity {
		t.Fatalf("welcome capacity = %v, want %d (clamped)", w["capacity"], maxCapacity)
	}
}

func TestExplicitSpectatorDoesNotTakeAFreeSeat(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	if _, ok := h.Join("R", host, ""); !ok {
		t.Fatal("host join failed")
	}
	watcher := &rec{id: "w"}
	role, ok := h.JoinWith("R", watcher, "", JoinOptions{AsSpectator: true})
	if !ok || role != RoleSpectator {
		t.Fatalf("explicit spectator = (%v,%v), want (spectator,true) despite a free seat", role, ok)
	}
	// The free guest seat is still free: a later player takes it as guest.
	guest := &rec{id: "g"}
	if role, _ := h.Join("R", guest, ""); role != RoleGuest {
		t.Fatalf("next player role = %v, want guest (seat 1 still free)", role)
	}
}

func TestRelayAndStateReachSpectators(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	watcher := &rec{id: "w"}
	h.Join("R", host, "")
	h.JoinWith("R", watcher, "", JoinOptions{AsSpectator: true})

	h.Relay("R", host, json.RawMessage(`{"move":1}`))
	if watcher.lastOfType("relay") == nil {
		t.Fatal("spectator did not receive the relayed move")
	}

	h.SetState("R", host, json.RawMessage(`{"game":"tic-tac-toe"}`))
	st := watcher.lastOfType("state")
	if st == nil {
		t.Fatal("spectator did not receive the shared state broadcast")
	}
}

func TestSpectatorSeesStateOnJoin(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	h.Join("R", host, "")
	h.SetState("R", host, json.RawMessage(`{"game":"mind-meld"}`))

	watcher := &rec{id: "w"}
	h.JoinWith("R", watcher, "", JoinOptions{AsSpectator: true})
	w := watcher.lastOfType("welcome")
	state, _ := w["state"].(map[string]any)
	if state == nil || state["game"] != "mind-meld" {
		t.Fatalf("spectator welcome state = %v, want game=mind-meld", w["state"])
	}
}

func TestSpectatorClaimsFreeSeat(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	watcher := &rec{id: "w"}
	h.Join("R", host, "")
	h.JoinWith("R", watcher, "", JoinOptions{AsSpectator: true})

	h.SetSeat("R", watcher, true) // become a player
	if watcher.Role() != RoleGuest {
		t.Fatalf("watcher role after claiming seat = %v, want guest", watcher.Role())
	}
	// Everyone hears the role-change.
	if host.lastOfType("role-change") == nil {
		t.Fatal("host was not told the spectator claimed a seat")
	}
	rc := watcher.lastOfType("role-change")
	if rc == nil {
		t.Fatal("new player got no role-change for itself")
	}
	if peer, _ := rc["peer"].(map[string]any); peer["role"] != "guest" {
		t.Fatalf("role-change peer role = %v, want guest", rc["peer"])
	}
}

func TestSeatClaimRejectedWhenFull(t *testing.T) {
	h := New() // capacity 2
	h.Join("R", &rec{id: "h"}, "")
	h.Join("R", &rec{id: "g"}, "")
	watcher := &rec{id: "w"}
	h.Join("R", watcher, "") // overflow -> spectator

	h.SetSeat("R", watcher, true) // no free seat
	if watcher.Role() != RoleSpectator {
		t.Fatalf("watcher role = %v, want spectator (seats full)", watcher.Role())
	}
	if watcher.lastOfType("error") == nil {
		t.Fatal("claiming a full seat should surface an error")
	}
}

func TestPlayerStepsDownToSpectator(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	guest := &rec{id: "g"}
	h.Join("R", host, "")
	h.Join("R", guest, "")

	h.SetSeat("R", guest, false) // step down
	if guest.Role() != RoleSpectator {
		t.Fatalf("guest role after stepping down = %v, want spectator", guest.Role())
	}
	// The vacated seat is available again to a newcomer.
	newcomer := &rec{id: "n"}
	if role, _ := h.Join("R", newcomer, ""); role != RoleGuest {
		t.Fatalf("newcomer role = %v, want guest (vacated seat reused)", role)
	}
}

func TestReconnectingHostStaysHostWhileGuestPresent(t *testing.T) {
	h := New()
	host := &rec{id: "h"}
	guest := &rec{id: "g"}
	h.Join("R", host, "pid-host")
	h.Join("R", guest, "pid-guest")

	// Host blips: its socket drops (Leave fires) but the guest stays. The seat
	// is tombstoned with the pid retained.
	h.Leave("R", host)

	hostAgain := &rec{id: "h2"}
	role, ok := h.Join("R", hostAgain, "pid-host")
	if !ok || role != RoleHost {
		t.Fatalf("reconnecting host = (%v,%v), want (host,true) — guest must not be promoted", role, ok)
	}
	if guest.Role() != RoleGuest {
		t.Fatalf("guest role = %v, want guest (unchanged by host's blip)", guest.Role())
	}
}
