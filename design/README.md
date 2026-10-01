# Design Handoff — Idea Design

Exported from Figma page "Explorations" on 2026-09-30.

## Files
- `frames/*.png` — 2× renders of each frame. The visual source of truth.
- `design.json` — layer tree per frame. Positions are px relative to the frame's top-left; includes sizes, fills, strokes, radii, effects, auto-layout, vector paths, and text with font / size / line-height / letter-spacing / colour.
- `tokens.json` — every distinct value used across the exported frames, with usage counts: colours, fonts, text styles, radii, stroke weights, spacing, opacities. Also local styles and variables if the file has any.
- `icons/*.svg` — logo, orb and small icon groups exported as SVG.

## Frames
- frames/01-concept-mid-zoom-w-boxes.png — "Concept — Mid Zoom (w Boxes)" (1440×900)
- frames/02-concept-mid-zoom-default.png — "Concept — Mid Zoom (Default)" (1440×900)
- frames/03-explore-branch-substitute.png — "Explore — Branch & Substitute" (1440×900)
- frames/04-compare-semantic-diff.png — "Compare — Semantic Diff" (1440×900)
- frames/05-lineage-concept-tree.png — "Lineage — Concept Tree" (1440×900)
- frames/06-workspaces-home.png — "Workspaces — Home" (1440×900)
- frames/07-multiplayer-presence-sharing.png — "Multiplayer — Presence & Sharing" (1440×900)
- frames/08-idea-design.png — "Idea Design" (1440×900)
- frames/09-template-canvas.png — "Template Canvas" (1440×900)
- frames/10-empty-canvas.png — "Empty Canvas" (1440×900)

## Notes for the build agent
- Treat `tokens.json` colours as the raw palette. Consolidate them into a small set of CSS variables (e.g. surface, panel, border, text-primary / text-secondary / text-tertiary, accent) rather than using every value directly.
- Frames are desktop mockups. Build the shell (header, side rail, left panel, bottom bar) as fixed layout, and the canvas as a pannable, zoomable surface.
- Text content in the mockups is placeholder; layout, type and colour are what matter.
- UI labels and names use Title Case.
- These icons appear to be Lucide icons — use `lucide-react` components instead of the exported SVGs: `undo` → `Undo`, `redo` → `Redo`, `plus` → `Plus`, `chevron-down` → `ChevronDown`, `file-plus-corner` → `FilePlusCorner`, `folder-plus` → `FolderPlus`, `chevrons-down-up` → `ChevronsDownUp`, `chevron-left` → `ChevronLeft`, `chart-no-axes-gantt` → `ChartNoAxesGantt`.
- Product behaviour and interaction rules live in `docs/CONTEXT.md`.
