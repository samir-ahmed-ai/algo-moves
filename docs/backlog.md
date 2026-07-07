# Algo Moves Future Ideas

Shipped features (problem library, simulators, Code Studio, quiz UX, mobile
deck, share URLs, plugin CLI, and author docs) are documented in
[`README.md`](../README.md) and
[`quiz-and-code-studio.md`](quiz-and-code-studio.md).

---

## Backlog hygiene

Use this file for product ideas only. Implementation contracts live in
[`architecture.md`](architecture.md), visual release checks live in
[`visual-qa-checklist.md`](visual-qa-checklist.md), and quiz/Code Studio
standards live in
[`quiz-and-code-studio.md`](quiz-and-code-studio.md).

Before promoting an item into active work:

- Confirm it is not already covered by an existing generator, guardrail, or store contract.
- Name the primary surface: Study, Canvas, Mobile, Games, Interview, or Tooling.
- Define the acceptance check in one sentence.
- Add or update the smallest relevant guardrail when the feature creates a repeatable quality risk.

## Active polish themes

- **Design-system consistency** — keep typography, spacing, canvas dimensions, and theme values on shared tokens.
- **Generated-content trust** — make import/generation scripts deterministic, validated, and paired with stale-output checks.
- **Resume-state resilience** — normalize persisted IDs, phase state, viewport state, and user preferences before reuse.
- **Mobile-first learning** — keep mobile deck, install banner, and thumb-access transport usable at 390x844.
- **Accessible presentation** — preserve visible focus, role labels, and reduced-motion-safe presentation flows.

## Visualization & playback

- Scrubber/timeline: drag a playhead across all frames
- Variable playback speed (0.25×–4×)
- Breakpoints: auto-pause on a frame or condition
- Diff highlight between consecutive frames
- Loop/replay segment (A–B repeat)
- Side-by-side compare: two inputs or algorithms in synced lanes
- Big-O race / live complexity meter / visit heatmap
- Smooth FLIP transitions between graph states
- Export run as GIF/MP4; snapshot frame to image

## Interactivity

- Graph/array/grid editors that feed the recorder
- Editable code that re-runs the recorder live
- Variable history sparklines; “why did the algorithm do this?” on click
- Hint ladder, bookmarks, watch expressions, what-if forks
- Multi-select, snap-to-grid, alignment guides

## Practice & assessment

- Multi-select, fill-in-the-blank, true/false quiz types
- Timed challenge mode; spaced-repetition deck
- Per-problem mastery meter; mistake log review node
- Code-golf variants; edge-case finder prompts
- Peer review on shared runs; pattern-completion badges

## Pedagogy & structure

- Prerequisite unlock graph between problems
- Guided learning paths with checkpoints
- Pattern cards, glossary, cheat-sheet generator
- Compare brute-force vs optimal; interview-tips nodes
- Annotated complexity derivation (line-by-line)

## Canvas / UX

- Named layout presets (“study”, “exam”, “demo”)
- Minimap click-to-focus; fit-to-selection
- Custom data-flow edges between panels
- Node groups / frames; undo/redo for canvas edits
- Full-screen presentation mode
- Extended theme presets beyond dark/light

## Collaboration

- Classroom mode: instructor drives, students follow
- Embeddable read-only canvas; export standalone interactive page
- Comment threads anchored to frames; remix shared runs

## Engineering

- Persist full canvas state (zustand) across sessions
- Performance budget: virtualize off-screen nodes
- Accessibility pass (focus order, ARIA, reduced-motion)
- Narration / TTS for captions; optional step sound cues
