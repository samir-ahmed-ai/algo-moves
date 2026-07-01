# Algo Moves — Roadmap (100)

A teaching-first wishlist for turning this canvas into a full algorithms & data-structures studio.
Grouped by theme; roughly ordered by impact within each group.

## Content — more problems & patterns (1–15)
1. Add a second graph problem (Number of Islands) to prove multi-plugin generality.
2. Add DFS-based problems (Course Schedule / cycle detection) with a recursion-stack view.
3. Add Dijkstra / shortest-path with a live distance table node.
4. Add Union-Find (Kruskal MST) with a disjoint-set forest visual.
5. Add Topological Sort with an in-degree counter node.
6. Sorting suite: bubble / merge / quick / heap, each as a plugin with a bars visual.
7. Binary search + variants (lower/upper bound) with a pointer-on-array visual.
8. Two-pointers & sliding-window template problems with a window overlay.
9. Dynamic programming: 1-D (climbing stairs) and 2-D (edit distance) grid fill-in.
10. Greedy (interval scheduling) with an accept/reject timeline.
11. Backtracking (N-Queens / subsets) with a decision-tree visual.
12. Trie / prefix-tree insert & search animation.
13. Heap / priority-queue operations (sift-up / sift-down) visual.
14. Linked-list problems (reverse, cycle) with pointer-rewiring animation.
15. Tree traversals (in/pre/post/level) with a single reusable tree node.

## Visualization & playback (16–30)
16. Step *backward* through frames (already have prev — add keyboard ← / →).
17. Scrubber/timeline node: drag a playhead across all frames.
18. Variable playback speed control (0.25×–4×) in the Controls accordion.
19. Breakpoints: mark a frame/condition to auto-pause on.
20. Diff highlight between consecutive frames (what changed this step).
21. Loop/replay-segment selection (A–B repeat).
22. Side-by-side compare: run two inputs (or two algorithms) in synced lanes.
23. "Big-O race" node: plot operations vs n for the current algorithm.
24. Live complexity meter (counts comparisons / swaps / visits).
25. Heatmap overlay: how often each node/cell was touched.
26. Smooth animated transitions between graph states (FLIP).
27. Color-blind-safe palettes + a palette switcher.
28. Narration voice-over / text-to-speech for captions.
29. Export the current run as a GIF / MP4.
30. Snapshot a frame to an image for notes.

## Interactivity — let students drive (31–45)
31. Graph editor node: add/remove nodes & edges, then run the algorithm on it.
32. Array/grid editor for sorting & DP inputs.
33. "Predict the next move" inline challenge during playback.
34. Drag a value onto the queue/stack to test understanding.
35. Free-draw a tree and auto-balance / traverse it.
36. Editable code that re-runs the recorder live (CodeMirror → frames).
37. Step the algorithm manually (student clicks "next op" to advance the real code).
38. Hover any variable to see its history sparkline.
39. Click an edge/cell to ask "why did the algorithm do this?".
40. Hint ladder: progressive hints that cost nothing but reveal slowly.
41. Bookmark/annotate any frame with a sticky note node.
42. Pin a variable to a watch node (live watch expressions).
43. What-if: tweak an input mid-run and fork the timeline.
44. Multi-select nodes + group move / group delete.
45. Snap-to-grid and alignment guides when dragging.

## Practice & assessment (46–60)
46. More quiz types (multi-select, fill-in-the-blank, true/false).
47. Reassemble: drag-and-drop ordering (not just click) with snapping.
48. Simulate: free-input the next state, validate against the recorder.
49. Timed challenge mode with a countdown node.
50. Spaced-repetition scheduler for problems (SRS deck node).
51. Per-problem mastery meter + streaks.
52. "Explain it back" prompt: student writes the invariant, self-grades.
53. Auto-generated quizzes from the recorder frames.
54. Difficulty-adaptive practice (harder cases after success).
55. Mistake log: collect wrong answers into a review node.
56. Code-golf / optimize-this variant of each solution.
57. Complexity quiz: pick the right Big-O for a snippet.
58. Edge-case finder: student proposes an input that breaks a naive solution.
59. Peer-review: share a run, others comment on frames.
60. Certificates / badges on pattern completion.

## Pedagogy & structure (61–72)
61. Prerequisite graph between problems (unlock paths).
62. Guided "learning path" mode (curated sequence with checkpoints).
63. Per-problem "intuition first" intro node before the code.
64. Pattern cards: reusable explanations (BFS, DP, two-pointers).
65. Glossary node with linked terms.
66. Cheat-sheet generator per pattern.
67. "Common pitfalls" callouts tied to specific frames.
68. Compare brute-force vs optimal with a tradeoff table.
69. Real-world applications node per algorithm.
70. Interview-tips node (how to communicate this solution).
71. Multi-language code tabs (Go / Python / TS / Java) in the Code mode.
72. Annotated complexity derivation (line-by-line cost).

## Canvas / UX (73–85)
73. Per-mode saved layouts persisted to localStorage (survive reload).
74. Named layout presets ("study", "exam", "demo").
75. Auto-layout direction toggle (TB / LR) for dagre.
76. Minimap click-to-focus a node.
77. Fit-to-selection and zoom-to-node.
78. Connect panels by drawing edges (define custom data flows).
79. Node groups / frames (xyflow Group nodes) to cluster panels.
80. Command palette (⌘K) for actions and problem search.
81. Keyboard shortcuts overlay (?).
82. Undo/redo for canvas edits (add/remove/move).
83. Touch / mobile-friendly interactions.
84. Full-screen presentation mode (hide chrome, big nodes).
85. Theme presets beyond dark/light (Strudel-style theme menu).

## Collaboration & sharing (86–93)
86. Shareable URL that encodes mode + layout + input (lz-string).
87. Save/load projects (named workspaces).
88. Classroom mode: instructor drives, students follow live.
89. Embeddable read-only canvas for blogs/docs.
90. Export a problem as a standalone interactive page.
91. Comment threads anchored to frames.
92. "Remix" a shared run into your own canvas.
93. Import a custom adjacency list / dataset.

## Engineering & quality (94–100)
94. Persist canvas state (zustand store) like Strudel does.
95. Unit tests for each plugin's recorder (frame snapshots).
96. A plugin scaffolding CLI (`npm run new-problem`).
97. Lint rule to catch orphaned modules (tsc misses them).
98. Performance budget: virtualize off-screen nodes.
99. Accessibility pass (focus order, ARIA, reduced-motion).
100. Author docs: "how to write a ProblemPlugin" with the contract + a worked example.

---

# 50 ideas borrowed from Strudel Flow & Excalidraw

## From Strudel Flow — node-based "live" studio (101–125)
101. A node **palette sidebar** (like Strudel's effect list) you drag problems/panels from onto the canvas.
102. **Generated-code preview** per node — show the pseudocode/trace the node represents (Strudel's "Generated Pattern").
103. **Per-node Run** — a play button on each node that runs just that node's slice of the replay.
104. **Preset gallery** popup (Strudel "Presets") — curated layouts / learning paths to load with one click.
105. **Share-URL** that lz-string-encodes mode + layout + input, so a canvas state is a link.
106. **Save / Load projects** (named workspaces) persisted locally.
107. A **theme menu** with many named themes (Strudel ships ~12), not just dark/light.
108. **Tempo / playback-rate** control globally (Strudel's CPM) — one slider drives all replays.
109. **Time-effect nodes** (Fast / Slow / Reverse / Palindrome / Late) that transform the replay stream.
110. A **Mask / probability node** — skip or thin out steps ("Always/Often/Sometimes/Rarely") for drilling.
111. **Pad-grid input editor** (Strudel's pad) for array/grid/matrix problems — click cells to build inputs.
112. **Column modifiers** on the pad (repeat/euclid) for quickly generating structured inputs.
113. **Node "Controls" accordion** standardised on every node (we have it on viz — extend it).
114. **Connected-component highlighting** — tint nodes that belong to one data-flow chain.
115. **Settings dialog** (Strudel-style) for defaults: speed, theme, autoplay, edge style.
116. **Mini code editor inside a node** that re-runs the recorder live as you edit (editable algorithm).
117. **A global transport bar** docked bottom-centre (play/pause/scrub) independent of any node.
118. **"Notes" node** — freeform markdown notes pinned to the canvas.
119. **Workflow runner** — chain panels so output of one drives the next (true data flow).
120. **Drag-to-connect** handles to author your own edges between panels.
121. **Sound/voice cues** on each step (optional) for accessibility and engagement.
122. **Node search / quick-add** (type a panel name to spawn it).
123. **Collapsible left rail** with sections (problems, panels, effects) like Strudel's sidebar.
124. **Per-node lock** so a node can't be moved/deleted accidentally.
125. **Tempo-synced animation** — pulse the active graph node in time with playback.

## From Excalidraw — canvas tooling & properties (126–150)
126. A **per-node properties panel** (stroke/background/opacity/corners) like Excalidraw's left panel.
127. **Node opacity** slider (fade reference panels).
128. **Sharp vs rounded** node corners toggle (Excalidraw "Edges").
129. **Layers**: bring-to-front / send-to-back z-ordering for overlapping nodes.
130. **Lock** elements (and a canvas-lock to prevent panning).
131. **Drawing tools** — rectangle/ellipse/arrow/freedraw to annotate the canvas over the nodes.
132. **Text / sticky-note** tool to label regions of the canvas.
133. **Image insert** (drop a diagram/screenshot onto the canvas).
134. **Eraser** for annotations.
135. **Export canvas as PNG/SVG** (Excalidraw "Export image", ⌘⇧E).
136. **Command palette** (⌘/) for every action + problem search.
137. **Find on canvas** (⌘F) to jump to a node/panel by name.
138. **Multi-select + group** (marquee select, move/delete together).
139. **Alignment guides + snap-to-grid** while dragging.
140. **Canvas background** options (colour/grid/dots/none) in a menu.
141. **Reset canvas** action (restore default layout for all modes).
142. **Keyboard-shortcut help** dialog (Excalidraw "?").
143. **Stroke/colour presets** row for quick edge/annotation colours.
144. **Live collaboration** — shared cursors on the canvas for classrooms.
145. **Right-click context menu** on nodes/canvas (duplicate, lock, delete, copy link).
146. **Zoom-to-selection** and **zoom-to-fit** buttons.
147. **Element library** — save a custom node arrangement and reuse it.
148. **Laser pointer / presentation** mode for teaching.
149. **Undo/redo** with a visible history (Excalidraw's bottom bar).
150. **Language / i18n** switcher and a **system theme** option (Excalidraw's preferences).
