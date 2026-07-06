package arcade

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// BootstrapPlatformAdmin ensures the configured platform admin exists when
// PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are set. Idempotent on every
// deploy: creates the account if missing, syncs password hash, and grants admin.
// With email only, promotes an existing account after signup/login (legacy behavior).
func (s *Service) BootstrapPlatformAdmin(ctx context.Context) {
	if s == nil || s.store == nil {
		return
	}

	email := strings.TrimSpace(strings.ToLower(os.Getenv("PLATFORM_ADMIN_EMAIL")))
	if email == "" {
		return
	}
	if !validEmail(email) {
		log.Printf("arcade: admin bootstrap warning: invalid PLATFORM_ADMIN_EMAIL")
		return
	}

	password := os.Getenv("PLATFORM_ADMIN_PASSWORD")
	if password == "" {
		ok, err := s.store.SetAdmin(ctx, email)
		if err != nil {
			log.Printf("arcade: admin bootstrap warning: %v", err)
		} else if ok {
			log.Printf("arcade: admin granted for %s", email)
		} else {
			log.Printf("arcade: admin email configured (%s) — waiting for account signup", email)
		}
		return
	}

	if len(password) < 8 {
		log.Printf("arcade: admin bootstrap warning: PLATFORM_ADMIN_PASSWORD must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		log.Printf("arcade: admin bootstrap warning: could not hash password: %v", err)
		return
	}

	displayName := strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_DISPLAY_NAME"))
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}

	p, _, err := s.store.ProfileByEmail(ctx, email)
	if err != nil {
		log.Printf("arcade: admin bootstrap warning: %v", err)
		return
	}

	if p == nil {
		if _, err := s.store.CreateEmailUser(ctx, email, string(hash), displayName); err != nil {
			log.Printf("arcade: admin bootstrap warning: could not create admin account: %v", err)
			return
		}
		log.Printf("arcade: platform admin account created for %s", email)
	} else if err := s.store.UpdatePasswordHash(ctx, email, string(hash)); err != nil {
		log.Printf("arcade: admin bootstrap warning: could not update admin password: %v", err)
		return
	} else {
		log.Printf("arcade: platform admin password synced for %s", email)
	}

	ok, err := s.store.SetAdmin(ctx, email)
	if err != nil {
		log.Printf("arcade: admin bootstrap warning: %v", err)
		return
	}
	if !ok {
		log.Printf("arcade: admin bootstrap warning: %s", fmt.Sprintf("admin flag not set for %s", email))
		return
	}
	log.Printf("arcade: admin granted for %s", email)
}
