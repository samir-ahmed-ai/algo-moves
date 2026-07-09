package search

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"algomoves/gameserver/internal/profile"
)

type stubAuth struct {
	profile *profile.Profile
	code    int
	msg     string
}

func (s stubAuth) ProfileFromRequest(context.Context, *http.Request) (*profile.Profile, int, string) {
	return s.profile, s.code, s.msg
}

type stubStore struct {
	hits []Hit
	err  error
	saw  struct {
		owner string
		q     string
		limit int
	}
}

func (s *stubStore) Search(_ context.Context, ownerID, query string, limit int) ([]Hit, error) {
	s.saw.owner = ownerID
	s.saw.q = query
	s.saw.limit = limit
	return s.hits, s.err
}

func TestRegister(t *testing.T) {
	mux := http.NewServeMux()
	h := &Handler{}
	h.Register(mux)
}

func TestHandleSearchRequiresSignIn(t *testing.T) {
	store := &stubStore{}
	h := NewHandler(store, stubAuth{
		profile: &profile.Profile{ID: "guest", IsAnonymous: true},
	})
	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=comcast", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestHandleSearchShortQuery(t *testing.T) {
	store := &stubStore{}
	h := NewHandler(store, stubAuth{
		profile: &profile.Profile{ID: "user-1", IsAnonymous: false},
	})
	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=a", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	var body struct {
		Hits []Hit `json:"hits"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.Hits) != 0 {
		t.Fatalf("hits = %v, want empty", body.Hits)
	}
	if store.saw.q != "" {
		t.Fatalf("store should not be called for short query")
	}
}

func TestHandleSearchOwnerScoped(t *testing.T) {
	store := &stubStore{
		hits: []Hit{{Kind: "plan", ID: "p1", Title: "Comcast prep", Score: 0.8}},
	}
	h := NewHandler(store, stubAuth{
		profile: &profile.Profile{ID: "user-42", IsAnonymous: false},
	})
	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=comcast&limit=5", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
	}
	if store.saw.owner != "user-42" || store.saw.q != "comcast" || store.saw.limit != 5 {
		t.Fatalf("store saw %+v", store.saw)
	}
	var body struct {
		Hits []Hit `json:"hits"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.Hits) != 1 || body.Hits[0].ID != "p1" {
		t.Fatalf("hits = %+v", body.Hits)
	}
}
