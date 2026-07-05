# Visualization & Animation Engine

> Part of the algo-moves world-class roadmap (`docs/roadmap/`). Audience: an autonomous coding agent (often a cheaper model) that will EXECUTE this plan with no prior context. Make it fully self-contained.

## 1. Snapshot — current state

The visualization/animation engine turns a plugin's recorded `Frame[]` (a move transcript) into a scrubbable, morphing replay. It is frameworkless and cleanly decoupled into independent layers:

- **Frame player** — `frontend/src/core/usePlayer.ts` (179 LOC). A hook-based state machine over a frame count: `index`/`isPlaying`/`speed`, A–B loop (`loopStart`/`loopEnd`), breakpoints, bookmarks (`Map<index,note>`), and reverse playback. Playback is driven by `window.setInterval(BASE_MS / speed)` (`usePlayer.ts:82`) with `BASE_MS = 1100`, `MIN_MS = 80` (`usePlayer.ts:33-34`). A `latest` ref (`usePlayer.ts:51`) lets loop/breakpoint/direction toggles apply mid-playback without restarting the timer.
- **FLIP morphing** — `frontend/src/components/shared/FlipFrame.tsx` (133 LOC). On `frameKey` change it measures every `[data-flip]` descendant, computes inverted transforms root-relative and scale-normalized (`FlipFrame.tsx:63-79`), then plays them out under `FLIP_EASE = 'transform 0.24s cubic-bezier(0.2, 0.7, 0.3, 1)'` (`FlipFrame.tsx:5`). Skips morphing when `els.length > MAX_FLIP_ELS` (=400, `FlipFrame.tsx:4,46`). Uses `queueMicrotask` + `requestAnimationFrame` with a 120ms timeout backup (`FlipFrame.tsx:108-119`), and cancels all in-flight work on unmount (`FlipFrame.tsx:120-125`).
- **FLIP identity keys** — `frontend/src/components/board/flipKeys.ts` (22 LOC). `flipKeys(values, prefix)` emits `${value}#${occurrence}/${total}` so duplicates disambiguate by occurrence and value-count changes reset identities rather than sliding the wrong element.
- **Fit/scale** — `frontend/src/components/shared/vizFit.tsx` (`VizFitBox`, 197 LOC) + pure math in `frontend/src/lib/canvas/vizFitMeasure.ts` (`computeVizFitLayout`, `resolveMeasureSize`, `measureIntrinsic`). Measures the board, downscales to fit the flex slot (1/8-quantized scale, `VIZ_FIT_MAX_UPSCALE = 1.5`), eases size+scale via CSS (`theme.css:546-553`). A single persistent `ResizeObserver` (`vizFit.tsx:105-125`) — deliberately NOT re-created per frame so a pure position morph fires nothing.
- **Circular step view** — `frontend/src/components/shared/MoveOrbit.tsx` (205 LOC). Pure quadratic-Bézier arc (`orbitPoint`/`orbitT`/`orbitArcFraction`/`orbitTFromX`), tone-colored ticks decimated to `MAX_TICKS = 72`, click/drag-to-seek mapped through the SVG CTM. Arc-length table is a module-level singleton (`arcTable`, `ARC_SAMPLES = 96`, `MoveOrbit.tsx:46-59`).
- **Status bar + transport** — `frontend/src/shell/panels/visualize/VizPanelBody.tsx` (`VizStatusBar`, `VizPanelBody`), `frontend/src/shell/panels/shared/Transport.tsx` (6 speeds `[0.25,0.5,1,1.5,2,4]`).
- **Frame effects pipeline** — `frontend/src/effects/registry.ts` (9 `defineEffect` defs: fast/slow/reverse/palindrome/late/mask/ply…) + `frontend/src/core/effectTypes.ts` (`EffectPlugin.transformFrames: (Frame[], data) => Frame[]`). Consumed via `applyEffect`/`transformFramesForGraph` in `frontend/src/lib/canvas/trace.ts:4,60`. **This is part of the animation engine** (frame-array transforms), not the unrelated music system the survey digest assumed.
- **Plugin viz kit** — `frontend/src/plugins/_shared/vizKit.tsx` (465 LOC): `VizStage`, `VizBoard`, rail primitives, `useFrameState`, `captionFromMove`.

**Test coverage:** pure geometry/keys are tested (`flipKeys.test.ts`, `MoveOrbit.test.ts`, plus `vizFitMeasure` exercised indirectly). `usePlayer.ts`, `FlipFrame.tsx`, `VizFitBox`, and the effects pipeline have **no direct behavioral tests** (verified: no test file imports `usePlayer` or `FlipFrame`).

**Maturity: Solid.** Clean layering, elegant FLIP/fit math, comprehensive playback controls, well-commented gotchas. Held back from world-class by `setInterval`-based playback (not rAF-synced), zero perf budgeting for the 400-element FLIP threshold, no direct tests on the player/morph/fit layers, and no per-problem animation authoring API.

## 2. Strengths to preserve

- **Layer independence.** Recording (`plugin.record`), playback (`usePlayer`), morphing (`FlipFrame`), fit (`VizFitBox`), and geometry (`MoveOrbit`) are separable modules with no cross-dependencies. Do not merge them.
- **Pure, testable math is already extracted.** `vizFitMeasure.ts` and the `orbit*` functions are side-effect-free and exported for tests. Keep new math in these files.
- **FLIP identity discipline.** `flipKeys` (occurrence + total count) is subtle and correct — the queue-dequeue `[7,2,7]` reasoning in its doc comment is load-bearing. Preserve the key format; guard it with tests before touching.
- **Scale-invariant FLIP measurement.** `FlipFrame` divides coordinates by render scale (`FlipFrame.tsx:64,72`) so VizFitBox rescales don't register as movement. This is why FLIP + fit compose cleanly.
- **Single persistent ResizeObserver.** The comment at `vizFit.tsx:100-104` explains why re-observing per frame would jitter mid-FLIP. Do not "optimize" this into a per-frame observer.
- **Reduced-motion is globally neutralized** (`index.css:150-166`: `*{transition-duration:0.001ms!important}`), so CSS eases collapse to instant. Any new animation must degrade correctly under this.

## 3. Gaps, risks & tech debt

| Priority | Issue | Evidence | Impact |
|----------|-------|----------|--------|
| P1 | Playback uses `setInterval`, not rAF — ticks fire between repaints; on fast speeds (4×→275ms) stutter/skipped frames on low-refresh or throttled tabs | `usePlayer.ts:79-90` | Visible jank on fast replays; base `BASE_MS=1100` masks it but is coarse |
| P1 | `MAX_FLIP_ELS = 400` is undocumented and unmeasured; morphing silently disabled above it with no warning/telemetry | `FlipFrame.tsx:4,46-49` | Potential 60fps regression on dense boards (large DP tables / 400-node graphs); users unaware morph was skipped |
| P1 | No behavioral tests for `usePlayer`, `FlipFrame`, or `VizFitBox` — only pure geometry/keys are covered | no test imports `usePlayer`/`FlipFrame` (grep verified) | Refactors to playback/morph/fit are unguarded; regressions surface only in manual QA |
| P1 | No per-problem animation authoring API — enter/exit/transition style is fixed (`FLIP_EASE` hardcoded); a plugin cannot request fade/scale/instant | `FlipFrame.tsx:5` (single easing const); no plugin-metadata hook | Every problem animates identically; no way to tune DP-table vs graph-node motion |
| P1 | Easing curve `cubic-bezier(0.2,0.7,0.3,1)` is copy-pasted across 8 sites (JS + CSS) with no shared token | `FlipFrame.tsx:5`, `theme.css:279,548-552,557,626`, `mobile.css:706` | Drift risk; no single place to retune animation feel |
| P2 | `arcTable` is a module-level singleton keyed on nothing — never invalidated (fine today: arc geometry is viewport-independent, but a footgun if `P0/P1/P2` ever become responsive) | `MoveOrbit.tsx:46-59` | Latent: stale tick positions if control points become dynamic |
| P2 | No abort/telemetry for rapid plugin/mode swaps mid-morph beyond `FlipFrame`'s own cleanup — no top-level guard that all in-flight transforms are cleared on scope exit | `FlipFrame.tsx:120-125` (per-instance only) | Rapid mode/plugin switches could leave stale transforms if a consumer forgets `resetKey` |
| P2 | 1000+ frame replays keep the whole `Frame[]` + player state in memory; no windowing/streaming | `usePlayer.ts` operates on `total` count; frames array lives in canvas context | Memory overhead uncharacterized for large replays |
| P2 | No a11y skip-animation path: no "jump to final state" or "jump to frame N without morph"; keyboard frame nav not standardized | `MoveOrbit` has `aria-label` only; no keyboard handler | Reduced-motion users get instant jumps (ok) but no explicit skip control; screen-reader replay untested |
| P2 | Effects pipeline (`transformFrames`) has no bounds/validation — a malformed effect can emit an empty or huge frame array feeding straight into the player | `effectTypes.ts:8`, `trace.ts:60` | Player would render `total=0` or OOM with no guard |

## 4. The world-class bar

Excellence for THIS aspect looks like the algorithm-visualization equivalent of a polished media scrubber:

- **Frame-perfect playback.** Playback loop driven by `requestAnimationFrame` with accumulator timing (like a game loop / `react-spring`'s frameloop), so a step lands on a repaint, not between them. Speed is a time-scale, not an interval divisor. Reference: the rAF-accumulator pattern used by Framer Motion's `frameloop` and Remotion's deterministic timeline.
- **Budget-aware morphing.** FLIP cost estimated per frame (element count × measured paint) and compared to a 16ms budget; over budget → seamless degrade to instant jump with an optional idle batch-morph, plus a dev-mode warning/telemetry counter. The 400 threshold becomes data-derived, not a magic number. Reference: GSAP Flip plugin's element-count guidance; the FLIP technique (Paul Lewis).
- **Authoring API.** Plugins declare per-problem transition intent in metadata (`transition: 'flip' | 'fade' | 'scale' | 'instant'`, optional per-`move.type` overrides), consumed by a single `FlipFrame`/animation host. One easing token feeds JS + CSS.
- **Streaming-ready.** For 1000+ frame replays, frame windowing so only a neighborhood is materialized; player API unchanged.
- **a11y-first.** Motion-safe default respected; explicit "skip to end" and "jump to frame" controls; keyboard: `←/→` step, `Home/End`, `J` next bookmark, `Space` play/pause — wired once at the transport.
- **Instrumented.** Per-run frame-to-paint latency, morph skip-rate, and replay duration surfaced behind a debug flag; a perf regression test in CI asserts FLIP cost scaling at 100/200/400 elements.
- **Tested.** 90%+ coverage of playback logic; characterization tests for frame-order/loop/bookmark/reverse invariants; FLIP cleanup on reset; MoveOrbit seek round-trips.

Products/patterns to emulate: **Framer Motion** (`AnimatePresence`, layout animations, `frameloop`), **GSAP Flip** (budgeted FLIP), **Remotion** (deterministic frame timeline), **VisuAlgo / Algorithm Visualizer** (algorithm-replay UX), **the FLIP technique** (Paul Lewis).

## 5. Roadmap (ordered milestones)

### M1 — Lock behavior with characterization tests (do first; unblocks all refactors)
Goal: freeze current player/FLIP/fit behavior so later changes are provably safe.
- [ ] `usePlayer` unit suite: play/pause/next/prev/reset/goTo, A–B loop wrap, breakpoint auto-pause, reverse boundary stop, `total`-change reset — files: `frontend/src/core/usePlayer.test.ts` (new) — acceptance: covers every returned method + all `useEffect` branches — effort: M
- [ ] `FlipFrame` behavioral test with jsdom: `resetKey` clears position map; `>MAX_FLIP_ELS` skips morph; unmount cancels rAF/timeouts — files: `frontend/src/components/shared/FlipFrame.test.tsx` (new) — acceptance: no stale transform after reset; no leaked timers — effort: M
- [ ] `computeVizFitLayout` / `resolveMeasureSize` edge cases: zero/degenerate dims, upscale clamp, 1/8 quantization — files: `frontend/src/lib/canvas/vizFitMeasure.test.ts` (new) — acceptance: scale never exceeds fit; `w/h ≤ avail` — effort: S

### M2 — Shared easing token + observability
Goal: one source of truth for animation feel; surface silent degradations.
- [ ] Extract `VIZ_EASE` / `VIZ_FLIP_EASE` tokens; consume in JS and CSS — files: `frontend/src/design/easing.ts` (new), `FlipFrame.tsx`, `theme.css`, `mobile.css` — acceptance: `cubic-bezier(0.2, 0.7, 0.3, 1)` appears once as a source constant — effort: M
- [ ] Dev-mode warning + counter when `MAX_FLIP_ELS` exceeded — files: `FlipFrame.tsx` — acceptance: `import.meta.env.DEV` logs once per skip with element count — effort: S

### M3 — rAF-driven playback
Goal: frame-perfect, repaint-synced playback.
- [ ] Replace `setInterval` with a rAF accumulator loop; keep `Player` interface identical — files: `usePlayer.ts` — acceptance: M1 tests still green; steps land on repaint; tab-hidden pauses cleanly — effort: L
- [ ] Document `BASE_MS`/`MIN_MS` rationale as an fps ceiling/floor — files: `usePlayer.ts` — acceptance: JSDoc explains 1100ms base + MIN_MS clamp — effort: S

### M4 — Per-problem animation authoring API
Goal: plugins choose their transition style.
- [ ] Add optional `transition?: 'flip'|'fade'|'scale'|'instant'` (+ per-`move.type` map) to plugin viz metadata; thread through `VizPanelBody` into the animation host — files: `frontend/src/core/types.ts` (or plugin meta type), `VizPanelBody.tsx`, `FlipFrame.tsx` — acceptance: a plugin can opt into `instant` and its board stops morphing without touching FlipFrame internals — effort: L
- [ ] Budget-aware degrade: estimate FLIP cost, fall back to instant over threshold, emit telemetry counter — files: `FlipFrame.tsx` — acceptance: dense board degrades without frame drop; skip-rate observable — effort: M

### M5 — a11y & perf hardening
Goal: motion-safe, keyboard-navigable, memory-bounded.
- [ ] Transport keyboard map (`←/→`, `Home/End`, `J`, `Space`) + "skip to end" / "jump to frame" controls — files: `Transport.tsx`, `usePlayer.ts` — acceptance: full keyboard playback; jump-to-frame skips morph — effort: M
- [ ] FLIP-cost regression test (100/200/400 els) documenting scaling; adjust `MAX_FLIP_ELS` with data — files: `FlipFrame.test.tsx` — acceptance: recorded baseline; threshold justified in comment — effort: M
- [ ] Effects pipeline output guard: reject/clamp empty or oversized `transformFrames` results before they reach the player — files: `trace.ts`, `effectTypes.ts` — acceptance: malformed effect can't yield `total=0` or OOM — effort: S

## 6. Execution-ready backlog

Atomic tasks; pick ONE at a time. Every task must leave `cd frontend && node_modules/.bin/vitest run` green (baseline: 3585 tests).

1. **usePlayer core-controls test**
   - **Goal:** characterize play/pause/next/prev/reset/goTo/togglePlay clamping.
   - **Files:** `frontend/src/core/usePlayer.test.ts` (new).
   - **Approach:** `renderHook(() => usePlayer(5))` from `@testing-library/react`; assert `next`/`prev`/`goTo` clamp to `[0,total-1]`; `next`/`prev` pause; `reset` → index 0. Use fake timers for the interval.
   - **Acceptance test:** all control methods covered; index never escapes bounds.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/core/usePlayer.test.ts`

2. **usePlayer loop/breakpoint/reverse test**
   - **Goal:** characterize A–B loop wrap (`usePlayer.ts:84`), breakpoint auto-pause (`:87`), reverse boundary stop (`:75`), and `total`-change reset (`:62-70`).
   - **Files:** `frontend/src/core/usePlayer.test.ts` (extend).
   - **Approach:** fake timers; set loop `[1,3]`, advance, assert wrap to 1; add breakpoint, assert pause on hit; set `reversed`, assert stop at 0; change `total`, assert index/loop/breakpoints cleared.
   - **Acceptance test:** every `useEffect` branch in usePlayer exercised.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/core/usePlayer.test.ts`

3. **FlipFrame reset + threshold test**
   - **Goal:** guard `resetKey` clears position map and `>MAX_FLIP_ELS` skips morph.
   - **Files:** `frontend/src/components/shared/FlipFrame.test.tsx` (new).
   - **Approach:** render `FlipFrame` with children carrying `data-flip`; bump `frameKey`, assert movers get inline transform then clear; bump `resetKey`, assert no morph next frame; render 401 `[data-flip]` els, assert none animate.
   - **Acceptance test:** no inline transform survives a `resetKey` change; dense board never gets `FLIP_EASE`.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/components/shared/FlipFrame.test.tsx`

4. **FlipFrame unmount-cleanup test**
   - **Goal:** confirm rAF + timeouts are cancelled on unmount (`FlipFrame.tsx:120-125`).
   - **Files:** `frontend/src/components/shared/FlipFrame.test.tsx` (extend).
   - **Approach:** spy on `cancelAnimationFrame`/`clearTimeout`; trigger a morph, unmount before settle, assert both called.
   - **Acceptance test:** no timer/rAF leaks after unmount.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/components/shared/FlipFrame.test.tsx`

5. **vizFitMeasure edge-case test**
   - **Goal:** cover `computeVizFitLayout` clamp/quantization and `resolveMeasureSize` sentinels.
   - **Files:** `frontend/src/lib/canvas/vizFitMeasure.test.ts` (new).
   - **Approach:** call `computeVizFitLayout` with tiny/huge/zero inputs; assert `scale ≤ min(fit, 1.5)`, `scale` is 1/8-quantized when `≥1`, `w/h ≤ avail`. (Skip DOM `measureIntrinsic`; test the pure math.)
   - **Acceptance test:** scale never overflows container; upscale capped at 1.5.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/lib/canvas/vizFitMeasure.test.ts`

6. **Extract easing token**
   - **Goal:** single source for `cubic-bezier(0.2, 0.7, 0.3, 1)`.
   - **Files:** `frontend/src/design/easing.ts` (new — export `VIZ_EASE = 'cubic-bezier(0.2, 0.7, 0.3, 1)'` and `VIZ_MORPH_MS = 240`); `FlipFrame.tsx` (build `FLIP_EASE` from token); optionally a CSS var `--viz-ease` in `theme.css` referenced by the `.viz-fit-anim-*` / `viz-note-in` rules.
   - **Approach:** define token, import in `FlipFrame`; add `:root{--viz-ease:cubic-bezier(0.2,0.7,0.3,1)}` and replace literal in CSS transition shorthands (keep durations inline).
   - **Acceptance test:** grep for the literal shows one JS + one CSS-var definition; visuals unchanged.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit -p tsconfig.json`

7. **MAX_FLIP_ELS dev warning**
   - **Goal:** observability when morph is skipped for density.
   - **Files:** `frontend/src/components/shared/FlipFrame.tsx`.
   - **Approach:** in the `els.length > MAX_FLIP_ELS` branch (`:46`), add `if (import.meta.env.DEV) console.warn(...)` with the count, guarded to fire once per mount via a ref.
   - **Acceptance test:** warning logs once with element count on a dense board; no log under 400.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/components/shared/FlipFrame.test.tsx`

8. **Document BASE_MS/MIN_MS**
   - **Goal:** justify playback timing constants.
   - **Files:** `frontend/src/core/usePlayer.ts:33-34`.
   - **Approach:** JSDoc: `BASE_MS=1100` = human-readable base step; `MIN_MS=80` = ~12.5fps ceiling at max speed. No behavior change.
   - **Acceptance test:** constants documented; tests unchanged.
   - **Verify:** `cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json`

9. **rAF playback loop**
   - **Goal:** repaint-synced playback (depends on tasks 1–2).
   - **Files:** `frontend/src/core/usePlayer.ts`.
   - **Approach:** replace the `setInterval` effect (`:79-90`) with a `requestAnimationFrame` loop using a time accumulator: advance when `elapsed ≥ Math.max(MIN_MS, BASE_MS/speed)`; read direction/loop/breakpoints from `latest.current`; cancel via `cancelAnimationFrame` in cleanup. Keep the `Player` interface byte-identical.
   - **Acceptance test:** tasks 1–2 still green; steps advance on rAF; hidden tab stops advancing.
   - **Verify:** `cd frontend && node_modules/.bin/vitest run src/core/usePlayer.test.ts`

10. **Effects pipeline output guard**
    - **Goal:** stop malformed `transformFrames` from breaking the player.
    - **Files:** `frontend/src/lib/canvas/trace.ts` (where `applyEffect` results feed frames).
    - **Approach:** after applying an effect, if the result is empty or exceeds a sane cap, fall back to the input frames (dev-warn). Do not throw.
    - **Acceptance test:** an effect returning `[]` leaves the original frames; player `total > 0`.
    - **Verify:** `cd frontend && node_modules/.bin/vitest run src/lib/canvas/trace.test.ts`

11. **Transport keyboard navigation**
    - **Goal:** keyboard-driven playback.
    - **Files:** `frontend/src/shell/panels/shared/Transport.tsx` (and/or an existing workspace keyboard hook — check `frontend/src/shell/workspace/useWorkspaceKeyboard.ts` first to avoid duplicating global shortcut wiring).
    - **Approach:** wire `←/→`→`prev/next`, `Home/End`→`goTo(0)`/`goTo(total-1)`, `Space`→`togglePlay`, `J`→next bookmark. Prefer extending the existing keyboard hook over a new listener.
    - **Acceptance test:** each key maps to the right player call; no double-binding with existing shortcuts.
    - **Verify:** `cd frontend && node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit -p tsconfig.json`

12. **Per-problem transition metadata (API groundwork)**
    - **Goal:** let a plugin declare its transition style.
    - **Files:** plugin viz-meta type in `frontend/src/core/types.ts` (confirm exact shape before editing), `frontend/src/shell/panels/visualize/VizPanelBody.tsx`, `frontend/src/components/shared/FlipFrame.tsx`.
    - **Approach:** add optional `transition?: 'flip'|'instant'` (start binary) to meta; in `VizPanelBody` pass it to `FlipFrame`; when `'instant'`, `FlipFrame` skips the morph path entirely (early return after position bookkeeping). Default `'flip'` preserves today's behavior.
    - **Acceptance test:** existing plugins unchanged; a plugin set to `'instant'` renders without inline transforms.
    - **Verify:** `cd frontend && node_modules/.bin/vitest run && npm run check:all`

13. **Budget-aware FLIP degrade + skip telemetry**
    - **Goal:** data-driven threshold instead of a magic 400.
    - **Files:** `frontend/src/components/shared/FlipFrame.tsx`, `frontend/src/components/shared/FlipFrame.test.tsx`.
    - **Approach:** record a module-level skip counter; add a test that measures morph setup cost at 100/200/400 els (element count only, deterministic) and asserts the skip decision. Comment the threshold with the recorded rationale.
    - **Acceptance test:** skip decision is a documented function of element count; counter increments on skip.
    - **Verify:** `cd frontend && node_modules/.bin/vitest run src/components/shared/FlipFrame.test.tsx`

## 7. Definition of done & verification

Run all from repo root unless noted. Green output described inline.

```bash
# 1. Typecheck (both tsconfigs) — expect: no output, exit 0
cd frontend && node_modules/.bin/tsc --noEmit -p tsconfig.json && node_modules/.bin/tsc --noEmit -p tsconfig.node.json

# 2. Unit tests — expect: "Test Files N passed", "Tests 3585+ passed" (new tests raise the count)
cd frontend && node_modules/.bin/vitest run

# 3. Targeted viz suites — expect: all green
cd frontend && node_modules/.bin/vitest run src/core/usePlayer.test.ts src/components/shared/FlipFrame.test.tsx src/lib/canvas/vizFitMeasure.test.ts src/components/board/flipKeys.test.ts src/components/shared/MoveOrbit.test.ts

# 4. Guardrails (boundaries/tokens/meta/etc.) — expect: each check prints OK
cd frontend && npm run check:all

# 5. Prod build — expect: "built in ..." with no chunk errors
cd frontend && node_modules/.bin/vite build
```

Manual smoke (live preview `frontend-2`, port 4325): open a curated problem in Visualize mode; play at 4× and confirm no stutter (post-M3); scrub the MoveOrbit and confirm ticks map to frames; resize the panel and confirm the board eases without jitter; toggle OS reduced-motion and confirm morphs jump instantly with no console errors.

**Done when:** every milestone's tasks are checked, commands 1–5 are green, the player/FLIP/fit layers each have a direct test file, `cubic-bezier(0.2, 0.7, 0.3, 1)` has a single source definition, and playback is rAF-driven.

## 8. Reference pointers

**Core files (read before editing):**
- `frontend/src/core/usePlayer.ts` — playback state machine
- `frontend/src/components/shared/FlipFrame.tsx` — FLIP morphing
- `frontend/src/components/board/flipKeys.ts` — FLIP identities (+ `flipKeys.test.ts`)
- `frontend/src/components/shared/vizFit.tsx` + `frontend/src/lib/canvas/vizFitMeasure.ts` — fit/scale
- `frontend/src/components/shared/MoveOrbit.tsx` — circular step view (+ `MoveOrbit.test.ts`)
- `frontend/src/shell/panels/visualize/VizPanelBody.tsx` — status bar + board host
- `frontend/src/shell/panels/shared/Transport.tsx` — transport controls
- `frontend/src/effects/registry.ts` + `frontend/src/core/effectTypes.ts` + `frontend/src/lib/canvas/trace.ts` — frame-transform effects pipeline
- `frontend/src/plugins/_shared/vizKit.tsx` — plugin viz primitives
- `frontend/src/styles/theme.css` (`.viz-fit-anim-*`, `.viz-status-note`, reduced-motion blocks), `frontend/src/index.css:150-166` (global reduced-motion neutralizer)

**Related roadmap docs:** `docs/roadmap/` — see the frontend-architecture, design-system, and content/authoring plans for the plugin `record()` contract that feeds this engine, and the shared-component/layering plan (the `@/design` leaf where the easing token belongs).

**External prior art:**
- The FLIP technique — Paul Lewis (aerotwist.com/blog/flip-your-animations)
- Framer Motion `AnimatePresence` / layout animations / `frameloop` — rAF-driven, repaint-synced timing
- GSAP Flip plugin — budgeted element-count FLIP guidance
- Remotion — deterministic frame-timeline playback model
- VisuAlgo / Algorithm Visualizer — algorithm-replay UX benchmarks
