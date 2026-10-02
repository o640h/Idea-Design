"use client";

import { useCallback, useRef, useState } from "react";
import {
  type ConceptSummary,
  emptyConcept,
  listRevisions,
  loadEditor,
  type Revision,
  revisionDocument,
} from "@/lib/concepts/database";
import {
  type ChangeOptions,
  createEditorState,
  type EditorAction,
  type EditorState,
  editorReducer,
} from "@/lib/concepts/editor";
import type { ConceptId, Workspace } from "@/lib/concepts/model";
import type { Operation } from "@/lib/concepts/operations";
import { createClient } from "@/lib/supabase/client";
import {
  type SessionBranch,
  type SessionConcept,
  updateEditors,
  useSync,
} from "./sync";

/** The branch to open first, already loaded on the server. */
export interface OpenedBranch {
  id: ConceptId;
  branchId: string;
  editor: EditorState;
  revisions: Revision[];
}

export type ConceptSession = ReturnType<typeof useConceptSession>;

function newConcept(
  workspace: Workspace,
  operations: Operation[],
): SessionConcept {
  const id = crypto.randomUUID();

  return {
    id,
    title: "",
    deletedAt: null,
    branches: [
      {
        id: crypto.randomUUID(),
        title: "Main",
        main: true,
        archivedAt: null,
        sourceRevisionId: null,
        editor: editorReducer(
          createEditorState(emptyConcept(id, workspace.id)),
          { type: "change", operations },
        ),
      },
    ],
    revisions: [],
  };
}

function updateConcept(
  concepts: SessionConcept[],
  id: ConceptId,
  update: (concept: SessionConcept) => SessionConcept,
) {
  return concepts.map((concept) =>
    concept.id === id ? update(concept) : concept,
  );
}

export function conceptTitle(concept: SessionConcept) {
  return concept.branches[0].editor?.present.concept.title ?? concept.title;
}

/** The branch a branch came from, unless it has been archived. */
export function parentBranch(concept: SessionConcept, branch: SessionBranch) {
  const parentId = concept.revisions?.find(
    ({ id }) => id === branch.sourceRevisionId,
  )?.branchId;

  return concept.branches.find(
    ({ id, archivedAt }) => id === parentId && !archivedAt,
  );
}

function setCookie(name: string, value: string) {
  // Read on the server, so the next visit opens this branch straight away.
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not in every supported browser
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * The concepts and branches open in this tab, which one is shown, and the
 * actions that change them. Every change is saved through the outbox.
 */
export function useConceptSession(
  workspace: Workspace,
  summaries: ConceptSummary[],
  opened: OpenedBranch,
) {
  const [concepts, setConcepts] = useState<SessionConcept[]>(() =>
    summaries.map((summary) => ({
      ...summary,
      branches: summary.branches.map((branch) => ({
        ...branch,
        editor: branch.id === opened.branchId ? opened.editor : null,
      })),
      revisions: summary.id === opened.id ? opened.revisions : null,
    })),
  );
  const [activeId, setActiveId] = useState(opened.id);
  const [activeBranchId, setActiveBranchId] = useState(opened.branchId);
  const loading = useRef(new Set<string>());
  const sync = useSync(concepts, setConcepts);

  const activeConcept =
    concepts.find((concept) => concept.id === activeId) ?? concepts[0];
  const activeBranch =
    activeConcept.branches.find((branch) => branch.id === activeBranchId) ??
    activeConcept.branches[0];
  const owner = (conceptId: ConceptId) => ({
    conceptId,
    workspaceId: workspace.id,
  });

  const dispatchTo = useCallback(
    (branchId: string, action: EditorAction, options?: ChangeOptions) =>
      setConcepts((current) =>
        updateEditors(current, action, branchId, options),
      ),
    [],
  );
  const dispatch = useCallback(
    (action: EditorAction, options?: ChangeOptions) =>
      dispatchTo(activeBranchId, action, options),
    [dispatchTo, activeBranchId],
  );

  function updateBranches(
    conceptId: ConceptId,
    branchIds: string[],
    changes: Partial<SessionBranch>,
  ) {
    setConcepts((current) =>
      updateConcept(current, conceptId, (concept) => ({
        ...concept,
        branches: concept.branches.map((branch) =>
          branchIds.includes(branch.id) ? { ...branch, ...changes } : branch,
        ),
      })),
    );
  }

  /** Opens a branch from the server the first time it is needed. */
  async function load(
    concept: SessionConcept,
    branchId = concept.branches[0].id,
  ) {
    const branch = concept.branches.find(({ id }) => id === branchId);

    if (!branch || branch.editor) {
      return branch?.editor;
    }

    if (loading.current.has(branchId)) {
      return;
    }

    loading.current.add(branchId);

    try {
      const supabase = createClient();
      const [editor, revisions] = await Promise.all([
        loadEditor(supabase, branchId, owner(concept.id)),
        concept.revisions ?? listRevisions(supabase, concept.id),
      ]);
      setConcepts((current) =>
        updateConcept(current, concept.id, (loaded) => ({
          ...loaded,
          branches: loaded.branches.map((candidate) =>
            candidate.id === branchId
              ? { ...candidate, editor: candidate.editor ?? editor }
              : candidate,
          ),
          revisions: loaded.revisions ?? revisions,
        })),
      );
      return editor;
    } finally {
      loading.current.delete(branchId);
    }
  }

  function selectBranch(conceptId: ConceptId, branchId: string) {
    const concept = concepts.find(({ id }) => id === conceptId);

    setActiveId(conceptId);
    setActiveBranchId(branchId);
    setCookie("last_concept", conceptId);
    setCookie("last_branch", branchId);

    if (concept) {
      void load(concept, branchId);
    }
  }

  function createConcept(operations: Operation[] = []) {
    const concept = newConcept(workspace, operations);

    sync.enqueue({
      kind: "concept",
      id: crypto.randomUUID(),
      conceptId: concept.id,
      workspaceId: workspace.id,
      branchId: concept.branches[0].id,
    });
    setConcepts((current) => [...current, concept]);
    selectBranch(concept.id, concept.branches[0].id);
  }

  function renameConcept(id: ConceptId, title: string) {
    const concept = concepts.find((candidate) => candidate.id === id);

    if (concept) {
      void load(concept).then(() =>
        dispatchTo(concept.branches[0].id, {
          type: "concept/update",
          field: "title",
          value: title,
        }),
      );
    }
  }

  function setTrashed(id: ConceptId, deletedAt: string | null) {
    sync.enqueue({
      kind: "trash",
      id: crypto.randomUUID(),
      conceptId: id,
      deletedAt,
    });
    setConcepts((current) =>
      updateConcept(current, id, (concept) => ({ ...concept, deletedAt })),
    );
  }

  /** Moves a concept to Trash, opening a neighbour if it was open. */
  function trashConcept(id: ConceptId) {
    setTrashed(id, new Date().toISOString());

    if (id !== activeConcept.id) {
      return;
    }

    const live = concepts.filter(({ deletedAt }) => !deletedAt);
    const index = live.findIndex((concept) => concept.id === id);
    const remaining = live.filter((concept) => concept.id !== id);
    const next = remaining[Math.min(index, remaining.length - 1)];

    if (next) {
      selectBranch(next.id, next.branches[0].id);
    } else {
      createConcept();
    }
  }

  function deleteForever(id: ConceptId) {
    sync.enqueue({ kind: "delete", id: crypto.randomUUID(), conceptId: id });
    setConcepts((current) => current.filter((concept) => concept.id !== id));
  }

  /**
   * Adds a branch that starts from a revision and opens it. The parent named
   * by `sealing` stops merging edits into its pending change, so later edits
   * there are not saved before the revision.
   */
  function addBranch(
    concept: SessionConcept,
    sourceRevisionId: string,
    editor: EditorState,
    {
      sealing,
      title = `Alternative ${concept.branches.length}`,
    }: { sealing?: { parentId: string; revision: Revision }; title?: string },
  ) {
    const branch: SessionBranch = {
      id: crypto.randomUUID(),
      title,
      main: false,
      archivedAt: null,
      sourceRevisionId,
      editor,
    };

    sync.enqueue({
      kind: "branch",
      id: crypto.randomUUID(),
      branchId: branch.id,
      conceptId: concept.id,
      title,
      sourceRevisionId,
    });
    setConcepts((current) =>
      updateConcept(
        sealing
          ? updateEditors(current, { type: "sync/seal" }, sealing.parentId)
          : current,
        concept.id,
        (latest) => ({
          ...latest,
          branches: [...latest.branches, branch],
          revisions: sealing
            ? [...(latest.revisions ?? []), sealing.revision]
            : latest.revisions,
        }),
      ),
    );
    selectBranch(concept.id, branch.id);

    return branch.id;
  }

  /**
   * Branches from what a branch shows now, unsaved edits included, and
   * applies `operations` there as the branch's first undoable change.
   */
  function branchFromEditor(
    concept: SessionConcept,
    parentId: string,
    parent: EditorState,
    {
      title,
      operations = [],
    }: { title?: string; operations?: Operation[] } = {},
  ) {
    const revision: Revision = {
      id: crypto.randomUUID(),
      branchId: parentId,
      kind: "branch",
      title: null,
      createdAt: new Date().toISOString(),
    };

    // The server places the revision at the parent's head once this tab's
    // earlier edits are saved, so the branch starts from what is shown here.
    sync.enqueue({
      kind: "revision",
      id: crypto.randomUUID(),
      revisionId: revision.id,
      branchId: parentId,
      revisionKind: "branch",
      title: null,
    });
    const editor = {
      ...createEditorState(parent.present),
      viewport: parent.viewport,
    };

    return addBranch(
      concept,
      revision.id,
      operations.length
        ? editorReducer(editor, { type: "change", operations })
        : editor,
      { sealing: { parentId, revision }, title },
    );
  }

  async function branchFrom(conceptId: ConceptId, parentId: string) {
    const concept = concepts.find(({ id }) => id === conceptId);
    const parent = concept && (await load(concept, parentId));

    return concept && parent
      ? branchFromEditor(concept, parentId, parent)
      : undefined;
  }

  /** Branches from a saved checkpoint; rejects if it cannot be loaded. */
  async function branchFromCheckpoint(revision: Revision) {
    const concept = activeConcept;
    const viewport = activeBranch.editor?.viewport;

    // The checkpoint may still be on its way to the server.
    await sync.flush();
    const editor = createEditorState(
      await revisionDocument(createClient(), revision.id, owner(concept.id)),
    );

    return addBranch(
      concept,
      revision.id,
      viewport ? { ...editor, viewport } : editor,
      {},
    );
  }

  function saveCheckpoint(title: string) {
    const revision: Revision = {
      id: crypto.randomUUID(),
      branchId: activeBranch.id,
      kind: "checkpoint",
      title,
      createdAt: new Date().toISOString(),
    };

    sync.enqueue({
      kind: "revision",
      id: crypto.randomUUID(),
      revisionId: revision.id,
      branchId: revision.branchId,
      revisionKind: "checkpoint",
      title,
    });
    setConcepts((current) =>
      updateConcept(
        updateEditors(current, { type: "sync/seal" }, revision.branchId),
        activeConcept.id,
        (concept) => ({
          ...concept,
          revisions: [...(concept.revisions ?? []), revision],
        }),
      ),
    );
  }

  function renameBranch(conceptId: ConceptId, branchId: string, title: string) {
    sync.enqueue({
      kind: "rename-branch",
      id: crypto.randomUUID(),
      branchId,
      title,
    });
    updateBranches(conceptId, [branchId], { title });
  }

  /**
   * Archives or restores branches. Archiving the open branch returns to the
   * branch it came from, or to Main.
   */
  function setArchived(
    conceptId: ConceptId,
    branchIds: string[],
    archived: boolean,
  ) {
    const archivedAt = archived ? new Date().toISOString() : null;

    for (const branchId of branchIds) {
      sync.enqueue({
        kind: "archive-branch",
        id: crypto.randomUUID(),
        branchId,
        archivedAt,
      });
    }

    updateBranches(conceptId, branchIds, { archivedAt });

    if (archived && branchIds.includes(activeBranch.id)) {
      selectBranch(
        conceptId,
        (parentBranch(activeConcept, activeBranch) ?? activeConcept.branches[0])
          .id,
      );
    }
  }

  return {
    workspace,
    concepts,
    activeConcept,
    activeBranch,
    sync,
    owner,
    dispatch,
    load,
    selectBranch,
    createConcept,
    renameConcept,
    trashConcept,
    restoreConcept: (id: ConceptId) => setTrashed(id, null),
    deleteForever,
    branchFrom,
    branchFromEditor,
    branchFromCheckpoint,
    saveCheckpoint,
    renameBranch,
    setArchived,
  };
}
