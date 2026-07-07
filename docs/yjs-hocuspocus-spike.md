# Yjs + Hocuspocus Canvas Collab

Evaluation and **Phase A shadow mode** for replacing the custom host-authoritative
edit-op protocol (`canvasDoc.ts`, `CanvasCollabProvider.tsx`, `subdocProtocol.ts`)
with CRDT-based sync. Production transport remains host-authoritative relay;
Yjs mirrors host snapshots when enabled.

## What was built

| Module | Purpose |
|--------|---------|
| `yjsCanvasDoc.ts` | Maps `CanvasDoc` → `Y.Map` nodes/edges/comments + binary encode/decode for Postgres |
| `yjsCanvasBinding.ts` | React Flow graph read/write + `observeDeep` subscription |
| `useYjsCanvasSpike.ts` | Opt-in standalone `@hocuspocus/provider` hook (`enabled: false` by default) |
| `useYjsCanvasShadow.ts` | **Phase A** — host dual-write into shadow `Y.Doc` via `useCanvasDocSync` |
| `scripts/hocuspocus-server.mjs` | Local Hocuspocus server (`npm run hocuspocus`) |
| `yjsCanvasDoc.test.ts` | Round-trip and observer tests |

## Enabling shadow mode (Phase A)

```bash
# Terminal 1 — optional relay for multi-client shadow comparison
npm run hocuspocus

# Terminal 2 — frontend
VITE_YJS_SHADOW=true VITE_HOCUSPOCUS_URL=ws://localhost:1234 npm run dev
```

When `VITE_YJS_SHADOW=true`, the canvas host mirrors every settled publish into
a local `Y.Doc` (`seedYjsCanvasDoc`). If `VITE_HOCUSPOCUS_URL` is set, the shadow
doc syncs to Hocuspocus under the live room code. Custom edit-ops remain authoritative.

## Self-hosted deployment sketch

```text
Browser (React Flow)
  └─ Y.Doc + @hocuspocus/provider  ──WebSocket──►  Hocuspocus server (Node, MIT)
                                                        └─ Postgres extension (Uint8Array updates)
```

Hocuspocus runs as a separate process (not bundled in the Go arcade). Persist
`encodeYjsCanvasState(doc)` to the existing `canvas` REST columns as binary, or
use the official Postgres persistence extension.

## Migration path (if adopted after Phase 2)

1. **Phase A** — Dual-write (implemented): host still publishes edit-ops; `useYjsCanvasShadow` mirrors into Y.Doc when `VITE_YJS_SHADOW=true`.
2. **Phase B** — Subdocuments per panel (`doc.getSubdoc(guid)`) for whiteboard + collab-code instead of `subdocProtocol.ts` patch ops.
3. **Phase C** — Interview mode frame-follow + lock stays a thin layer on top (custom presence, not CRDT).
4. **Phase D** — Retire `diffNodes` / `applyEditOp` once all clients speak Yjs.

## Risks (why this stays a spike)

- React Flow requires a careful binding layer (per-node Y.Map vs. whole-graph JSON).
- Host-authoritative interview semantics differ from peer-to-peer CRDT merges.
- Hocuspocus is Node-only; arcade backend is Go — ops adds a service.
- Bundle: `yjs` + provider ~30–50 KB gz lazy-loaded; acceptable if collab route only.

## Recommendation

Proceed with **shadow mode** in a feature branch after arcade room relay stabilizes.
Keep custom protocol until subdoc + interview edge cases are mapped to Yjs subdocuments.
