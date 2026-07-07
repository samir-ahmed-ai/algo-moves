package platform

import (
	"context"
	"net/http"
)

type Authenticator interface {
	ProfileFromRequest(ctx context.Context, r *http.Request) (*Profile, int, string)
}
