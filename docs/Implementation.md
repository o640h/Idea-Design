# Idea Design Implementation

Build a concept design environment for exploring alternatives without losing
the original idea or its reasoning. Make concepts editable, comparable and
traceable through branching, selective merging and history, for individuals
and, above all, for teams working on the same ideas over time.

Use React, TypeScript, Next.js and React Flow, with Supabase for accounts and
PostgreSQL storage. Keep concept operations independent of the interface:
React Flow renders state derived from the operation log and never becomes the
stored format. Use IndexedDB as the outbox for unsent operations and
server-side AI for optional assistance.

Keep the single Next.js application at the repository root, with routes in
`app/` and static assets in `public/`. Run pnpm and Biome from that root.
Design references live in `design/` (see `design/README.md`); product and
interaction rules live in `docs/CONTEXT.md`.

Develop locally and deploy to Vercel: Hobby only for eligible non-commercial
previews, Pro for the commercial launch, with Supabase. The NAS with
Cloudflare Tunnel remains a documented fallback, not a maintained target.

This plan covers all development. The **first validation point** is the end
of Phase 3: the test in 3.4 checks whether branch and compare feel valuable in
a first session. Keep building past it, but run that test before starting the
AI work in Phase 6. Deferred or optional ideas are kept in Stretch Features at
the end.

## Terms

- **Workspace** — ownership and sharing boundary: Personal, or a team.
- **Concept** — the unit a user opens. Belongs to one workspace and holds its
  branches, which is why the Concepts panel may show it like a folder.
- **Folder** — optional grouping of concepts inside a workspace, if needed.
- **Branch** — a line of development within a concept. Every concept has Main.
- **Component** — a block on the canvas with a stable ID, a title, an optional
  description and an optional tag.
- **Relationship** — a link between components: containment or semantic.
- **Operation** — one recorded change to a concept. The operation log is the
  source of truth; everything else is derived from it.
- **Revision** — a named point in a branch's log: a branch point, checkpoint
  or accepted merge.

Do not use "project" as a separate level.

## Phase 1 — Project Foundation

### 1.1 Set Up the Repository

- [x] Initialise Git and connect the intended GitHub repository.
- [x] Add a short README, `.gitignore` and example environment file.
- [x] Keep credentials, local data and generated files out of Git.

### 1.2 Create the Application

- [x] Create a Next.js application with TypeScript at the repository root.
- [x] Add React Flow for editable nodes, connections and canvas navigation.
- [x] Create a local Supabase environment and version database migrations.
- [x] Confirm a fresh clone can install, start and build the application.

### 1.3 Add Continuous Integration

- [x] Run lint, type checking, focused tests and build in GitHub Actions.
- [x] Use locked dependencies, minimal token permissions and job timeouts.
- [x] Check migrations against a clean local database in CI.

## Phase 2 — Create and Reopen a Concept

### 2.1 Define the Concept Model

- [x] Store workspaces, concepts, components and relationships with stable IDs.
- [x] Allow a concept to begin with a title and unstructured description.
- [x] Give components an optional single tag, suggesting goal, principle,
  mechanism, actor, constraint, assumption and evidence alongside custom tags.
- [x] Separate containment from dependencies and other semantic relationships.
- [x] Store node positions, title and description formatting and viewport state
  separately from concept content.
- [x] Version the saved document format so stored workspaces remain readable.
- [x] Replace "project" with "workspace" in the model, database and UI.

### 2.2 Build the First Editor

- [x] Translate the Figma shell into shared colours, type, spacing and layout.
- [x] Create a concept, edit its description and add its first component.
- [x] Rename, edit, connect and remove components directly in the editor.
- [x] Allow users to leave components untagged and relationships unlabelled.
- [x] Add selection, pan, zoom, fit-to-content and a text bar anchored to the
  selected component, instead of a side panel. The bar sets the tag and the
  size, weight, opacity and italic of the title or description being edited,
  previewing sizes, weights and opacity on hover without committing the preview.
- [x] Toggle component borders and tag labels from the canvas display menu.
- [x] Add right-click menus for components, connections and the canvas, and
  create, rename and delete concepts from the Concepts panel.
- [x] Create root concepts with the folder button and session alternatives copied
  from Main with the file button. Switch branches from the Concepts panel;
  durable branch lineage and history remain in Phase 3.
- [x] Rename concepts and branches by double-clicking their names, using F2
  or choosing Rename from their context menu.
- [x] Provide keyboard access to the same content through an outline view.
- [x] Add session undo and redo for content edits and graph operations.
- [x] Confirm session alternatives keep their source's component and
  relationship IDs. Compare and Merge depend on it.

### 2.3 Save Work Safely

Do this before adding more editor features: every later phase depends on the
operation log, and retrofitting it gets harder with each feature built on the
current session state.

- [x] Record edits as typed operations in an append-only log: create, update
  field, move, link, unlink, tag and delete. Coalesce continuous text edits
  into one operation.
- [x] Mark position and formatting operations as layout, so later comparisons
  and merges can ignore them. Keep each person's viewport out of the log.
- [x] Store periodic snapshots, and open a concept from its latest snapshot
  plus the operations after it.
- [x] Rebuild undo and redo on the log by appending inverse operations, never
  by removing entries.
- [x] Queue unsent operations in an IndexedDB outbox, flush them in order and
  show Saving, Saved and Save Failed.
- [x] On reopen, offer to apply or discard any operations left in the outbox.
- [x] Let the server assign operation order. Pull remote operations on focus
  and resolve edits from other tabs or devices per component field, with the
  last write winning. Team editing in Phase 8 reuses this rule.
- [x] Record the author of every operation, even while all workspaces are
  personal, so shared history needs no migration later.
- [x] Add account sign-in. Place every concept in the user's Personal
  workspace and reopen the last concept used.
- [x] Enforce per-user access in database policies and server endpoints,
  written against workspace membership rather than a single owner.
- [x] Move deleted concepts to a recoverable Trash rather than deleting them
  immediately.
- [x] Export and import the current concept as validated, versioned JSON.

### 2.4 Clarify the Canvas

- [x] Render relationship kinds with distinct line styles, such as solid for
  containment, dashed for dependency and dotted for alternative, not colour.
  Containment lines arrive with nesting in 5.1.
- [x] Show the current branch as the last breadcrumb segment and make it the
  branch switcher.
- [x] Give rail icons tooltips naming the view and its keyboard shortcut.
- [x] Set a legibility floor in the shared tokens: text people need to read is
  at least 11px and aims for 4.5:1 contrast. Keep lower contrast for hints,
  decoration and disabled states.

### 2.5 Verify the First Complete Journey

- [x] Create a concept, edit its structure, reload and continue editing.
- [x] Test interrupted saves, two open tabs and outbox recovery without
  data loss.
- [x] Verify one account cannot read or modify another account's concepts.
- [x] Confirm importing an export preserves component IDs and relationships.

## Phase 3 — Branch and Compare

### 3.1 Create Branches and Revisions

- [x] Represent branches as pointers to operation-log heads, so revisions,
  lineage, comparison and rewinding derive from the same log.
- [x] Make the session alternatives from 2.2 durable branches.
- [x] Create a revision at each branch point and named checkpoint. Accepted
  merges add theirs in 4.1.
- [x] Branch from any revision while preserving inherited component IDs.
- [x] Record the source revision, parent branch and divergence point.
- [x] Edit a branch without modifying its parent or sibling branches.
- [x] Rename, switch and archive branches without deleting their history.

### 3.2 Explore From a Component

- [x] Explore from a selected component as a mode, showing its branches in a
  chip. Done keeps them; Discard or Esc drops them.
- [x] Change the bottom bar's tools by mode, always keeping Undo and Redo.
- [x] Substitute, constrain or temporarily remove a component in a branch.
- [x] Mark explicitly connected components that may need review with the
  attention box, the only box shown besides selection.
- [x] Keep possible consequences visually distinct from changes the user has
  made.
- [x] Keep the current branch and save state visible throughout editing.

### 3.3 Compare Branches Side by Side

- [ ] Compare components and relationships by stable ID, including changed
  relationship types and endpoints.
- [ ] Identify added, removed, edited and re-parented content; ignore layout
  operations.
- [ ] Keep the comparison deterministic. Generated summaries of what changed
  come later (10.2) and never replace the structural diff.
- [ ] Show before-and-after values, with unchanged content folded and
  available on demand.
- [ ] Compare against the divergence revision as well as the current branch.
- [ ] Let users copy one component's version from the other branch with
  Take This Version, as an ordinary undoable operation.
- [ ] Test isolation and comparison after renaming, moving or removing
  components.

### 3.4 Test Branch and Compare

- [ ] Build a populated example concept that shows branch and compare within
  the first ten minutes of use.
- [ ] Give 5–10 people one real decision each, including at least a few pairs
  from the same team, and watch whether they branch and compare unprompted.
- [ ] Note where they organise without improving the idea (meta-work).
- [ ] Ask whether it let them think in a way their existing tools do not.
- [ ] Fix what the test exposes before moving on, and record whether people
  asked for anything beyond Take This Version when combining branches.

## Phase 4 — Merge and Understand History

### 4.1 Merge Selected Changes

- [ ] Select components, fields and relationships to bring into the target
  branch from the Compare view.
- [ ] Apply them as ordinary operations in the target, recording the source
  branch and revision as provenance.
- [ ] When the target also changed the same field since divergence, show both
  values and require a choice.
- [ ] Bring required dependencies, such as a relationship's endpoints, with a
  selected change and say so.
- [ ] Preview the result before applying it, and reject the preview if the
  target changed in the meantime.
- [ ] Make each merge one undoable operation, and record it as a revision.
- [ ] Rely on Compare to show what still differs after a partial merge,
  rather than tracking which changes were excluded.
- [ ] Test conflicting edits, missing dependencies and repeated partial merges.

### 4.2 Navigate Lineage and History

- [ ] Show branch origins, checkpoints and merge events in the Lineage view.
- [ ] Show a chronological list of recent operations, with their authors, in
  the History view.
- [ ] Open past revisions read-only and compare them with current work.
- [ ] Restore a past revision as a new revision without erasing later history.
- [ ] Branch from a past revision to revisit a discarded direction.
- [ ] Export and reimport a concept with its branches, revisions and lineage.

### 4.3 Test the Core Interaction

- [ ] Complete create, branch, change, compare and merge end to end.
- [ ] Observe people using it on their own design problems.
- [ ] Run the comparison from the product plan: the same kind of problem in
  their usual tools and in Idea Design, counting materially different
  alternatives and recovered discarded directions.
- [ ] Remove interaction friction before adding broader features.

## Phase 5 — Navigate Purpose and Detail

### 5.1 Add Flexible Levels of Detail

- [ ] Nest components under another component without requiring a tree for
  every relationship.
- [ ] Support collapsing, expanding and focusing on a component's contents.
- [ ] Prevent containment cycles while allowing valid cross-links.
- [ ] Split and merge components as explicit operations, so component
  identity survives the edit.
- [ ] Keep a visible route back to the parent component and the overview.

### 5.2 Implement Semantic Zoom

- [ ] Change the representation at each level, not just what is visible, so
  semantic zoom is more than collapse and expand. Base levels on nesting,
  never on tags, since tags are optional:
  - Far: each top-level component stands for its nested content as a summary
    (counts by tag, open tensions), and branches appear as divergence markers.
  - Mid: titles, short descriptions and first-level nested components with
    their relationships.
  - Near: full descriptions, evidence and detail inline.
- [ ] Provide the Far, Mid and Near rail alongside pointer and touch zoom.
- [ ] Keep selected content and spatial landmarks stable across transitions.
- [ ] Filter components by tag from the display menu, dimming non-matching
  components rather than hiding them.
- [ ] Respect reduced motion and preserve focus when detail changes.

### 5.3 Check Navigation With Real Concepts

- [ ] Populate product and systems-design examples with meaningful content.
- [ ] Test movement from purpose to detail and back without losing context.
- [ ] Check rendering and editing with representative larger concepts.
- [ ] Reduce clutter through progressive disclosure before adding more UI.

## Phase 6 — Turn Rough Thoughts Into Structure

### 6.1 Propose an Editable Decomposition

- [ ] Make the orb the only AI entry point. It stays dim when idle and
  brightens when it has something to show; clicking it toggles an annotation
  layer, and clicking it with text selected runs structure extraction.
- [ ] Send only the selected text to a server-side model endpoint.
- [ ] Request components and relationships in a validated format.
- [ ] Preserve the original text and link extracted content to its passages.
- [ ] Distinguish extracted statements from new model suggestions.
- [ ] Store suggestions apart from components as suggested, accepted or
  dismissed; never apply them without acceptance.
- [ ] Present a preview where users can edit, accept or reject individual parts.
- [ ] Apply accepted changes as one undoable operation.

### 6.2 Bound Cost and Failure

- [ ] Keep provider credentials server-side and require authenticated requests.
- [ ] Limit input size, output size, request frequency and per-account usage.
- [ ] Set a provider spending limit where supported and track request costs.
- [ ] Validate model output before it can modify any concept.
- [ ] Handle timeout, cancellation and invalid output without changing the
  concept.
- [ ] Explain what content leaves the device before the user requests analysis.

### 6.3 Evaluate the Assistance

- [ ] Use representative rough drafts with ambiguity and overlapping ideas.
- [ ] Check fidelity, unsupported additions and the amount of correction needed.
- [ ] Compare assisted decomposition with direct manual editing.
- [ ] Confirm all core concept operations remain usable without AI.

## Phase 7 — Share and Finish the Journey

### 7.1 Publish Read-Only Concepts

- [ ] Share an explicitly selected revision rather than a changing draft.
- [ ] Preview exactly which content and history will be exposed.
- [ ] Create revocable read-only links without exposing other workspace data.
- [ ] Let visitors explore the concept without creating an account.
- [ ] Keep unlisted shared concepts out of search indexing by default.

### 7.2 Let Others Build on a Concept

- [ ] Allow the owner to enable or disable forking for a shared revision.
- [ ] Copy a permitted revision into a workspace the recipient chooses.
- [ ] Retain attribution without granting access to the source's private history.
- [ ] Explain that revoking a link cannot recall an existing copy or export.
- [ ] Export a readable concept summary and selected comparison as Markdown.

### 7.3 Finish the Main User Journey

- [ ] Polish the example concept from 3.4 and add a clear route from rough
  text to first concept.
- [ ] Add the Search and Settings rail views, with clear empty and error states.
- [ ] Decide whether Bookmarks earns a rail slot or becomes a Pinned section
  in the Concepts panel.
- [ ] Check keyboard use, focus, contrast and readable narrow-screen views.
- [ ] Verify shared links and exports with a separate account and signed-out user.

### 7.4 Refine Canvas Feel

- [ ] Snap to the grid and to other components' edges and text baselines with
  smart guides, holding a modifier key to disable snapping.
- [ ] Use a custom cursor that matches the canvas while keeping standard
  meanings, such as the I-beam over text and grab while panning.
- [ ] Animate handwriting only for newly created or AI-inserted text, keeping
  it fast and respecting reduced motion.
- [ ] Format selected ranges within a component if whole-field formatting
  proves too coarse.

## Phase 8 — Work as a Team

Teams are the primary market: ongoing, shared concept work is where branching,
history and merging earn repeat use. Build asynchronous collaboration first;
live presence comes after it works.

### 8.1 Share Workspaces

- [ ] Create team workspaces, listed under Shared in the Concepts panel.
- [ ] Invite members by email with Owner, Can Edit, Can Comment and Can View
  roles, and let owners change roles and remove members.
- [ ] Open a workspace's Home grid of concepts from its name in the Concepts
  panel.
- [ ] Move a concept between workspaces only with an explicit confirmation,
  since it changes who can see it.
- [ ] Add links that allow viewing and forking the Main branch.
- [ ] Test permission changes, removed members and invitation edge cases.

### 8.2 Collaborate Asynchronously

- [ ] Anchor comments to components and let them become operations.
- [ ] Show what changed since each member last opened a concept, from the
  History view.
- [ ] Propose merging a branch into Main for review, with the Compare view as
  the review surface.
- [ ] Preserve individual authorship and revision history in shared concepts.

### 8.3 Collaborate Live

- [ ] Show presence only between people on the same branch, with colours
  reserved for people and cursors matching the custom canvas cursor.
- [ ] Show who is in which branch in the Concepts panel and let members
  follow each other.
- [ ] Keep per-field last-write-wins for simultaneous edits on the same branch.
- [ ] Test reconnects, permission changes and concurrent edits before release.

## Phase 9 — Launch and Earn Repeat Use

### 9.1 Prepare Hosting and Recovery

- [ ] Create separate development and production configuration and databases.
- [ ] Deploy on Vercel Pro with Supabase. Check the Supabase Free plan's
  current limits, such as inactivity pausing and backups, before launching on it.
- [ ] Connect the chosen domain with HTTPS and verify authentication redirects.
- [ ] Monitor application failures, failed saves, database usage and AI spend.
- [ ] Back up production data to separate encrypted storage and test a restore.
- [ ] Verify deployment rollback and database migration recovery procedures.

### 9.2 Test Product Value

- [ ] Recruit small product and software teams with real, ongoing decisions,
  plus some individual designers.
- [ ] Compare similar tasks in their current tools and Idea Design, varying order.
- [ ] Observe time to a useful comparison, meaningful alternatives and clarity
  of reasoning rather than counting nodes or generated text.
- [ ] Check voluntary return use over several weeks, per team and per person,
  and reasons for abandoning.
- [ ] Ask for payment after teams have experienced the complete core workflow.

### 9.3 Add Billing and Launch Material

- [ ] Price primarily per team workspace, with a free Personal tier that is
  useful on its own so individuals can bring the product into their teams.
- [ ] Bound AI usage per workspace.
- [ ] Add hosted checkout, verified billing webhooks and server-side entitlements.
- [ ] Make duplicate billing events harmless and support cancellation.
- [ ] Preserve export access when a subscription ends.
- [ ] Lead with a 30-second branch, change and compare demonstration and a
  worked, explorable design example, positioned as "Figma for Ideas".
- [ ] Explain data handling, account deletion, pricing and support clearly.

## Phase 10 — Extend Concept Exploration

### 10.1 Combine and Reshape Concepts

- [ ] Combine selected components from separate concepts with explicit origins.
- [ ] Resolve duplicate identities and missing dependencies during import.
- [ ] Abstract a component into a broader goal and instantiate concrete variants.
- [ ] Expose user-defined dimensions that can be locked or varied across branches.

### 10.2 Add Evaluated Intelligence

- [ ] Suggest tags, relationships, tensions and change summaries with
  supporting context, shown in the orb's annotation layer.
- [ ] Keep deterministic differences separate from inferred consequences.
- [ ] Make analogy suggestions inspectable as explicit structural mappings.
- [ ] Suggest arrangements without moving components until the user accepts.
- [ ] Evaluate usefulness and correction effort before adopting each capability.

## Stretch Features

Kept for later. Revisit each only when testing or usage gives a reason.

- **Overlay comparison** — draw a branch's differences directly on the canvas
  instead of side by side.
- **CRDT text editing** — replace per-field last-write-wins with Yjs or
  similar, only if simultaneous text edits start colliding.
- **Local inference** — browser or on-device models for classification,
  tagging and similarity, after measuring quality and device constraints.
- **Analogy browser** — a dedicated view for cross-domain structural analogies.
- **Folders** — grouping inside workspaces, once teams hold enough concepts.
- **Downloadable desktop app** — after the web version is established.
- **Mobile viewing** — read-only access to shared concepts on small screens.
- **Self-hosting** — the NAS and Cloudflare Tunnel deployment.
