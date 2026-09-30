

**UI Notes**

- Use opacities: darker text for less important, hovering increases opacity when needed
- Grid snapping: snap to other blocks' edges and text baselines (Figma-style smart guides) as well as the grid, with a modifier key held to disable it.
- Custom cursor, aesthetic match with canvas design. keep the standard cursor meanings (I-beam over text, grab while panning). Other users' multiplayer cursors should use the same design.
- Handwriting animation: apply it only to newly created or AI-inserted text, keep it fast, and respect prefers-reduced-motion. Animating as you type would fight typing and quickly feel slow.
- Orb should be animated, its the 'composing' orb from https://libraries.dev/orbs
- Default canvas view is pretty much freeform, no boxes.
- Every text block on your canvas is a node with a stable ID. Types (Goal, Assumption, Constraint) become optional tags that you add, or that AI suggests and you accept. Diff, merge and lineage only need block identity, not boxes.
- Labels/blocks can be filtered in/out using the filter icon in the top right (3 lines icon)


**Data model**

- An append-only **operation log** is the source of truth. A concept is the result of replaying its ops. Branches are pointers to op heads, with periodic snapshots for speed. Lineage, diff, rewind and undo all derive from this log.
- Block fields: `id`, `concept_id`, `text`, `x`, `y`, `tags[]`, `created_by`. Links are their own records with IDs (`from`, `to`).
- The block is a firm unit. Splitting or merging blocks are explicit operations, so block identity (and therefore diff and merge) survives edits.
- AI tag suggestions are stored separately with a status (suggested / accepted / dismissed). AI never writes to a block directly.
- Every concept belongs to a workspace. New concepts go to Personal by default.

**Backend**

- Supabase: Postgres, row-level security scoped by workspace, and Realtime Presence/Broadcast for cursors.
- No CRDT in V1. Use last-write-wins per block field. Only add Yjs if real text collisions show up.

**Canvas**

- A box is a state signal only (selected, or needs attention). At rest, no boxes.
- Filtering dims non-matching blocks rather than hiding them, so spatial memory is preserved.
- Connectors are user-drawn and persist when tags or boxes are toggled.
- Semantic zoom has three levels (Far / Mid / Near) via the rail on the right. Each level changes what's shown, not just the scale.
- No right-side panel. Block details are popovers anchored to the block.
- AI can suggest an arrangement but never moves blocks without the user accepting.

**Modes and navigation**

- Rail order: Concepts, Search, Lineage, Compare, Bookmarks, History, Settings.
- Explore is a mode on a selected block, not a page.
    - A chip shows "Exploring from X · N Branches".
    - **Done** keeps the branches; **Discard** or Esc drops them.
- The bottom bar changes contents by mode. Undo/Redo is always present and backed by the op log.
- Compare for the MVP is Side-by-Side only: a block diff matched by ID, with per-block merge. Overlay comes later.
- Workspaces:
    - The Concepts panel is the workspace browser.
    - Clicking a workspace name opens the Home grid.
    - The app opens to the last concept used, not Home.

**AI / Orb**

- The orb is the only AI entry point. No chat.
- It sits dim when idle and brightens when it has something to show.
- Clicking it toggles a translucent annotation layer over the canvas.
- Selecting messy text and then clicking the orb runs structure extraction.
- Every suggestion is accept or dismiss. Nothing is applied automatically.

**Multiplayer (after MVP; V1 is single-player plus share/fork links)**

- Presence colours are reserved for people. State and accent colours never reuse a person's colour.
- Presence is branch-aware. You only see someone's cursor when you're both in the same branch.
- Comments are anchored to blocks and can be turned into operations.
- Sharing:
    - Roles: Owner / Can Edit / Can Comment / Can View.
    - Link access: Can View & Fork.
    - Visible branches default to Main only.

**Style**

- Title Case for UI names and labels.
- Restrained colour, no glow.

**MVP scope (from your plan)**

- In: concept, blocks, semantic zoom, branch, mutate, compare, merge, lineage, and one AI feature (structure extraction).
- Out: tasks, calendar, mobile, enterprise permissions, marketplace, realtime co-editing.