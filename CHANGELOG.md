# Changelog

All notable changes to Algo Moves are documented here.

## [Unreleased]

### Changed

- **Default density is now `compact`** for the workspace, canvas, and study surfaces. Previously the app defaulted to whatever was last saved in local storage; fresh installs and cleared prefs now start at compact spacing.
- Mobile swipe deck (`#mobile`) continues to use **`ultra`** density for card chrome.
- Landing and games surfaces keep user-selectable density (cycle via HUD or settings).

### Added

- **Presentation mode** for canvas: hides HUD/toolbar/minimap, optional browser fullscreen, laser pointer. Toggle with **F** or View → Present; **Esc** to exit. Demo workflow preset auto-enters presentation.
- **GIF snapshot export** (MVP single frame) from the transport bar via `@/lib/export`.
- **Reference** workflow preset: pattern + glossary + cheat sheet panels on canvas.
- **Prerequisite unlock graph** helpers in `content/taxonomy.ts` (category edges + per-item `prereqs`).
- `check:lighthouse-budget` static a11y/SEO guard; wired into `check:all`.
- Visual QA checklist: [`docs/visual-qa-checklist.md`](docs/visual-qa-checklist.md).

### Migration notes (density default)

If you had no saved workspace prefs, you will see tighter spacing immediately — this is intentional.

If you previously saved **`spacious`** density in local storage, your choice is preserved; nothing is overwritten.

To reset to the new default manually:

1. Open **Settings** → set Density to **Compact**, or
2. Clear site data for the app origin (removes `localStorage` workspace keys), or
3. Use the density cycle control in the canvas HUD until **Compact** is shown.

No database or share-URL migration is required — density is a client-only preference.
