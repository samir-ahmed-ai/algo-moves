# Games Arcade (`shell/games`)

Multiplayer arcade shell for room creation, live play, chat, profile progress,
leaderboards, and game plugins.

This folder is an isolated shell sub-domain. Other features must import it only
through `@/shell/games`.

## Layout

| Path | Role |
|------|------|
| `index.ts` | Public barrel: route, registry, locale, engine hooks |
| `GamesPage.tsx` | Route entry, providers, and arcade environment setup |
| `arcade/` | Route-level chrome: `ArcadeHeader`, `ArcadeView` |
| `lobby/` | Pre-room flow: name, create, join, personal room, share |
| `room/` | In-room shell: roster, game chooser, active match, chat |
| `post-match/` | Profile, stats, achievements, leaderboards |
| `games/<id>/` | Per-game plugin: `GameDef`, UI, pure logic, tests |
| `data/` | Arcade REST access via `@/platform` plus local history |
| `net/` | Realtime adapters and nested room-state helpers |
| `engine/` | Shared match hooks such as countdown/rematch/reporting |
| `_generated/gameIds.ts` | Canonical ids from `db/migrations/010_games_catalog.sql` |

## Design rules

- Keep route chrome in `arcade/`; keep room mechanics in `room/`.
- Keep game-specific UI inside `games/<id>/` unless it is reused by multiple games.
- Put shared visual primitives in `ui/`; put reusable chat UI in `components/chat`.
- Prefer deterministic pure logic in `logic.ts` and UI orchestration in the game component.
- Keep player-facing copy localized through the game or arcade locale modules.

## Boundaries

- REST: `data/db.ts` calls `@/platform/api/*` only.
- Realtime: `net/*` owns arcade room transport and must not import canvas/collab/interview.
- Audio: `@/lib/utils/audio` stays generic; arcade mute wiring lives in `soundConfig.ts`.
- Imports: `shell/{canvas,collab,interview,study,...}` must not import `shell/games/**`.

## Nested room state

Host-authoritative games publish under short keys in room `sharedState`, such as
`ttt`, `meld`, `wyr`, and `nduel`.

See `net/nestedRoomState.ts` for the contract. Channel-relay games such as
rock-paper-scissors and reaction-duel use `useGameChannel` only.

## Chat

`room/ChatDock.tsx` is games-owned chat for arcade room messages and emoji
reactions. Canvas collaboration has separate chat in `shell/collab/collabWidgets.tsx`.
Do not merge these domains.

## Adding a game

1. Add the id to `db/migrations/010_games_catalog.sql`.
2. Run `node scripts/generate-game-ids.mjs`.
3. Create `games/<id>/` with pure `logic.ts`, focused `logic.test.ts`, localized copy, and a default `GameDef` export.
4. Register the game in `registry.ts`.
5. Add a nested state key in `net/nestedRoomState.ts` if the game is host-authoritative.
6. Add presentation metadata in `gameMeta.ts` and `gamePresentation.ts`.

## Verification

```bash
cd frontend && npm run check:boundaries && npm run check:lint && npm run typecheck
```
