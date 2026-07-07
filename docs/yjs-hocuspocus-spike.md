# Yjs + Hocuspocus Canvas Collab Spike

Evaluation spike for replacing the custom host-authoritative edit-op protocol
(`canvasDoc.ts`, `CanvasCollabProvider.tsx`, `subdocProtocol.ts`) with CRDT-based
sync. **Not enabled in production** — code lives under `src/shell/canvas/collab/yjs/`.

## What was built

| Module | Purpose |
|--------|---------|
| `yjsCanvasDoc.ts` | Maps `CanvasDoc` → `Y.Map` nodes/edges/comments + binary encode/decode for Postgres |
| `yjsCanvasBinding.ts` | React Flow graph read/write + `observeDeep` subscription |
| `useYjsCanvasSpike.ts` | Opt-in `@hocuspocus/provider` hook (`enabled: false` by default) |
| `yjsCanvasDoc.test.ts` | Round-trip and observer tests |

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

1. **Phase A** — Dual-write: host still publishes edit-ops; spike hook mirrors into Y.Doc for shadow comparison.
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
