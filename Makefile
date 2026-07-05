.DEFAULT_GOAL := help

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

NPM := npm --prefix frontend
GO := go
BACKEND_DIR := backend
FRONTEND_PORT := 4321
BACKEND_PORT := 8080

# ANSI (no-op when stdout is not a TTY)
ifeq ($(shell test -t 1 && echo yes),yes)
  BOLD  := \033[1m
  DIM   := \033[2m
  CYAN  := \033[36m
  GREEN := \033[32m
  YELLOW:= \033[33m
  RESET := \033[0m
else
  BOLD  :=
  DIM   :=
  CYAN  :=
  GREEN :=
  YELLOW:=
  RESET :=
endif

##@ Help

help: ## Show all available commands (default)
	@printf '\n$(BOLD)Algo Moves$(RESET) — monorepo task runner\n'
	@printf '$(DIM)Run $(CYAN)make <target>$(RESET)$(DIM); URLs use localhost — use the Network URL from Vite for phones on LAN.$(RESET)\n\n'
	@awk 'BEGIN {FS = ":.*?## "} \
		/^##@/ { printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5); next } \
		/^[a-zA-Z0-9_.-]+:.*## / { printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@printf '\n$(DIM)Quick start:$(RESET) $(CYAN)make install$(RESET) → $(CYAN)make start$(RESET)  $(DIM)(frontend :$(FRONTEND_PORT) + backend :$(BACKEND_PORT))$(RESET)\n\n'

##@ Setup

install: _require-node ## Install frontend npm dependencies
	$(NPM) install

##@ Development

start: dev-all ## Run frontend + backend together (recommended for games)

dev-all: _require-node _require-go _require-frontend-deps _free-dev-ports ## Frontend (:4321) + backend (:8080); reclaims ports; Ctrl+C stops both
	@printf '\n$(BOLD)Starting full stack$(RESET)\n'
	@printf '  $(GREEN)Frontend$(RESET)  http://localhost:$(FRONTEND_PORT)  $(DIM)(Vite prints LAN URL for phones)$(RESET)\n'
	@printf '  $(GREEN)Backend$(RESET)   http://localhost:$(BACKEND_PORT)  $(DIM)(WebSocket games + optional arcade API)$(RESET)\n'
	@printf '  $(DIM)Press Ctrl+C to stop both services.$(RESET)\n\n'
	@trap 'printf "\n$(YELLOW)Stopping…$(RESET)\n"; kill 0 2>/dev/null || true' INT TERM; \
	$(MAKE) --no-print-directory backend-dev & \
	$(MAKE) --no-print-directory frontend-dev & \
	wait

frontend: frontend-dev ## Alias — start the Vite dev server

frontend-dev: _require-node _require-frontend-deps ## Vite dev server on :4321 (LAN URL in terminal)
	@$(MAKE) --no-print-directory _free-port PORT=$(FRONTEND_PORT) NAME=Frontend
	@printf '$(BOLD)Frontend$(RESET) → http://localhost:$(FRONTEND_PORT)\n'
	$(NPM) run dev

dev: frontend-dev ## Alias — start the Vite dev server

backend: backend-dev ## Alias — start the Go game server

backend-dev: _require-go ## Go game server on :8080 (override with PORT=…)
	@$(MAKE) --no-print-directory _free-port PORT=$(BACKEND_PORT) NAME=Backend
	@printf '$(BOLD)Backend$(RESET)  → http://localhost:$(BACKEND_PORT)\n'
	cd $(BACKEND_DIR) && PORT=$(BACKEND_PORT) $(GO) run ./cmd/gameserver

preview: build ## Serve the production frontend build locally
	$(NPM) run preview

##@ Build & test

build: _require-node ## Typecheck and build the frontend for production
	$(NPM) run build

typecheck: _require-node ## Run TypeScript without emitting
	$(NPM) run typecheck

test: _require-node ## Frontend unit tests (Vitest + orphan check)
	$(NPM) test

check: _require-node _require-go ## Full CI parity: frontend + backend tests and checks
	$(NPM) test
	$(NPM) run typecheck
	$(NPM) run check:all
	$(NPM) run check-mobile-decks
	$(NPM) run build
	$(MAKE) backend-test

backend-build: _require-go ## Compile gameserver binary → backend/bin/
	cd $(BACKEND_DIR) && $(GO) build -o bin/gameserver ./cmd/gameserver

backend-test: _require-go ## Run backend Go tests
	cd $(BACKEND_DIR) && $(GO) test ./...

##@ Database

db-migrate: ## Apply arcade schema to DATABASE_URL (see db/README.md)
	./scripts/migrate-db.sh

content-seed: _require-node ## Regenerate db/content_seed.sql and apply to DATABASE_URL
	$(NPM) run export-content-sql
	SEED_CONTENT=1 ./scripts/migrate-db.sh

##@ Cleanup

clean: backend-clean ## Remove build artifacts and caches (frontend + backend)
	rm -rf frontend/dist frontend/node_modules/.vite \
	       frontend/tsconfig.tsbuildinfo frontend/tsconfig.node.tsbuildinfo \
	       frontend/vite.config.js frontend/vite.config.d.ts

backend-clean: _require-go ## Remove Go build artifacts and test caches
	cd $(BACKEND_DIR) && $(GO) clean -testcache && rm -rf bin

_require-node:
	@command -v node >/dev/null 2>&1 || { \
		printf '$(YELLOW)Node.js is required.$(RESET) Install from https://nodejs.org/ then run $(CYAN)make install$(RESET).\n' >&2; \
		exit 1; \
	}

_require-go:
	@command -v go >/dev/null 2>&1 || { \
		printf '$(YELLOW)Go is required for backend targets.$(RESET) Install from https://go.dev/dl/\n' >&2; \
		exit 1; \
	}

_require-frontend-deps:
	@test -d frontend/node_modules || { \
		printf '$(YELLOW)Frontend dependencies missing.$(RESET) Run $(CYAN)make install$(RESET) first.\n' >&2; \
		exit 1; \
	}

_free-dev-ports:
	@$(MAKE) --no-print-directory _free-port PORT=$(FRONTEND_PORT) NAME=Frontend
	@$(MAKE) --no-print-directory _free-port PORT=$(BACKEND_PORT) NAME=Backend

_free-port:
	@port='$(PORT)'; \
	label='$(NAME)'; \
	pids=$$(lsof -ti tcp:$$port -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$$//'); \
	if [[ -z "$$pids" ]]; then exit 0; fi; \
	printf '$(YELLOW)%s :%s in use (PID %s) — stopping…$(RESET)\n' "$$label" "$$port" "$$pids"; \
	kill $$pids 2>/dev/null || true; \
	for _ in 1 2 3 4 5 6 7 8 9 10; do \
		sleep 0.2; \
		remaining=$$(lsof -ti tcp:$$port -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$$//'); \
		[[ -z "$$remaining" ]] && exit 0; \
	done; \
	printf '$(YELLOW)%s :%s still busy (PID %s) — force stopping…$(RESET)\n' "$$label" "$$port" "$$remaining"; \
	kill -9 $$remaining 2>/dev/null || true

.PHONY: help install start dev-all frontend frontend-dev dev backend backend-dev \
        preview build typecheck test check backend-build backend-test \
        db-migrate content-seed clean backend-clean \
        _require-node _require-go _require-frontend-deps _free-dev-ports _free-port
