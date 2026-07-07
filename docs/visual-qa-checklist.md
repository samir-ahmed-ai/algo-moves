# Visual QA Checklist

Final pass before shipping UI density, arcade, and presentation changes. Run on
**1280×800** desktop, **390×844** mobile, in **dark** and **light** themes.

## Setup

```bash
make dev   # http://localhost:4321
```

Toggle density via the canvas HUD (cycle) or Settings. Presentation mode: **F** or View → Present; exit with **Esc**.

---

## Global

- [ ] Default workspace density is **compact** on first visit (no saved prefs)
- [ ] Mobile deck (`#mobile`) uses **ultra** density on cards and transport
- [ ] Shell typography uses chrome tokens; plugins use `vizText` / `vizKit` tokens
- [ ] Layout widths, node sizes, and canvas chrome spacing come from token modules
- [ ] Theme switch (light/dark) does not clip chrome or leave flash-of-unstyled content
- [ ] Colour-blind palette toggle still distinguishes team/accent colours
- [ ] Generated theme output has no trailing commas in shadow values
- [ ] Focus rings remain visible on toolbars, menus, dialogs, and canvas controls

## 1280×800 — Workspace / Canvas

- [ ] Browse → open a problem → **Visualize** canvas loads without horizontal scroll
- [ ] Transport bar: play/pause, scrubber, speed, step counter visible at compact density
- [ ] **Presentation mode (F)**: chrome hidden, canvas fills viewport, Esc hint visible
- [ ] **Demo** workflow preset enters presentation + Theater layout
- [ ] **Reference** workflow preset shows pattern, glossary, cheat sheet panels
- [ ] Export GIF button on transport downloads a single-frame `.gif`
- [ ] Right sidebar collapses cleanly; minimap hidden in presentation mode
- [ ] Saved canvas viewport restores without jumping or hiding the active panel
- [ ] Drag/drop problem placement lands on finite canvas coordinates

## 1280×800 — Learn Studio

- [ ] Top bar compact; stage picker does not wrap awkwardly
- [ ] Presentation mode hides the surface bar; content uses full height
- [ ] Quiz / reassemble / recall tabs readable at compact density
- [ ] Code Studio phase resume opens the last valid phase for the selected problem/language
- [ ] Recall editor font size, line height, wrap, and gutter preferences persist cleanly

## 390×844 — Mobile

- [ ] Landing hero and CTA row fit without overflow
- [ ] Mobile deck: one card per swipe, transport reachable with thumb
- [ ] Install banner is single-line compact variant
- [ ] Mobile session resume lands on a valid topic, problem, and card index
- [ ] Bottom transport and swipe affordances do not collide with browser safe areas

## Games Arcade

- [ ] `#games` route opens with polished header, stage frame, and no horizontal scroll
- [ ] Lobby name input, personal room card, QR share card, create/join tabs, and game strip align on desktop and mobile
- [ ] Game chooser cards show localized title/tagline, category, pacing, disabled states, and expanded how-to-play details
- [ ] In-room roster, reconnect banner, ready state, standings, chat dock, and progress overlay match the arcade chrome
- [ ] Each game surface fits the stage: Would You Rather, Number Duel, Tic Tac Toe, RPS, Mind Meld, Reaction Duel
- [ ] Spectator mode remains readable and does not expose player-only controls
- [ ] Sound toggle, theme toggle, locale selector, leave room, and profile overlay remain keyboard reachable
- [ ] Realtime reconnect keeps the active room visible and shows a clear status message

## 390×844 — Themes

- [ ] Dark: panel borders and ink2/ink3 contrast sufficient on cards
- [ ] Light: accent buttons meet contrast on white/near-white panels
- [ ] Each base/hybrid theme has a distinct swatch and readable surface/text pairing
- [ ] Color-blind palette remains distinguishable in graph edges and team markers

## Regression gates

```bash
cd frontend && npm run check:all
cd frontend && npm test
```

Generated artifacts should be refreshed from scripts, not hand-edited. If a generator changes, rerun its paired generator/check command before merge.

All green before merge.
