# Yjs + Hocuspocus Canvas Collab

CRDT-based canvas collaboration. **Transport defaults on** when
`VITE_HOCUSPOCUS_URL` is set; the legacy edit-op relay is the fallback when no
URL is configured.

## Feature flags

| Variable | Default | Effect |
|----------|---------|--------|
| `VITE_HOCUSPOCUS_URL` | — | **Required** for Yjs transport |
| `VITE_YJS_TRANSPORT` | `true` when URL set | Set `false` to opt out (legacy relay) |
| `VITE_YJS_SUBDOC_TRANSPORT` | `true` with transport | Set `false` to keep subdoc patch ops |
| `VITE_YJS_SHADOW` | `false` | Host dual-write for parity validation |
| `VITE_YJS_SUBDOC_SHADOW` | `false` | Mirror subDocs in shadow mode |

Interview follow/lock/frame-follow stay on the custom session envelope (Phase C).

## Quick start

```bash
make install && make start   # frontend + backend + Hocuspocus (Yjs on by default)

# Backend/frontend only (legacy relay — banner shown in collab sessions):
make dev-all
```

## Architecture

```text
Browser (React Flow + panels)
  └─ Y.Doc + @hocuspocus/provider (lazy) ──WebSocket──► services/hocuspocus
                                                            └─ Postgres yjs_documents
Arcade Go relay
  └─ session + interviewRuntime only (when Yjs transport on)
```

## Modules

| Module | Purpose |
|--------|---------|
| `yjsConfig.ts` | Feature flags + mode resolution |
| `yjsCanvasDoc.ts` | `CanvasDoc` → Y.Map |
| `yjsCanvasBinding.ts` | Graph read/write/observe |
| `yjsSubdocBinding.ts` | Whiteboard + collab-code panels |
| `useYjsCanvasCollab.ts` | Provider hook (lazy Hocuspocus) |
| `YjsCollabContext.tsx` | Shared `Y.Doc` for sync hooks |

## Production (`services/hocuspocus/`)

Postgres persistence via migration `012_yjs_documents.sql`.

```bash
# Docker (uses DATABASE_URL from env)
docker compose up hocuspocus

# Railway: deploy services/hocuspocus, then on frontend:
VITE_HOCUSPOCUS_URL=wss://${{hocuspocus.RAILWAY_PUBLIC_DOMAIN}}
```

## Legacy relay

When `VITE_HOCUSPOCUS_URL` is unset, canvas uses the original host-authoritative
edit-op protocol (`useLegacyCanvasDocRelay.ts`). A dismissible banner warns during
collab sessions. Safe for solo/LAN without the Hocuspocus service.

Delete `useLegacyCanvasDocRelay.ts` and subdoc patch fold paths once Hocuspocus is
deployed on all environments.
