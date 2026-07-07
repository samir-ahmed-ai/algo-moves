# Games arcade (`shell/games`)

Multiplayer games over WebSocket. This folder is an isolated shell sub-domain:
import only through `@/shell/games` from other features.

## Layout

| Path | Role |
|------|------|
| `index.ts` | Public barrel — `GamesPage`, registry, locale, engine hooks |
| `GamesPage.tsx` | Route entry: providers + `ArcadeView` |
| `arcade/` | Shell chrome (`ArcadeHeader`, `ArcadeView`) |
| `lobby/` | Pre-room: create/join/share |
| `room/` | In-room: roster, game picker, active match, `ChatDock` |
| `post-match/` | Profile, stats, leaderboards (`ProgressOverlay`) |
| `games/<id>/` | Per-game plugin (`GameDef`, UI, `logic.ts`) |
| `data/` | Arcade REST via `@/platform` + local history |
| `net/` | Thin re-exports from `@/shell/realtime` + nested state helpers |
| `engine/` | Shared match hooks (`useRematch`, `useCountdown`, …) |
| `_generated/gameIds.ts` | Canonical ids from `db/migrations/010_games_catalog.sql` |

## Boundaries

- **REST**: `data/db.ts` calls `@/platform/api/*` only.
- **Realtime**: `net/*` re-exports `@/shell/realtime` — no canvas/collab/interview imports.
- **Audio**: `@/lib/utils/audio` is generic; mute persistence is wired in `soundConfig.ts`.
- **ESLint**: `shell/{canvas,collab,interview,study,…}` must not import `shell/games/**`.

## Nested room state

Host-authoritative games publish under short keys in room `sharedState`
(`ttt`, `meld`, `wyr`, `nduel`). See `net/nestedRoomState.ts` for the full contract.

Channel-relay games (rock-paper-scissors, reaction-duel) use `useGameChannel` only.

## Chat

`room/ChatDock.tsx` is **games-owned** chat (arcade room messages + emoji reactions).
Canvas collab has separate chat in `shell/collab/collabWidgets.tsx` — do not share.

## Adding a game

1. Add the id to `db/migrations/010_games_catalog.sql`.
2. Run `node scripts/generate-game-ids.mjs`.
3. Create `games/<id>/` with `logic.ts`, `logic.test.ts`, and a default `GameDef` export.
4. Register in `registry.ts` and add a nested key in `nestedRoomState.ts` if host-authoritative.

## Verification

```bash
cd frontend && npm run check:boundaries && npm run check:lint && npm run typecheck
```
