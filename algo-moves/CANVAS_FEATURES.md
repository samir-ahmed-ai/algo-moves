# Canvas (React Flow v12) feature set

The whole workspace centre is one `@xyflow/react` canvas. Beyond the original
minimap / controls / background / resizable nodes / removable edges, this pass
added a large batch of interaction features. Grouped by where they live.

## Panel headers (`PanelHeader` kit)

All canvas panel nodes share one header shell built from composable primitives in
`nodeui.tsx` (`PanelHeader`, `PanelHeaderGrip`, `PanelHeaderIcon`, `PanelHeaderTitle`,
`PanelHeaderMeta`, `PanelHeaderSub`, `PanelHeaderActions`, `PanelHeaderMenu`).

1. **Unified header layout** — problem, examples, viz, code, and optional panels use the same chrome; kind-specific actions sit inline or in the overflow menu.
2. **Drag grip** — dedicated grip zone for dragging; hidden when the node is locked.
3. **Overflow menu** — minimize, focus, recolour swatches, lock/unlock, remove (remove hidden when locked).
4. **Kind badge** — panel kind + Learn/Viz mode chips beside the title.
5. **Caption strip** — viz panels show live move note + step counter on a second header row.
6. **Header density** — follows workspace density (`compact` / `ultra` / `spacious`).
7. **Per-node lock** — `data.locked` disables drag, resize, delete, and the grip; padlock shown in header actions; toggle via menu or context menu.
8. **Per-node appearance** — Selection sidebar section: stroke, fill, opacity (20–100%), corner style (theme/sharp/soft/round); stored on `data.style`.
9. **Collapsed summary** — minimized nodes show title + step counter (viz) + restore; other actions move to the menu.
10. **Theme-aware chrome** — header uses `--radius`, `--border-width`, `--ring`, and preset shadows.

Collapse/expand stores `fullHeight` on the node and restores it when expanding (`panelCollapse.ts`).

## Selection, toolbar & context menus

10. **Global transport bar** — bottom-centre `TransportBar` in Visualize (toggle via Panels → Global transport); always visible regardless of node selection.
11. **Problem actions toolbar** — selected **problem** node shows a floating `NodeToolbar` with dock/side toggles, focus, minimize, recolour, and remove (no duplicate playback).
12. **Focus** — zoom-to-fit a single node (actions toolbar, header menu, context menu, single-click, double-click).
13. **Recolour** — cycle a node's accent through 6 swatches (actions toolbar, header menu, context menu).
14. **Minimize / restore** — collapse a whole node to just its header (actions toolbar, header menu, context menu). Transient (never persisted collapsed); height restored from `fullHeight`.
15. **Remove panel** — delete a node + its edges (actions toolbar, header menu, context menu); disabled when locked.
16. **Node context menu** — right-click a node → Focus / Recolour / Minimize / Lock / Remove.
17. **Pane context menu** — right-click empty canvas → Fit view / Tidy / Lock.
18. **Single-click a node** to focus it (skips `.nodrag` controls and form fields).
19. **Double-click a node** also focuses it (`zoomOnDoubleClick` disabled so the pane doesn't fight it).

## Bottom toolbar (CanvasTools)

19. **Live zoom %** readout (`useViewport`).
20. **Reset zoom to 100%**.
21. **Zoom in / out / fit view** buttons.
22. **Undo** (⌘Z) and **23. Redo** (⌘⇧Z / ⌘Y) of canvas edits (history stack).
24. **Lock canvas** — freeze dragging + selection + connecting.
25. **Connect mode** — drag from a handle to wire a new edge.
26. **Scroll-to-pan** toggle (vs scroll-to-zoom).
27–32. **Align** selection: left / horizontal-centres / right / top / vertical-centres / bottom.
33–34. **Distribute** selection evenly: horizontally / vertically.

## Shell & themes

35. **Unified sidebars** — left catalog + zoom; right canvas properties + theme picker (`UnifiedLeftSidebar`, `UnifiedRightSidebar`).
36. **20 theme presets** — `data-theme` on `<html>` with light/dark and CB palette override layer; CodeMirror chrome syncs with preset tokens.
37. **Settings dialog** — density (`compact` / `ultra` / `spacious`), theme, and workspace prefs.
38. **Floating HUD** — bottom-centre playback transport only (`CanvasFloatingHud`); zoom controls in left sidebar (`SidebarZoomControls`).

## Edge editing

39. **onConnect** — connect-mode handle drag creates a styled removable edge.
40. **Edge reconnection** — drag an edge endpoint to a different handle.
41. **Delete-on-drop** — dropping a reconnected endpoint in empty space removes the edge.
42. **Always-visible edge ✕** to cut an edge (pre-existing RemovableEdge).
43. **`defaultEdgeOptions`** so new edges adopt the removable type.

## Keyboard

44. **⌘A** select all nodes.
45. **⌘Z / ⌘⇧Z / ⌘Y** undo / redo.
46. **z** zoom-to-fit (selection if any).
47. **Delete / Backspace** remove selected.
(plus the pre-existing ← / → / Space / Home / End / F / ? / ⌘K transport & palette.)

## `<ReactFlow>` capabilities enabled

48. **`onlyRenderVisibleElements`** — viewport culling for perf with the big catalog.
49. **`elevateNodesOnSelect`** and **50. `elevateEdgesOnSelect`** — selected items raise above peers.
51. **`nodeDragThreshold`** — small travel before a drag begins (keeps click-heavy panels clickable).
52. **`selectionMode: Partial`** — touch-to-select box selection.
53. **`connectionRadius`** — generous snap radius when wiring.
54. **`connectionLineType: SmoothStep`** — the in-progress connection line style.
55. **`panOnScroll` / `zoomOnScroll`** — toggled by the scroll-pan button.

## Presentation & misc

56. **Laser pointer** — a glowing dot follows the cursor in presentation mode (F).
57. **Per-node accent** stored on `node.data.accent`, drawn as the node's top border.
58. **Collapsible in-node sections** ("toggles") — fold parts of a node body.
59. **Minimap click-to-focus**, pannable + zoomable (pre-existing, kept).

## Node bodies (compaction)

60. **Edge-to-edge visualizer** — the viz board fills the node (`p-0`) at 15px.
61. **Taller data-heavy defaults** — viz / code / scratch / cases sized for big inputs.
62. **Two-column input picker** in the Problem node.
63. **Learn mode** — drills (`predict`, `mastery`, plugin `mode: 'practice'` tabs) in a compact top row, **Code Studio** wide below (Structure reassemble → Recall split editor). Auto-splits `plugin.code` into blocks; plugins may supply curated `codePieces`. Live diff, blind/peek, match %, recall timer, Vim/Wrap toggles (persisted), search/replace + fold/bracket keymaps, complexity footer (`Time` / `Space`). Phase progress persists per problem in localStorage. Legacy share URLs with `mode=practice` or `mode=code` open Learn.
64. **Per-(plugin,mode) persisted layouts** survive reloads & mode switches (pre-existing, kept). `:practice` / `:code` layout keys migrate to `:learn`.
