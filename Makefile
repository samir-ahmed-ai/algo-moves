.PHONY: help install dev build preview typecheck check clean \
        backend backend-dev backend-build backend-test dev-all

NPM := npm --prefix frontend
GO := go
BACKEND_DIR := backend

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install frontend dependencies
	$(NPM) install

dev: ## Start Vite dev server (Network URL in terminal for phone QR scan)
	$(NPM) run dev

build: ## Typecheck and build the frontend for production
	$(NPM) run build

preview: build ## Serve the production build locally
	$(NPM) run preview

typecheck: ## Run TypeScript without emitting
	$(NPM) run typecheck

check: ## Full CI parity: frontend tests + build + backend tests
	$(NPM) test
	$(NPM) run typecheck
	$(NPM) run check:all
	$(NPM) run check-mobile-decks
	$(NPM) run build
	$(MAKE) backend-test

dev-all: ## Run frontend (:4321) and backend (:8080) together
	@echo "Starting frontend on :4321 and backend on :8080 (Ctrl+C stops both)…"
	@$(MAKE) -j2 dev backend-dev

backend-dev: ## Run the Go game server (hot addr :8080, override with PORT)
	cd $(BACKEND_DIR) && $(GO) run ./cmd/gameserver

backend: backend-dev ## Alias for backend-dev

backend-build: ## Compile the Go game server binary into backend/bin/
	cd $(BACKEND_DIR) && $(GO) build -o bin/gameserver ./cmd/gameserver

backend-test: ## Run backend Go tests
	cd $(BACKEND_DIR) && $(GO) test ./...

clean: ## Remove build artifacts and caches (frontend + backend)
	rm -rf frontend/dist frontend/node_modules/.vite \
	       frontend/tsconfig.tsbuildinfo frontend/tsconfig.node.tsbuildinfo \
	       frontend/vite.config.js frontend/vite.config.d.ts \
	       backend/bin
