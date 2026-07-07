# Visual QA Checklist

Final pass before shipping UI density and presentation changes. Run on **1280×800** (desktop), **390×844** (mobile), in **dark** and **light** themes.

## Setup

```bash
make dev   # http://localhost:4321
```

Toggle density via the canvas HUD (cycle) or Settings. Presentation mode: **F** or View → Present; exit with **Esc**.

---

## Global

- [ ] Default workspace density is **compact** on first visit (no saved prefs)
- [ ] Mobile deck (`#mobile`) uses **ultra** density on cards and transport
- [ ] No hardcoded `text-[Npx]` in shell — `npm run check-shell-typography` passes
- [ ] Theme switch (light/dark) does not clip chrome or leave flash-of-unstyled content
- [ ] Colour-blind palette toggle still distinguishes team/accent colours

## 1280×800 — Workspace / Canvas

- [ ] Browse → open a problem → **Visualize** canvas loads without horizontal scroll
- [ ] Transport bar: play/pause, scrubber, speed, step counter visible at compact density
- [ ] **Presentation mode (F)**: chrome hidden, canvas fills viewport, Esc hint visible
- [ ] **Demo** workflow preset enters presentation + Theater layout
- [ ] **Reference** workflow preset shows pattern, glossary, cheat sheet panels
- [ ] Export GIF button on transport downloads a single-frame `.gif`
- [ ] Right sidebar collapses cleanly; minimap hidden in presentation mode

## 1280×800 — Learn Studio

- [ ] Top bar compact; stage picker does not wrap awkwardly
- [ ] Presentation mode hides the surface bar; content uses full height
- [ ] Quiz / reassemble / recall tabs readable at compact density

## 390×844 — Mobile

- [ ] Landing hero and CTA row fit without overflow
- [ ] Mobile deck: one card per swipe, transport reachable with thumb
- [ ] Install banner is single-line compact variant
- [ ] Games lobby roster readable without horizontal scroll

## 390×844 — Themes

- [ ] Dark: panel borders and ink2/ink3 contrast sufficient on cards
- [ ] Light: accent buttons meet contrast on white/near-white panels

## Regression gates

```bash
cd frontend && npm run check:all
cd frontend && npm test
```

All green before merge.
