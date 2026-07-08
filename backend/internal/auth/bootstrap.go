package auth

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"algomoves/gameserver/internal/profile"
	"golang.org/x/crypto/bcrypt"
)

// BootstrapPlatformAdmin ensures the configured platform admin exists when
// PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are set.
func BootstrapPlatformAdmin(ctx context.Context, profiles *profile.Repository) {
	if profiles == nil {
		return
	}

	email := strings.TrimSpace(strings.ToLower(os.Getenv("PLATFORM_ADMIN_EMAIL")))
	if email == "" {
		return
	}
	if !ValidEmail(email) {
		slog.Warn("app: admin bootstrap warning: invalid PLATFORM_ADMIN_EMAIL")
		return
	}

	password := os.Getenv("PLATFORM_ADMIN_PASSWORD")
	if password == "" {
		ok, err := profiles.SetAdmin(ctx, email)
		if err != nil {
			slog.Warn("app: admin bootstrap warning", "error", err)
		} else if ok {
			slog.Info("app: admin granted for", "email", email)
		} else {
			slog.Info("app: admin email configured — waiting for account signup", "email", email)
		}
		return
	}

	if len(password) < 8 {
		slog.Warn("app: admin bootstrap warning: PLATFORM_ADMIN_PASSWORD must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		slog.Warn("app: admin bootstrap warning: could not hash password", "error", err)
		return
	}

	displayName := strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_DISPLAY_NAME"))
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}

	p, _, err := profiles.ProfileByEmail(ctx, email)
	if err != nil {
		slog.Warn("app: admin bootstrap warning", "error", err)
		return
	}

	if p == nil {
		if _, err := profiles.CreateEmailUser(ctx, email, string(hash), displayName); err != nil {
			slog.Warn("app: admin bootstrap warning: could not create admin account", "error", err)
			return
		}
		slog.Info("app: platform admin account created for", "email", email)
	} else if err := profiles.UpdatePasswordHash(ctx, email, string(hash)); err != nil {
		slog.Warn("app: admin bootstrap warning: could not update admin password", "error", err)
		return
	} else {
		slog.Info("app: platform admin password synced for", "email", email)
	}

	ok, err := profiles.SetAdmin(ctx, email)
	if err != nil {
		slog.Warn("app: admin bootstrap warning", "error", err)
		return
	}
	if !ok {
		slog.Warn("app: admin bootstrap warning", "error", fmt.Sprintf("admin flag not set for %s", email))
		return
	}
	slog.Info("app: admin granted for", "email", email)
}
