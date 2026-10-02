# Changelog

Notable changes to Idea Design are recorded here.

## [Unreleased]

### Added

- Idea Design implementation plan covering concept editing, semantic zoom,
  branching, comparison, selective merging and history.
- Concept editor with freeform text components, connections, tags, title and
  description formatting, right-click menus, pan, zoom, fit-to-content, an
  outline view and session undo and redo.
- Concepts panel with create, rename and delete.
- Session alternatives copied from Main, with clickable branch navigation.

### Changed

- Component types became a single optional, free-form tag, and component
  positions became layouts that also hold title and description formatting.
- Text formatting now offers Regular, Medium and Bold weights and opacity.
- Use a lighter text weight scale and preview weight and opacity choices on hover.
- Double-click or press F2 to rename concepts and branches.
- Continue the dark header divider across the canvas and round both left corners.
- Keep text underlines visible, centre rail icons, align the panel toolbar,
  contain tree connectors and toggle between compact and expanded concepts.
- Rename projects to workspaces in the concept model and database.
- Record edits as typed operations in a log, and undo and redo by appending
  inverse operations.
- Store each branch as an append-only operation log with snapshots, give
  access through workspace membership and keep deleted concepts recoverable.
- Sign in with an emailed link, and give each account a Personal workspace.
- Save concepts through an IndexedDB outbox with a Saving, Saved and Save Failed
  status, pull edits from other tabs on focus, reopen the last concept used and
  offer to apply changes left unsaved by a closed session.
- Move deleted concepts to Recently Deleted in the Concepts panel, with
  Restore and Delete Permanently.
- Export a concept as versioned JSON and import it as a new concept, keeping its
  component and connection IDs.
- Resize a component from its corner, setting its width and a minimum height,
  or fit it back to its text.
- Turn the Settings gear as its menu opens, and lift the Add button on hover.
- Draw "depends on" connections dashed and "alternative to" connections dotted,
  with both kinds offered in the connection menu.
- Switch branches from the last breadcrumb segment.
- Save branches with their lineage: branch from any branch's current state or
  from a named checkpoint, keep component IDs, reopen the last branch used, and
  rename or archive branches without losing their history.
- Explore from a selected component: Substitute, Constrain or Remove it in
  branches of their own, see changes marked and connected components boxed for
  review, then keep the branches with Done or archive them with Discard or Esc.
- Name each rail view and its shortcut in a tooltip; Alt+1 toggles the Concepts
  panel and Ctrl+, opens Settings.
- Raise text people read to at least 11px with 4.5:1 contrast.
- Enlarge the rail, Concepts panel, header and bottom toolbar, with 12px
  interface text, so the shell reads comfortably at 100% zoom.
- Show the save state in the breadcrumb only while saving, animate the Concepts
  panel, quieten menus and show a pointer over clickable controls.
- Save text after a pause in typing, keeping one undo step per edit.
