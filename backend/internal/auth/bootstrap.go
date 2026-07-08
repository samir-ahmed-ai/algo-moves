package auth

import (
	"context"
	"fmt"
	"log"
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
		log.Printf("app: admin bootstrap warning: invalid PLATFORM_ADMIN_EMAIL")
		return
	}

	password := os.Getenv("PLATFORM_ADMIN_PASSWORD")
	if password == "" {
		ok, err := profiles.SetAdmin(ctx, email)
		if err != nil {
			log.Printf("app: admin bootstrap warning: %v", err)
		} else if ok {
			log.Printf("app: admin granted for %s", email)
		} else {
			log.Printf("app: admin email configured (%s) — waiting for account signup", email)
		}
		return
	}

	if len(password) < 8 {
		log.Printf("app: admin bootstrap warning: PLATFORM_ADMIN_PASSWORD must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		log.Printf("app: admin bootstrap warning: could not hash password: %v", err)
		return
	}

	displayName := strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_DISPLAY_NAME"))
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}

	p, _, err := profiles.ProfileByEmail(ctx, email)
	if err != nil {
		log.Printf("app: admin bootstrap warning: %v", err)
		return
	}

	if p == nil {
		if _, err := profiles.CreateEmailUser(ctx, email, string(hash), displayName); err != nil {
			log.Printf("app: admin bootstrap warning: could not create admin account: %v", err)
			return
		}
		log.Printf("app: platform admin account created for %s", email)
	} else if err := profiles.UpdatePasswordHash(ctx, email, string(hash)); err != nil {
		log.Printf("app: admin bootstrap warning: could not update admin password: %v", err)
		return
	} else {
		log.Printf("app: platform admin password synced for %s", email)
	}

	ok, err := profiles.SetAdmin(ctx, email)
	if err != nil {
		log.Printf("app: admin bootstrap warning: %v", err)
		return
	}
	if !ok {
		log.Printf("app: admin bootstrap warning: %s", fmt.Sprintf("admin flag not set for %s", email))
		return
	}
	log.Printf("app: admin granted for %s", email)
}
