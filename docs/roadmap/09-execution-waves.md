# Execution Waves Checklist

> Tracks the 100-task domain-isolation refactor (W0–W7) from the [Domain Isolation Cleanup plan](https://github.com/). Update this file at the end of each wave. Verification gate: `make check` (frontend `check:all` + `go test ./...`).

**Legend:** ✅ done · 🟡 partial · ⬜ pending

---

## Wave 0 — Complete DB (12 tasks)

| ID | Task | Status |
|----|------|--------|
| W0-01 | Delete orphan `backend/db/migrations/` | ✅ |
| W0-02 | Normalize `012_yjs_documents.sql` style | ✅ |
| W0-03 | Regenerate sqlc after 012 → `YjsDocument` model | ✅ |
| W0-04 | Add `backend/db/queries/games.sql` | ✅ |
| W0-05 | Wire games queries into Store + `/api/games` | ✅ |
| W0-06 | Update `db/README.md` (migrations 001–013) | ✅ |
| W0-07 | Add `schema_migrations` audit table + bootstrap | ✅ |
| W0-08 | Populate complexity columns in `export-content-sql.mts` | ✅ |
| W0-09 | Re-export `db/content_seed.sql`; `check-content-sql` green | ✅ |
| W0-10 | Document dual canvas persistence in `docs/architecture.md` | ✅ |
| W0-11 | Integration test: Hocuspocus ↔ `yjs_documents` | ✅ |
| W0-12 | CI: `sqlc generate` + `git diff --exit-code` | ✅ |

---

## Wave 1 — Platform layer extraction (15 tasks)

| ID | Task | Status |
|----|------|--------|
| W1-01 | Create `frontend/src/platform/` barrel | ✅ |
| W1-02 | Move `arcadeClient.ts` → `platform/api/` | ✅ |
| W1-03 | Move shared types → `platform/api/types.ts` | ✅ |
| W1-04 | Extract `arcadeFetch` + config resolver | ✅ |
| W1-05 | Move profile stubs → `platform/api/profileApi.ts` | ✅ |
| W1-06 | Repoint `AuthProvider` to `@/platform` | ✅ |
| W1-07 | Repoint `prepPlansApi` to `@/platform` | ✅ |
| W1-08 | Thin deprecated re-exports in `shell/games/data/` | ✅ |
| W1-09 | ESLint zone: non-games shell cannot import `shell/games` | ✅ |
| W1-10 | Add `platform` layer to `check-boundaries.mjs` | ✅ |
| W1-11 | Move `Avatar` to `@/design/components` | ✅ |
| W1-12 | Repoint `AuthButton` to shared Avatar | ✅ |
| W1-13 | Add `platform/api/*.test.ts` | ✅ |
| W1-14 | Update test mocks to `@/platform` | ✅ |
| W1-15 | Delete deprecated `shell/games/data` re-exports | ✅ Wave 8: orphan `arcadeClient` + games `AuthProvider` shim removed |

---

## Wave 2 — Games domain isolation (12 tasks)

| ID | Task | Status |
|----|------|--------|
| W2-01 | Add `shell/games/index.ts` barrel | ✅ |
| W2-02 | Game REST in `shell/games/data/` via `@/platform` | ✅ |
| W2-03 | `shell/games/net/*` re-exports from `@/shell/realtime` only | ✅ |
| W2-04 | Document nested room state contract | ✅ |
| W2-05 | Move `soundConfig` persistence wiring | ✅ |
| W2-06 | ESLint: forbid games imports from study/canvas/interview | ✅ |
| W2-07 | Split `GamesPage.tsx` (<300 LOC submodules) | ✅ Root ~25 LOC; submodules extracted |
| W2-08 | Extract shared chat UI | ✅ `@/components/chat/*`; thin `ChatDock` + collab `ChatBody` |
| W2-09 | Align game IDs with `010_games_catalog.sql` | ✅ |
| W2-10 | Characterization tests per game plugin | ✅ |
| W2-11 | `shell/games/README.md` domain contract | ✅ |
| W2-12 | Verify `/games` loads with zero canvas/collab imports | ✅ |

---

## Wave 3 — Interview & collab isolation (14 tasks)

| ID | Task | Status |
|----|------|--------|
| W3-01 | Create `shell/interview/` | ✅ |
| W3-02 | Create `shell/collab/` transport layer | ✅ |
| W3-03 | Move `interviewApi.ts` → `platform/api/` | ✅ |
| W3-04 | Move `useInterviewBoardPersistence` → `shell/interview/` | ✅ |
| W3-05 | Move interview widgets → `shell/interview/` | ✅ |
| W3-06 | Refactor `CanvasCollabProvider` interview injection | ✅ |
| W3-07 | Collab uses `@/shell/auth` + `@/platform` (not games path) | ✅ |
| W3-08 | Collab widgets use `@/shell/realtime` (not games) | ✅ |
| W3-09 | `shell/interview/index.ts` + `shell/collab/index.ts` barrels | ✅ |
| W3-10 | ESLint zones: interview/collab cannot import `shell/games` | ✅ |
| W3-11 | Split room envelope: game vs interview runtime | ✅ |
| W3-12 | Interview tests (timer, lock, frame-follow) | ✅ |
| W3-13 | Update `docs/architecture.md` session model | ✅ |
| W3-14 | Verify canvas + interview with Postgres and relay modes | ✅ |

---

## Wave 4 — Aggressive legacy removal (15 tasks)

| ID | Task | Status |
|----|------|--------|
| W4-01 | Delete `useLegacyCanvasDocRelay.ts` | ✅ |
| W4-02 | Remove `VITE_YJS_TRANSPORT=false` path | ✅ |
| W4-03 | Require `VITE_HOCUSPOCUS_URL` for prod collab | ✅ |
| W4-04 | Remove legacy-relay messaging from transport banner | ✅ |
| W4-05 | Delete hash URL shims (`mobileHash`, `gamesHash`, `vimHash`) | ✅ |
| W4-06 | Remove `normalizeLegacyUrl()` from routing | ✅ |
| W4-07 | Remove bare `CanvasDoc` envelope in `roomState.ts` | ✅ |
| W4-08 | Remove `profiles.session_token` bearer fallback in HTTP | ✅ Cookie-only SCS auth (Wave 8); DB column retained for schema compat |
| W4-09 | Delete `useYjsCanvasShadow.ts` shim | ✅ |
| W4-10 | Remove deprecated `nodeui.tsx` barrel | ✅ Deleted; importers use `@/design/components` |
| W4-11 | Remove `practice` tab alias in `normalizeCanvasMode()` | ✅ |
| W4-12 | Remove legacy share-link mode without item | ✅ |
| W4-13 | Remove SRS SM-2-lite migration | ✅ |
| W4-14 | Remove assemble rush key migration | ✅ |
| W4-15 | Delete stale docs referencing removed paths | ✅ |

---

## Wave 5 — Backend package split (12 tasks)

| ID | Task | Status |
|----|------|--------|
| W5-01 | Create `backend/internal/platform/` | ✅ |
| W5-02 | Create `backend/internal/games/` | ✅ |
| W5-03 | Create `backend/internal/interview/` | ✅ |
| W5-04 | Create `backend/internal/content/` | ✅ |
| W5-05 | Create `backend/internal/canvas/` | ✅ |
| W5-06 | Create `backend/internal/prep/` | ✅ |
| W5-07 | Refactor `api.go` into route table delegating to domains | ✅ |
| W5-08 | Split sqlc queries by domain prefix | ✅ |
| W5-09 | Update `backend/README.md` package map | ✅ |
| W5-10 | `doc.go` package docs forbidding cross-domain imports | ✅ |
| W5-11 | `go test ./...` + interview API tests green | ✅ |
| W5-12 | Rename `VITE_GAMES_SERVER_URL` → `VITE_API_SERVER_URL` | ✅ Primary name in deploy/docs; games alias fallback kept |

---

## Wave 6 — God-components & architecture hardening (12 tasks)

| ID | Task | Status |
|----|------|--------|
| W6-01 | Finish `@/design/components` (Chip, Meter, Pill from nodeui) | ✅ |
| W6-02 | Repoint shell importers to `@/design/components` | ✅ |
| W6-03 | Add `eslint-plugin-boundaries` element-types for `shell/*` | ✅ Migrated to `boundaries/dependencies` policies (v7) |
| W6-04 | Confirm `layout.ts` barrel split; delete dead code | ✅ |
| W6-05 | `CanvasStage.lifecycle.test.tsx` characterization tests | ✅ |
| W6-06 | Extract `useCanvasLifecycle` from `CanvasStage.tsx` | ✅ |
| W6-07 | Slice `CodeStudioProvider` into Phase/Draft/UI contexts | ✅ Context slices + `CodeStudioHeader.tsx` extraction (<400 LOC root) |
| W6-08 | Decompose `LandingPage.tsx` | ✅ `LandingHero`, `LandingToolbar`, `LandingCatalog`; root ~165 LOC |
| W6-09 | Decompose `AssembleModes.tsx` logic vs render | ✅ Mode router + `assemble/*` mode files |
| W6-10 | Move localStorage IO from shell into Zustand slices | ✅ `store/study/studioTab`, `store/games/lobbyPrefs`, `store/interview/hostRoom` |
| W6-11 | Render layer graph in `docs/architecture.md` from FORBIDDEN map | ✅ Layer graph present in `docs/architecture.md` |
| W6-12 | Add `madge --circular src/` CI gate | ✅ `check:circular` in parallel `check:all` |

---

## Wave 7 — OSS adoption & tooling (10 tasks)

| ID | Task | Status |
|----|------|--------|
| W7-01 | Declare `vite-node` explicit devDep; run `knip`, fix undeclared deps | ✅ |
| W7-02 | Add Prettier + `.editorconfig`; format pass excluding `_generated/` | ✅ |
| W7-03 | Add husky + lint-staged (boundaries/eslint/prettier on staged) | ✅ |
| W7-04 | Add `vitest.config.ts` with setup + coverage thresholds | ✅ |
| W7-05 | Add `rollup-plugin-visualizer` + `build:analyze` script | ✅ |
| W7-06 | Evaluate `@tanstack/react-query` for `platform/api` | ✅ **Not adopted** — see note below |
| W7-07 | Tighten prep sim quality gate (≥3 frames) | ✅ |
| W7-08 | Wire `draft-quiz-from-frames.mjs` npm script | ✅ `npm run draft-quiz-from-frames` |
| W7-09 | Parallelize `check:all` with `npm-run-all2` | ✅ |
| W7-10 | This checklist + final `make check` smoke gate | ✅ |

### W7-06 — React Query evaluation

**Decision: do not adopt `@tanstack/react-query`.**

| Domain | Fetch pattern | React Query benefit |
|--------|---------------|---------------------|
| Prep plans (`PlanContext`) | Debounced mutations + rich local runner state | Low — query cache fights optimistic local edits |
| Interview (`SessionsListWidget`) | One-shot list refresh on mount | Low — infrequent, simple `useState` |
| Auth (`AuthProvider`) | Session bootstrap on login | Low — not a cache problem |
| Games | WebSocket-first; REST for profiles/stats | Low — realtime channel owns live state |

Only prep-plans and interview share list-fetch REST helpers via `platform/api`, but both degrade gracefully offline and do not need shared cache invalidation enough to justify a new root provider + ~12 KB dependency. Keep thin `arcadeFetch` wrappers.

---

## Verification commands

```bash
# Full CI parity (from repo root)
make check

# Individual Wave 7 gates
cd frontend && npm run check:knip          # no unlisted script deps
cd frontend && npm run format:check        # Prettier
cd frontend && npm run test:coverage       # vitest thresholds
cd frontend && npm run build:analyze       # dist/stats.html treemap
cd frontend && npm run check:all           # parallel guardrails
```

---

## Wave 8 — World-class completion pass (2026-07-07)

Cookie-only SCS auth cutover, env rename, god-component splits, store persistence hygiene, shared chat primitives, circular-dep ratchet (27 → 17). Gate: `make check`.

---

## Summary

| Wave | Done | Partial | Pending |
|------|-----:|--------:|--------:|
| W0 DB | 12 | 0 | 0 |
| W1 Platform | 15 | 0 | 0 |
| W2 Games | 12 | 0 | 0 |
| W3 Interview/Collab | 14 | 0 | 0 |
| W4 Legacy | 15 | 0 | 0 |
| W5 Backend | 12 | 0 | 0 |
| W6 Architecture | 12 | 0 | 0 |
| W7 OSS | 10 | 0 | 0 |
| **Total** | **100** | **0** | **0** |

Last updated: 2026-07-07 (Wave 8 complete; cookie-only auth; `make check` green).
