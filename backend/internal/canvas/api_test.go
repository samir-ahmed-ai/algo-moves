package canvas

import (
	"net/http"
	"testing"
)

func TestRegister(t *testing.T) {
	mux := http.NewServeMux()
	// This ensures the Handler struct implements the Register method and doesn't panic
	h := &Handler{}
	h.Register(mux)
}
