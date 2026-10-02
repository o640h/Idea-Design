"use client";

import { useCallback, useState } from "react";
import type { ConceptSummary, Revision } from "@/lib/concepts/database";
import type { ConceptId, Workspace } from "@/lib/concepts/model";
import type { Operation } from "@/lib/concepts/operations";
import {
  exportConcept,
  ImportError,
  importOperations,
  parseConceptExport,
} from "@/lib/concepts/transfer";
import ConceptCanvas, { type CanvasDisplay } from "./canvas";
import CompareView, { useCompareReference } from "./compare";
import ConceptPanel from "./concept_panel";
import { useExploration } from "./explore";
import EditorHeader from "./header";
import Notice from "./notice";
import Rail, { type EditorView } from "./rail";
import { conceptTitle, type OpenedBranch, useConceptSession } from "./session";

interface ConceptEditorProps {
  workspace: Workspace;
  email: string | undefined;
  concepts: ConceptSummary[];
  opened: OpenedBranch;
}

/** The editor shell: header, rail, Concepts panel and the open branch. */
export default function ConceptEditor({
  workspace,
  email,
  concepts: summaries,
  opened,
}: ConceptEditorProps) {
  const session = useConceptSession(workspace, summaries, opened);
  const { concepts, activeConcept, activeBranch, sync } = session;
  const exploration = useExploration(session);
  const [view, setView] = useState<EditorView>("canvas");
  const compare = useCompareReference(session, view === "compare");
  const [panelOpen, setPanelOpen] = useState(true);
  const [display, setDisplay] = useState<CanvasDisplay>({
    borders: false,
    labels: true,
  });
  const [renamingBranchId, setRenamingBranchId] = useState<string | null>(null);
  /** The new checkpoint's name while it is being chosen. */
  const [checkpointName, setCheckpointName] = useState<string | null>(null);
  const [importFailure, setImportFailure] = useState<string | null>(null);
  const [branchFailed, setBranchFailed] = useState(false);

  const checkpoints = (activeConcept.revisions ?? [])
    .filter(
      ({ branchId, kind }) =>
        branchId === activeBranch.id && kind === "checkpoint",
    )
    .reverse();
  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);

  /** A new branch starts ready to name, while the panel is there to name it. */
  function startNaming(branchId: string | undefined) {
    if (branchId && panelOpen) {
      setRenamingBranchId(branchId);
    }
  }

  async function newBranch(conceptId: ConceptId, parentId: string) {
    startNaming(await session.branchFrom(conceptId, parentId));
  }

  function branchFromCheckpoint(revision: Revision) {
    session.branchFromCheckpoint(revision).then(startNaming, (error) => {
      console.warn("Could not branch from checkpoint", error);
      setBranchFailed(true);
    });
  }

  async function downloadConcept(id: ConceptId) {
    const concept = concepts.find((candidate) => candidate.id === id);
    const editor = concept && (await session.load(concept));

    if (!editor) {
      return;
    }

    const title = editor.present.concept.title || "Untitled Concept";
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportConcept(editor.present), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[\\/:*?"<>|]/g, "")}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url));
  }

  /** A new concept opens on its canvas; Compare would have nothing to show. */
  function createConcept(operations?: Operation[]) {
    session.createConcept(operations);
    setView("canvas");
  }

  async function importConcept(file: File) {
    try {
      createConcept(importOperations(parseConceptExport(await file.text())));
    } catch (error) {
      if (!(error instanceof ImportError)) {
        throw error;
      }

      setImportFailure(error.message);
    }
  }

  return (
    <div className="editor-stage">
      <div
        className="editor-window"
        inert={
          sync.leftOver > 0 ||
          importFailure !== null ||
          checkpointName !== null ||
          branchFailed
        }
      >
        <EditorHeader
          workspaceTitle={workspace.title}
          conceptTitle={conceptTitle(activeConcept)}
          panelOpen={panelOpen}
          branches={activeConcept.branches}
          activeBranch={activeBranch}
          checkpoints={checkpoints}
          saveStatus={sync.status}
          onRetrySave={() => void sync.flush()}
          onSelectBranch={(branchId) =>
            session.selectBranch(activeConcept.id, branchId)
          }
          onNewBranch={() => void newBranch(activeConcept.id, activeBranch.id)}
          onSaveCheckpoint={() =>
            setCheckpointName(`Checkpoint ${checkpoints.length + 1}`)
          }
          onBranchFromCheckpoint={branchFromCheckpoint}
        />

        <div className="flex min-h-0 flex-1">
          <aside
            className="flex shrink-0 bg-(--surface-shell)"
            aria-label="Editor Navigation"
          >
            <Rail
              email={email}
              view={view}
              onViewChange={setView}
              panelOpen={panelOpen}
              onTogglePanel={togglePanel}
            />

            {/* Kept mounted so the panel can slide closed. */}
            <div
              className={`w-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                panelOpen ? "md:w-(--panel-width)" : ""
              }`}
            >
              <div
                inert={!panelOpen}
                className={`flex h-full w-(--panel-width) transition-opacity duration-200 ${
                  panelOpen ? "opacity-100" : "opacity-0"
                }`}
              >
                <ConceptPanel
                  workspaceTitle={workspace.title}
                  concepts={concepts
                    .filter(({ deletedAt }) => !deletedAt)
                    .map((concept) => ({
                      id: concept.id,
                      title: conceptTitle(concept),
                      // An archived branch is listed only while it is open,
                      // so it can be restored from its menu.
                      branches: concept.branches
                        .filter(
                          ({ id, archivedAt }) =>
                            !archivedAt || id === activeBranch.id,
                        )
                        .map(({ id, title, main, archivedAt }) => ({
                          id,
                          title,
                          main,
                          archived: archivedAt !== null,
                        })),
                    }))}
                  trash={concepts
                    .filter(({ deletedAt }) => deletedAt)
                    .map((concept) => ({
                      id: concept.id,
                      title: conceptTitle(concept),
                    }))}
                  activeConceptId={activeConcept.id}
                  activeBranchId={activeBranch.id}
                  renamingBranchId={renamingBranchId}
                  onRenamingBranchChange={setRenamingBranchId}
                  onSelect={session.selectBranch}
                  onCreate={() => createConcept()}
                  onImport={importConcept}
                  onExport={downloadConcept}
                  onCreateBranch={(conceptId, branchId) =>
                    void newBranch(conceptId, branchId)
                  }
                  onRename={session.renameConcept}
                  onRenameBranch={session.renameBranch}
                  onArchiveBranch={(conceptId, branchId, archived) =>
                    session.setArchived(conceptId, [branchId], archived)
                  }
                  onDelete={session.trashConcept}
                  onRestore={session.restoreConcept}
                  onDeleteForever={session.deleteForever}
                  onClose={() => setPanelOpen(false)}
                />
              </div>
            </div>
          </aside>

          <main
            className="min-w-0 flex-1 overflow-hidden rounded-l-xl border-l border-(--border-subtle) bg-(--surface-canvas)"
            aria-label="Concept Editor"
          >
            {activeBranch.editor &&
              (view === "compare" ? (
                <CompareView
                  currentTitle={activeBranch.title}
                  current={activeBranch.editor.present}
                  compare={compare}
                  canUndo={activeBranch.editor.undoStack.length > 0}
                  canRedo={activeBranch.editor.redoStack.length > 0}
                  dispatch={session.dispatch}
                  onClose={() => setView("canvas")}
                />
              ) : (
                <ConceptCanvas
                  key={activeBranch.id}
                  state={activeBranch.editor}
                  dispatch={session.dispatch}
                  branchTitle={activeBranch.title}
                  display={display}
                  onDisplayChange={setDisplay}
                  initialEditId={exploration.initialEditId}
                  onExplore={exploration.start}
                  explore={exploration.canvas}
                />
              ))}
          </main>
        </div>
      </div>

      {sync.leftOver > 0 && (
        <Notice
          title="Unsaved Changes"
          actions={
            <>
              <button
                type="button"
                className="menu-item"
                onClick={() => void sync.discardLeftOver()}
              >
                Discard
              </button>
              <button
                type="button"
                className="menu-item is-primary"
                onClick={() => void sync.applyLeftOver()}
              >
                Apply
              </button>
            </>
          }
        >
          An earlier session closed before saving {sync.leftOver}{" "}
          {sync.leftOver === 1 ? "change" : "changes"}. Apply them to your
          concepts, or discard them?
        </Notice>
      )}

      {checkpointName !== null && (
        <Notice
          title="Save Checkpoint"
          onDismiss={() => setCheckpointName(null)}
          actions={
            <>
              <button
                type="button"
                className="menu-item"
                onClick={() => setCheckpointName(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="checkpoint-form"
                disabled={!checkpointName.trim()}
                className="menu-item is-primary"
              >
                Save
              </button>
            </>
          }
        >
          Name this point in “{activeBranch.title}” so you can branch from it
          later.
          <form
            id="checkpoint-form"
            className="mt-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              session.saveCheckpoint(checkpointName.trim());
              setCheckpointName(null);
            }}
          >
            <input
              data-autofocus
              aria-label="Checkpoint Name"
              value={checkpointName}
              onChange={(event) => setCheckpointName(event.target.value)}
              onFocus={(event) => event.target.select()}
              className="h-7 w-full rounded-sm bg-(--surface-control) px-2 text-ui text-(--text-primary) outline-none"
            />
          </form>
        </Notice>
      )}

      {branchFailed && (
        <Notice
          title="Could Not Branch"
          onDismiss={() => setBranchFailed(false)}
          actions={
            <button
              type="button"
              className="menu-item is-primary"
              onClick={() => setBranchFailed(false)}
            >
              OK
            </button>
          }
        >
          This checkpoint hasn’t reached the server yet. Check your connection
          and try again.
        </Notice>
      )}

      {importFailure && (
        <Notice
          title="Could Not Import"
          onDismiss={() => setImportFailure(null)}
          actions={
            <button
              type="button"
              className="menu-item is-primary"
              onClick={() => setImportFailure(null)}
            >
              OK
            </button>
          }
        >
          {importFailure}
        </Notice>
      )}
    </div>
  );
}
