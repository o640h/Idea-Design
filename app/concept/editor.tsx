"use client";

import {
  Bookmark,
  Check,
  ChevronDown,
  createLucideIcon,
  Flag,
  Plus,
  RotateCcwClock,
  Search,
  Settings,
  Squircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import type {
  ConceptId,
  EditableConcept,
  Workspace,
} from "@/lib/concepts/model";
import type { Operation } from "@/lib/concepts/operations";
import {
  exportConcept,
  ImportError,
  importOperations,
  parseConceptExport,
} from "@/lib/concepts/transfer";
import { createClient } from "@/lib/supabase/client";
import ConceptCanvas, { type CanvasDisplay } from "./canvas";
import ConceptPanel from "./concept_panel";
import Menu from "./menu";
import {
  type SaveStatus,
  type SessionBranch,
  type SessionConcept,
  updateEditors,
  useSync,
} from "./sync";

/** Lucide's Split without its arrowheads, as drawn in the Figma rail. */
const Lineage = createLucideIcon("lineage", [
  ["path", { d: "M12 22v-8.3a4 4 0 0 0-1.172-2.828L3 3", key: "stem" }],
  ["path", { d: "m15 9 6-6", key: "branch" }],
]);

/** The Figma Compare icon, whose corners are rounder than Lucide's Copy. */
const Compare = createLucideIcon("compare", [
  [
    "path",
    {
      d: "M20.04 10.39h-6.43a3.21 3.21 0 0 0-3.22 3.22v6.43a3.21 3.21 0 0 0 3.22 3.21h6.43a3.21 3.21 0 0 0 3.21-3.21v-6.43a3.21 3.21 0 0 0-3.21-3.22Z",
      key: "front",
    },
  ],
  [
    "path",
    {
      d: "M3.96 13.61a3.21 3.21 0 0 1-3.21-3.22V3.96A3.21 3.21 0 0 1 3.96.75h6.43a3.21 3.21 0 0 1 3.22 3.21",
      key: "back",
    },
  ],
]);

/** Views still to come; their shortcuts are reserved in rail order. */
const navigationItems = [
  { label: "Search", Icon: Search, key: "2" },
  { label: "Lineage", Icon: Lineage, key: "3" },
  { label: "Compare", Icon: Compare, key: "4" },
  { label: "Bookmarks", Icon: Bookmark, key: "5" },
  { label: "History", Icon: RotateCcwClock, key: "6" },
];

function isMacPlatform() {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

/** False on the server, so the first render matches before the real value. */
function useIsMac() {
  return useSyncExternalStore(
    () => () => {},
    isMacPlatform,
    () => false,
  );
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable]"))
  );
}

/** Names a rail view and its shortcut beside the rail. */
function RailItem({
  id,
  label,
  shortcut,
  available = true,
  className = "",
  children,
}: {
  id: string;
  label: string;
  shortcut: string;
  available?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`rail-item ${className}`}>
      {children}
      <span role="tooltip" id={id} className="rail-tooltip">
        <span>{label}</span>
        <kbd>{shortcut}</kbd>
        {!available && <span className="rail-tooltip-note">Coming Soon</span>}
      </span>
    </span>
  );
}

const railIconProps = {
  "aria-hidden": true,
  size: 15,
  strokeWidth: 1.5,
  className: "text-(--text-rail)",
} as const;

interface ConceptEditorProps {
  workspace: Workspace;
  email: string | undefined;
  concepts: ConceptSummary[];
  /** The branch to open first, already loaded on the server. */
  opened: {
    id: ConceptId;
    branchId: string;
    editor: EditorState;
    revisions: Revision[];
  };
}

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

function conceptTitle(concept: SessionConcept) {
  return concept.branches[0].editor?.present.concept.title ?? concept.title;
}

function setCookie(name: string, value: string) {
  // Read on the server, so the next visit opens this branch straight away.
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not in every supported browser
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export default function ConceptEditor({
  workspace,
  email,
  concepts: summaries,
  opened,
}: ConceptEditorProps) {
  const router = useRouter();
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
  const [panelOpen, setPanelOpen] = useState(true);
  const settingsRef = useRef<HTMLSpanElement>(null);
  const isMac = useIsMac();
  const shortcuts = {
    concepts: isMac ? "⌥1" : "Alt+1",
    view: (key: string) => (isMac ? `⌥${key}` : `Alt+${key}`),
  };
  const [display, setDisplay] = useState<CanvasDisplay>({
    borders: false,
    labels: true,
  });
  const [importFailure, setImportFailure] = useState<string | null>(null);
  const [branchFailed, setBranchFailed] = useState(false);
  /** The new checkpoint's name while it is being chosen. */
  const [checkpointName, setCheckpointName] = useState<string | null>(null);
  const [renamingBranchId, setRenamingBranchId] = useState<string | null>(null);
  const loading = useRef(new Set<string>());
  const sync = useSync(concepts, setConcepts);

  const activeConcept =
    concepts.find((concept) => concept.id === activeId) ?? concepts[0];
  const activeBranch =
    activeConcept.branches.find((branch) => branch.id === activeBranchId) ??
    activeConcept.branches[0];
  const checkpoints = (activeConcept.revisions ?? [])
    .filter(
      ({ branchId, kind }) =>
        branchId === activeBranch.id && kind === "checkpoint",
    )
    .reverse();
  const liveConcepts = concepts.filter(({ deletedAt }) => !deletedAt);

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
        loadEditor(supabase, branchId, {
          conceptId: concept.id,
          workspaceId: workspace.id,
        }),
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

  async function downloadConcept(id: ConceptId) {
    const concept = concepts.find((candidate) => candidate.id === id);
    const editor = concept && (await load(concept));

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      const command = isMacPlatform() ? event.metaKey : event.ctrlKey;

      if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.code === "Digit1"
      ) {
        event.preventDefault();
        setPanelOpen((open) => !open);
      } else if (command && !event.altKey && event.key === ",") {
        event.preventDefault();
        settingsRef.current?.querySelector("button")?.click();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function updateBranch(
    conceptId: ConceptId,
    branchId: string,
    changes: Partial<SessionBranch>,
  ) {
    setConcepts((current) =>
      updateConcept(current, conceptId, (concept) => ({
        ...concept,
        branches: concept.branches.map((branch) =>
          branch.id === branchId ? { ...branch, ...changes } : branch,
        ),
      })),
    );
  }

  /**
   * Adds a branch that starts from a revision and opens it, ready to name.
   * The parent named by `sealing` stops merging edits into its pending
   * change, so later edits there are not saved before the revision.
   */
  function addBranch(
    concept: SessionConcept,
    sourceRevisionId: string,
    editor: EditorState,
    sealing?: { parentId: string; revision: Revision },
  ) {
    const branch: SessionBranch = {
      id: crypto.randomUUID(),
      title: `Alternative ${concept.branches.length}`,
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
      title: branch.title,
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

    if (panelOpen) {
      setRenamingBranchId(branch.id);
    }
  }

  /** Branches from what a branch shows now, unsaved edits included. */
  async function branchFrom(conceptId: ConceptId, parentId: string) {
    const concept = concepts.find(({ id }) => id === conceptId);
    const parent = concept && (await load(concept, parentId));

    if (!concept || !parent) {
      return;
    }

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
    addBranch(
      concept,
      revision.id,
      { ...createEditorState(parent.present), viewport: parent.viewport },
      { parentId, revision },
    );
  }

  async function branchFromCheckpoint(revision: Revision) {
    const concept = activeConcept;
    const viewport = activeBranch.editor?.viewport;
    let document: EditableConcept;

    try {
      // The checkpoint may still be on its way to the server.
      await sync.flush();
      document = await revisionDocument(createClient(), revision.id, {
        conceptId: concept.id,
        workspaceId: workspace.id,
      });
    } catch (error) {
      console.warn("Could not branch from checkpoint", error);
      setBranchFailed(true);
      return;
    }

    const editor = createEditorState(document);
    addBranch(
      concept,
      revision.id,
      viewport ? { ...editor, viewport } : editor,
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

  function renameBranch(conceptId: ConceptId, branchId: string, title: string) {
    sync.enqueue({
      kind: "rename-branch",
      id: crypto.randomUUID(),
      branchId,
      title,
    });
    updateBranch(conceptId, branchId, { title });
  }

  function setArchived(
    conceptId: ConceptId,
    branchId: string,
    archivedAt: string | null,
  ) {
    sync.enqueue({
      kind: "archive-branch",
      id: crypto.randomUUID(),
      branchId,
      archivedAt,
    });
    updateBranch(conceptId, branchId, { archivedAt });

    const concept = concepts.find(({ id }) => id === conceptId);
    const branch = concept?.branches.find(({ id }) => id === branchId);

    if (!concept || !branch || !archivedAt || branchId !== activeBranch.id) {
      return;
    }

    // Return to the branch it came from, or to Main.
    const parentId = concept.revisions?.find(
      ({ id }) => id === branch.sourceRevisionId,
    )?.branchId;
    const parent = concept.branches.find(
      ({ id, archivedAt }) => id === parentId && !archivedAt,
    );
    selectBranch(conceptId, (parent ?? concept.branches[0]).id);
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

  function trashConcept(id: ConceptId) {
    setTrashed(id, new Date().toISOString());

    if (id !== activeConcept.id) {
      return;
    }

    const index = liveConcepts.findIndex((concept) => concept.id === id);
    const remaining = liveConcepts.filter((concept) => concept.id !== id);
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
        <header className="flex h-10 shrink-0 items-center border-b border-(--border-header) bg-(--surface-shell)">
          {/* As wide as the rail, so the logo sits centred above it. */}
          <div className="flex w-11.5 shrink-0 justify-center pl-1.5">
            <Image
              src="/icons/idea_design_logo.svg"
              alt="Idea Design"
              width={32.0108}
              height={5.33454}
              loading="eager"
            />
          </div>
          <nav
            aria-label="Breadcrumb"
            className={`truncate pl-4.5 text-ui text-(--text-tertiary) transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              panelOpen ? "md:pl-[calc(var(--panel-width)+12px)]" : ""
            }`}
          >
            {workspace.title}
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span>{conceptTitle(activeConcept) || "Untitled Concept"}</span>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <Menu
              label={`Branch, ${activeBranch.title}`}
              trigger={
                <>
                  {activeBranch.title}
                  {activeBranch.archivedAt && (
                    <span className="text-(--text-tertiary)">(Archived)</span>
                  )}
                  <ChevronDown aria-hidden="true" size={10} />
                </>
              }
              triggerClassName="inline-flex items-center gap-1 text-(--text-secondary) transition-colors hover:text-(--text-primary)"
            >
              {(close) => {
                const archived = activeConcept.branches.filter(
                  ({ archivedAt }) => archivedAt,
                );
                const branchItem = (branch: SessionBranch) => (
                  <button
                    key={branch.id}
                    type="button"
                    aria-pressed={branch.id === activeBranch.id}
                    className="menu-item min-w-44 justify-between"
                    onClick={() => {
                      selectBranch(activeConcept.id, branch.id);
                      close();
                    }}
                  >
                    <span className="truncate">{branch.title}</span>
                    {branch.id === activeBranch.id && (
                      <Check aria-hidden="true" size={10} />
                    )}
                  </button>
                );

                return (
                  <>
                    {activeConcept.branches
                      .filter(({ archivedAt }) => !archivedAt)
                      .map(branchItem)}
                    <MenuDivider />
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        void branchFrom(activeConcept.id, activeBranch.id);
                        close();
                      }}
                    >
                      <Plus aria-hidden="true" size={10} />
                      New Branch
                    </button>
                    <button
                      type="button"
                      className="menu-item"
                      onClick={() => {
                        setCheckpointName(
                          `Checkpoint ${checkpoints.length + 1}`,
                        );
                        close();
                      }}
                    >
                      <Flag aria-hidden="true" size={10} />
                      Save Checkpoint…
                    </button>
                    {checkpoints.length > 0 && (
                      <>
                        <MenuDivider />
                        <MenuHeading>Branch From Checkpoint</MenuHeading>
                        {checkpoints.map((revision) => (
                          <button
                            key={revision.id}
                            type="button"
                            className="menu-item justify-between gap-4"
                            onClick={() => {
                              void branchFromCheckpoint(revision);
                              close();
                            }}
                          >
                            <span className="truncate">{revision.title}</span>
                            <span className="font-normal text-(--text-tertiary)">
                              {new Date(revision.createdAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {archived.length > 0 && (
                      <>
                        <MenuDivider />
                        <MenuHeading>Archived</MenuHeading>
                        {archived.map(branchItem)}
                      </>
                    )}
                  </>
                );
              }}
            </Menu>
            <SaveIndicator
              status={sync.status}
              onRetry={() => void sync.flush()}
            />
          </nav>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside
            className="flex shrink-0 bg-(--surface-shell)"
            aria-label="Editor Navigation"
          >
            <nav className="my-1.5 ml-1.5 flex w-10 shrink-0 flex-col rounded-lg bg-(--surface-rail) p-1 shadow-[inset_0_0_0_1px_var(--border-rail)]">
              <div className="flex flex-col gap-1">
                <RailItem
                  id="rail-concepts"
                  label="Concepts"
                  shortcut={shortcuts.concepts}
                >
                  <button
                    type="button"
                    aria-label="Concepts"
                    aria-describedby="rail-concepts"
                    aria-keyshortcuts="Alt+1"
                    aria-expanded={panelOpen}
                    aria-controls="concepts-panel"
                    onClick={() => setPanelOpen((open) => !open)}
                    className="flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-shell)"
                  >
                    <Squircle {...railIconProps} />
                  </button>
                </RailItem>
                {navigationItems.map(({ label, Icon, key }) => (
                  <RailItem
                    key={label}
                    id={`rail-${key}`}
                    label={label}
                    shortcut={shortcuts.view(key)}
                    available={false}
                  >
                    <button
                      type="button"
                      aria-label={label}
                      aria-describedby={`rail-${key}`}
                      disabled
                      className="flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-idle)"
                    >
                      <Icon {...railIconProps} />
                    </button>
                  </RailItem>
                ))}
              </div>

              <span ref={settingsRef} className="mt-auto flex">
                <Menu
                  label="Settings"
                  above
                  trigger={<Settings {...railIconProps} />}
                  triggerClassName="settings-trigger flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-canvas)"
                >
                  {() => (
                    <>
                      <p className="px-2 py-1.5 text-ui text-(--text-tertiary)">
                        {email}
                      </p>
                      <button
                        type="button"
                        className="menu-item"
                        onClick={async () => {
                          await createClient().auth.signOut();
                          router.replace("/sign-in");
                        }}
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </Menu>
              </span>
            </nav>

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
                  concepts={liveConcepts.map((concept) => ({
                    id: concept.id,
                    title: conceptTitle(concept),
                    // An archived branch is listed only while it is open, so
                    // it can be restored from its menu.
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
                  onSelect={selectBranch}
                  onCreate={() => createConcept()}
                  onImport={importConcept}
                  onExport={downloadConcept}
                  onCreateBranch={(conceptId, branchId) =>
                    void branchFrom(conceptId, branchId)
                  }
                  onRename={renameConcept}
                  onRenameBranch={renameBranch}
                  onArchiveBranch={(conceptId, branchId, archived) =>
                    setArchived(
                      conceptId,
                      branchId,
                      archived ? new Date().toISOString() : null,
                    )
                  }
                  onDelete={trashConcept}
                  onRestore={(id) => setTrashed(id, null)}
                  onDeleteForever={deleteForever}
                  onClose={() => setPanelOpen(false)}
                />
              </div>
            </div>
          </aside>

          <main
            className="min-w-0 flex-1 overflow-hidden rounded-l-xl border-l border-(--border-subtle) bg-(--surface-canvas)"
            aria-label="Concept Editor"
          >
            {activeBranch.editor && (
              <ConceptCanvas
                key={activeBranch.id}
                state={activeBranch.editor}
                dispatch={dispatch}
                display={display}
                onDisplayChange={setDisplay}
              />
            )}
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
                className="menu-item bg-(--surface-control) text-(--text-primary)"
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
                className="menu-item bg-(--surface-control) text-(--text-primary) disabled:opacity-40"
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
              saveCheckpoint(checkpointName.trim());
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
              className="menu-item bg-(--surface-control) text-(--text-primary)"
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
              className="menu-item bg-(--surface-control) text-(--text-primary)"
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

function MenuDivider() {
  return <div className="my-0.5 border-t border-(--border)" />;
}

function MenuHeading({ children }: { children: ReactNode }) {
  return <p className="eyebrow px-2.5 pt-1.5 pb-1">{children}</p>;
}

/** Long enough to read, so a quick save does not flicker. */
const SAVING_MIN_VISIBLE_MS = 900;

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (status === "saving") {
      shownAt.current = Date.now();
      setSaving(true);
      return;
    }

    const timer = window.setTimeout(
      () => setSaving(false),
      SAVING_MIN_VISIBLE_MS - (Date.now() - shownAt.current),
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  const state = status === "failed" ? "failed" : saving ? "saving" : "idle";

  return (
    <output className="save-indicator" data-state={state}>
      {state === "failed" ? (
        <button
          type="button"
          title="Retry"
          onClick={onRetry}
          className="text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        >
          Save Failed
        </button>
      ) : (
        <>
          <span aria-hidden="true" className="save-indicator-label">
            Saving
          </span>
          <span className="sr-only">{state === "saving" ? "Saving" : ""}</span>
        </>
      )}
    </output>
  );
}

/** A small modal message; the editor behind it is made inert. */
function Notice({
  title,
  children,
  actions,
  onDismiss,
}: {
  title: string;
  children: ReactNode;
  /** Focus starts on the element marked `data-autofocus`, or the last action. */
  actions: ReactNode;
  /** Called on Escape; without it the message must be answered. */
  onDismiss?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>("[data-autofocus], button:last-of-type")
      ?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="notice-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && onDismiss) {
          event.stopPropagation();
          onDismiss();
        }
      }}
      className="menu-surface fixed top-1/2 left-1/2 z-50 flex w-72 -translate-1/2 flex-col gap-3 p-4"
    >
      <h2 id="notice-title" className="text-[13px] font-medium">
        {title}
      </h2>
      <div className="text-small leading-4 text-(--text-tertiary)">
        {children}
      </div>
      <div className="flex justify-end gap-1">{actions}</div>
    </div>
  );
}
