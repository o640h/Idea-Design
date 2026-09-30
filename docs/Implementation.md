# Idea Design Implementation

Build a concept design environment for exploring alternatives without losing
the original idea or its reasoning. Make concepts editable, comparable and
traceable through branching, selective merging and history.

Use React, TypeScript, Next.js and React Flow, with Supabase for accounts and
PostgreSQL storage. Keep concept operations independent of the interface.
Use IndexedDB for draft recovery and server-side AI for optional assistance.

Keep the single Next.js application at the repository root, with routes in
`app/` and static assets in `public/`. Run pnpm and Biome from that root.

Develop locally and use Vercel Hobby only for eligible non-commercial previews.
Launch on Vercel Pro with Supabase Free, upgrading as usage requires. Retain
the NAS with Cloudflare Tunnel as the alternative deployment option.

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

- [x] Store projects, concepts, components and relationships with stable IDs.
- [x] Allow a concept to begin with a title and unstructured description.
- [x] Give components an optional single tag, suggesting goal, principle,
  mechanism, actor, constraint, assumption and evidence alongside custom tags.
- [x] Separate containment from dependencies and other semantic relationships.
- [x] Store node positions, title and description formatting and viewport state
  separately from concept content.
- [x] Version the saved document format so stored projects remain readable.

### 2.2 Build the First Editor

- [x] Translate the Figma shell into shared colours, type, spacing and layout.
- [x] Create a concept, edit its description and add its first component.
- [x] Rename, edit, connect and remove components directly in the editor.
- [x] Allow users to leave components untagged and relationships unlabelled.
- [x] Add selection, pan, zoom, fit-to-content and a text bar anchored to the
  selected component, instead of a side panel. The bar sets the tag and the
  size, weight, opacity and italic of the title or description being edited, previewing
  sizes, weights and opacity on hover without committing the preview.
- [x] Toggle component borders and tag labels from the canvas display menu.
- [x] Add right-click menus for components, connections and the canvas, and
  create, rename and delete concepts from the Concepts panel.
- [x] Create root concepts with the folder button and session alternatives copied
  from Main with the file button. Switch branches from the Concepts panel;
  durable branch lineage and history remain in Phase 4.
- [x] Rename concepts and branches by double-clicking their names, using F2
  or choosing Rename from their context menu.
- [x] Provide keyboard access to the same content through an outline view.
- [x] Add session undo and redo for content edits and graph operations.

### 2.3 Save Work Safely

- [ ] Record edits in an append-only operation log with periodic snapshots,
  and open a concept by replaying it. Back undo and redo with the log.
- [ ] Add account sign-in and private project ownership through Supabase.
- [ ] Place every concept in a workspace, defaulting to Personal. Create and
  rename workspaces from the Concepts panel and reopen the last concept used.
- [ ] Enforce per-user access in database policies and server endpoints.
- [ ] Autosave working drafts and show Saving, Saved and Save Failed states.
- [ ] Keep recoverable local drafts in IndexedDB when a save is interrupted.
- [ ] Detect stale writes from another tab or device before overwriting work,
  resolving them per component field with last-write-wins.
- [ ] Let users recover or discard a local draft after reopening the project.
- [ ] Make deleting a saved concept recoverable rather than immediate.
- [ ] Export and import the current concept as validated, versioned JSON.

### 2.4 Verify the First Complete Journey

- [ ] Create a concept, edit its structure, reload and continue editing.
- [ ] Test interrupted saves, stale writes and recovery without data loss.
- [ ] Verify one account cannot read or modify another account's projects.
- [ ] Confirm importing an export preserves component IDs and relationships.

## Phase 3 — Navigate Purpose and Detail

### 3.1 Add Flexible Levels of Detail

- [ ] Nest components under a purpose or mechanism without requiring a tree
  for every relationship in the concept.
- [ ] Support collapsing, expanding and focusing on a component's contents.
- [ ] Prevent containment cycles while allowing valid cross-links.
- [ ] Split and merge components as explicit operations so component identity,
  and therefore comparison and merging, survives the edit.
- [ ] Preserve a visible route back to the parent concept and overview.

### 3.2 Implement Semantic Zoom

- [ ] Show purpose, major alternatives and key tensions in the overview.
- [ ] Reveal mechanisms, components and constraints at the middle level.
- [ ] Reveal assumptions, evidence and detailed descriptions at close range.
- [ ] Keep selected content and spatial landmarks stable across transitions.
- [ ] Provide a Far, Mid and Near level rail alongside pointer and touch
  navigation.
- [ ] Filter components by tag from the display menu, dimming non-matching
  components rather than hiding them.
- [ ] Respect reduced motion and preserve focus when detail changes.

### 3.3 Check Navigation With Real Concepts

- [ ] Populate product and systems-design examples with meaningful content.
- [ ] Test movement from purpose to evidence and back without losing context.
- [ ] Check rendering and editing with representative larger concepts.
- [ ] Reduce clutter through progressive disclosure before adding more UI.

### 3.4 Refine Canvas Interaction

- [ ] Snap to the grid and to other components' edges and text baselines with
  smart guides, holding a modifier key to disable snapping.
- [ ] Use a custom cursor that matches the canvas while keeping standard
  meanings, such as the I-beam over text and grab while panning.
- [ ] Animate handwriting only for newly created or AI-inserted text, keeping
  it fast and respecting reduced motion.
- [ ] Format selected ranges within a component if whole-field formatting
  proves too coarse.

## Phase 4 — Explore and Compare Alternatives

### 4.1 Create Branches and Revisions

- [ ] Represent branches as pointers to operation-log heads, so revisions,
  lineage, diffs and rewinding derive from the same log.
- [ ] Create a revision at branching, named checkpoints and accepted merges.
- [ ] Branch from a saved revision while preserving inherited component IDs.
- [ ] Record the source revision, parent branch and divergence point.
- [ ] Edit a branch without modifying its parent or sibling branches.
- [ ] Rename, switch and archive branches without deleting their history.

### 4.2 Make Controlled Changes

- [ ] Explore from a selected component as a mode, showing its branches in a
  chip; Done keeps them and Discard or Esc drops them.
- [ ] Change the bottom bar's tools by mode, always keeping undo and redo.
- [ ] Replace a mechanism or actor within an alternative branch.
- [ ] Add a constraint or temporarily remove a component in that branch.
- [ ] Mark explicitly connected dependencies that may need review with the
  attention box, the only box shown besides selection.
- [ ] Keep possible consequences distinct from changes the user has made.
- [ ] Make the current branch and unsaved state visible throughout editing.

### 4.3 Compare Concept Versions

- [ ] Compare components and relationships by stable ID, including changed
  relationship types and endpoints.
- [ ] Identify added, removed and edited content; exclude layout-only changes.
- [ ] Show before-and-after values with unchanged context available on demand.
- [ ] Compare versions side by side from the Compare rail view with
  per-component merge; defer overlay comparison.
- [ ] Let users inspect both the divergence revision and current alternatives.
- [ ] Test branching isolation and comparisons after renaming or removing nodes.

## Phase 5 — Merge and Understand History

### 5.1 Preview Selective Merges

- [ ] Select individual components, fields and relationships to bring across.
- [ ] Compare source and target changes against their shared base revision.
- [ ] Flag competing edits and deletion-versus-edit conflicts for resolution.
- [ ] Show required dependencies before including or excluding related content.
- [ ] Preview the resulting concept without changing the working draft.

### 5.2 Apply Merges Safely

- [ ] Resolve conflicts explicitly and preserve unselected target content.
- [ ] Validate references and containment before accepting the result.
- [ ] Save the result and merge provenance in one authorised transaction.
- [ ] Reject a stale preview if the target changed before acceptance.
- [ ] Record the source revision and selected changes for partial merges.
- [ ] Ensure a later merge does not treat previously excluded changes as merged.
- [ ] Test conflicting edits, missing dependencies and repeated partial merges.

### 5.3 Navigate Concept Lineage

- [ ] Show branch origins, saved checkpoints and merge events in the Lineage
  and History rail views.
- [ ] Open historical revisions read-only and compare them with current work.
- [ ] Restore a prior revision as a new revision without erasing later history.
- [ ] Branch from a historical revision to revisit a discarded direction.
- [ ] Export and reimport a project with its branches, revisions and lineage.

### 5.4 Verify the Core Interaction

- [ ] Complete create, branch, change, compare and selectively merge end to end.
- [ ] Observe people using the interaction on their own design problems.
- [ ] Check whether they can explain what changed and recover rejected ideas.
- [ ] Remove interaction friction before adding broader concept operations.

## Phase 6 — Turn Rough Thoughts Into Structure

### 6.1 Propose an Editable Decomposition

- [ ] Make the orb the only AI entry point. It stays dim when idle and
  brightens when it has something to show; clicking it toggles an annotation
  layer, and clicking it with text selected runs structure extraction.
- [ ] Store AI tag suggestions apart from components as suggested, accepted or
  dismissed; never apply them without acceptance.
- [ ] Send only the selected draft text to a server-side model endpoint.
- [ ] Request structured components and relationships in a validated format.
- [ ] Preserve the original text and link extracted content to its passages.
- [ ] Distinguish extracted statements from new model suggestions.
- [ ] Present a preview where users can edit, accept or reject individual parts.
- [ ] Apply accepted changes as one undoable operation against the current draft.

### 6.2 Bound Cost and Failure

- [ ] Keep provider credentials server-side and require authenticated requests.
- [ ] Limit input size, output size, request frequency and per-account usage.
- [ ] Set a provider spending limit where supported and track request costs.
- [ ] Validate model output before it can modify any concept.
- [ ] Handle timeout, cancellation and invalid output without changing the draft.
- [ ] Explain what content leaves the device before the user requests analysis.

### 6.3 Evaluate the Assistance

- [ ] Use representative rough drafts with ambiguity and overlapping concepts.
- [ ] Check fidelity, unsupported additions and the amount of correction needed.
- [ ] Compare assisted decomposition with direct manual editing.
- [ ] Confirm all core concept operations remain usable without AI.

## Phase 7 — Share a Useful Result

### 7.1 Publish Read-Only Concepts

- [ ] Share an explicitly selected revision rather than a changing private draft.
- [ ] Preview exactly which content and history will be exposed.
- [ ] Create revocable read-only links without exposing other project data.
- [ ] Let visitors explore the concept without creating an account.
- [ ] Keep unlisted shared concepts out of search indexing by default.

### 7.2 Let Others Build on a Concept

- [ ] Allow the owner to enable or disable forking for a shared revision.
- [ ] Copy a permitted revision into the recipient's private workspace.
- [ ] Retain attribution without granting access to the source's private history.
- [ ] Explain that revoking a link cannot recall an existing copy or export.
- [ ] Export a readable concept summary and selected comparison as Markdown.

### 7.3 Finish the Main User Journey

- [ ] Add a populated example and a clear route from rough text to first concept.
- [ ] Add the Search, Bookmarks and Settings rail views, with project search,
  recent projects and clear empty and error states.
- [ ] Open a workspace's Home grid of concepts from its name in the Concepts
  panel.
- [ ] Check keyboard use, focus, contrast and readable narrow-screen views.
- [ ] Verify shared links and exports with a separate account and signed-out user.

## Phase 8 — Launch and Earn Repeat Use

### 8.1 Prepare Hosting and Recovery

- [ ] Create separate development and production configuration and databases.
- [ ] Use Vercel Pro with Supabase Free for the managed commercial launch.
- [ ] If choosing NAS web hosting, keep Supabase for accounts and data;
  publish only the web service through Cloudflare Tunnel.
- [ ] Connect the chosen domain with HTTPS and verify authentication redirects.
- [ ] Monitor application failures, failed saves, database usage and AI spend.
- [ ] Back up production data to separate encrypted storage and test a restore.
- [ ] Verify deployment rollback and database migration recovery procedures.

### 8.2 Test Product Value

- [ ] Recruit product designers and small software teams with real decisions.
- [ ] Compare similar tasks in their current tools and Idea Design, varying order.
- [ ] Observe time to a useful comparison, meaningful alternatives and clarity
  of reasoning rather than counting nodes or generated text.
- [ ] Check voluntary return use over several weeks and reasons for abandoning.
- [ ] Ask for payment after users have experienced the complete core workflow.

### 8.3 Add Billing and Launch Material

- [ ] Define a paid offer around recurring concept work with bounded AI usage.
- [ ] Add hosted checkout, verified billing webhooks and server-side entitlements.
- [ ] Make duplicate billing events harmless and support cancellation.
- [ ] Preserve export access when a subscription ends.
- [ ] Publish a short demonstration and a worked, explorable design example.
- [ ] Explain data handling, account deletion, pricing and support clearly.

## Phase 9 — Extend Concept Exploration

### 9.1 Combine and Reshape Concepts

- [ ] Combine selected components from separate concepts with explicit origins.
- [ ] Resolve duplicate identities and missing dependencies during import.
- [ ] Abstract a mechanism into a broader goal and instantiate concrete variants.
- [ ] Expose user-defined dimensions that can be locked or varied across branches.

### 9.2 Add Evaluated Intelligence

- [ ] Suggest relationships, tensions and change summaries with supporting context.
- [ ] Keep deterministic differences separate from inferred consequences.
- [ ] Make analogy suggestions inspectable as explicit structural mappings.
- [ ] Evaluate usefulness and correction effort before adopting each capability.
- [ ] Consider local inference only after measuring quality and device constraints.
- [ ] Suggest arrangements without moving components until the user accepts.

### 9.3 Introduce Collaboration When Needed

- [ ] Add workspace membership with Owner, Can Edit, Can Comment and Can View
  roles, and links that allow viewing and forking the Main branch. List shared
  workspaces under Shared in the Concepts panel.
- [ ] Show presence only between people on the same branch, with colours
  reserved for people and cursors matching the custom canvas cursor.
- [ ] Anchor comments to components and let them become operations.
- [ ] Define simultaneous-edit conflict behaviour separately from concept
  branching, starting with last-write-wins per field and adding a CRDT only if
  text collisions appear.
- [ ] Test reconnects, permission changes and concurrent edits before release.
- [ ] Preserve individual authorship and revision history in shared projects.
