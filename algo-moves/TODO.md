# Algo Moves — Future ideas

Shipped features (problem library, simulators, Code Studio, quiz UX, mobile deck, share URLs, plugin CLI, author docs) are documented in [`README.md`](README.md) and [`docs/quiz-and-code-studio.md`](docs/quiz-and-code-studio.md).

---

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
