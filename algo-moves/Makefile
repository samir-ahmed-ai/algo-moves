.PHONY: help install dev build preview typecheck check clean

NPM := npm

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(NPM) install

dev: ## Start Vite dev server (Network URL in terminal for phone QR scan)
	$(NPM) run dev

build: ## Typecheck and build for production
	$(NPM) run build

preview: build ## Serve production build locally
	$(NPM) run preview

typecheck: ## Run TypeScript without emitting
	$(NPM) run typecheck

check: typecheck build ## Run typecheck and production build

clean: ## Remove build artifacts and Vite cache
	rm -rf dist node_modules/.vite tsconfig.tsbuildinfo
