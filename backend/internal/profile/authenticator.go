package profile

import (
	"context"
	"net/http"
)

// Authenticator resolves the signed-in profile from a request.
type Authenticator interface {
	ProfileFromRequest(ctx context.Context, r *http.Request) (*Profile, int, string)
}
