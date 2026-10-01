"use client";

import {
  Bookmark,
  Check,
  ChevronDown,
  createLucideIcon,
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
  loadEditor,
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
  className: "text-[var(--text-rail)]",
} as const;

interface ConceptEditorProps {
  workspace: Workspace;
  email: string | undefined;
  concepts: ConceptSummary[];
  /** The concept to open first, already loaded on the server. */
  opened: { id: ConceptId; editor: EditorState };
}

function newConcept(
  workspace: Workspace,
  operations: Operation[],
): SessionConcept {
  const id = crypto.randomUUID();
  const mainBranchId = crypto.randomUUID();

  return {
    id,
    title: "",
    deletedAt: null,
    mainBranchId,
    branches: [
      {
        id: mainBranchId,
        title: "Main",
        editor: editorReducer(
          createEditorState(emptyConcept(id, workspace.id)),
          { type: "change", operations },
        ),
      },
    ],
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
  return concept.branches?.[0].editor.present.concept.title ?? concept.title;
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
      branches:
        summary.id === opened.id
          ? [{ id: summary.mainBranchId, title: "Main", editor: opened.editor }]
          : null,
    })),
  );
  const [activeId, setActiveId] = useState(opened.id);
  const [activeBranchId, setActiveBranchId] = useState(
    () => summaries.find(({ id }) => id === opened.id)?.mainBranchId ?? "",
  );
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
  const loading = useRef(new Set<ConceptId>());
  const sync = useSync(concepts, setConcepts);

  const activeConcept =
    concepts.find((concept) => concept.id === activeId) ?? concepts[0];
  const activeBranch =
    activeConcept.branches?.find((branch) => branch.id === activeBranchId) ??
    activeConcept.branches?.[0];
  const liveConcepts = concepts.filter(({ deletedAt }) => !deletedAt);

  const dispatchTo = useCallback(
    (
      id: ConceptId,
      action: EditorAction,
      branchId?: string,
      options?: ChangeOptions,
    ) =>
      setConcepts((current) =>
        updateConcept(current, id, (concept) => ({
          ...concept,
          branches:
            concept.branches?.map((branch) =>
              !branchId || branch.id === branchId
                ? {
                    ...branch,
                    editor: editorReducer(branch.editor, action, options),
                  }
                : branch,
            ) ?? null,
        })),
      ),
    [],
  );
  const dispatch = useCallback(
    (action: EditorAction, options?: ChangeOptions) =>
      dispatchTo(activeId, action, activeBranchId, options),
    [dispatchTo, activeId, activeBranchId],
  );

  /** Opens a concept from the server the first time it is needed. */
  async function load(concept: SessionConcept) {
    if (concept.branches) {
      return concept.branches[0].editor;
    }

    if (loading.current.has(concept.id)) {
      return;
    }

    loading.current.add(concept.id);

    try {
      const editor = await loadEditor(createClient(), concept, workspace.id);
      setConcepts((current) =>
        updateConcept(current, concept.id, (loaded) => ({
          ...loaded,
          branches: loaded.branches ?? [
            { id: concept.mainBranchId, title: "Main", editor },
          ],
        })),
      );
      return editor;
    } finally {
      loading.current.delete(concept.id);
    }
  }

  function selectBranch(conceptId: ConceptId, branchId: string) {
    const concept = concepts.find(({ id }) => id === conceptId);

    setActiveId(conceptId);
    setActiveBranchId(branchId);
    // Read on the server, so the next visit opens this concept straight away.
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is not in every supported browser
    document.cookie = `last_concept=${conceptId}; path=/; max-age=31536000; samesite=lax`;

    if (concept) {
      void load(concept);
    }
  }

  function createConcept(operations: Operation[] = []) {
    const concept = newConcept(workspace, operations);

    sync.enqueue({
      kind: "concept",
      id: crypto.randomUUID(),
      conceptId: concept.id,
      workspaceId: workspace.id,
      branchId: concept.mainBranchId,
    });
    setConcepts((current) => [...current, concept]);
    selectBranch(concept.id, concept.mainBranchId);
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

  function createBranch() {
    const main = activeConcept.branches?.[0].editor;

    if (!main) {
      return;
    }

    const branch: SessionBranch = {
      id: crypto.randomUUID(),
      title: `Alternative ${activeConcept.branches?.length}`,
      editor: {
        ...createEditorState(structuredClone(main.present)),
        viewport: main.viewport,
      },
    };
    setConcepts((current) =>
      updateConcept(current, activeConcept.id, (concept) => ({
        ...concept,
        branches: [...(concept.branches ?? []), branch],
      })),
    );
    selectBranch(activeConcept.id, branch.id);
  }

  function renameConcept(id: ConceptId, title: string) {
    const concept = concepts.find((candidate) => candidate.id === id);

    if (concept) {
      void load(concept).then(() =>
        dispatchTo(id, {
          type: "concept/update",
          field: "title",
          value: title,
        }),
      );
    }
  }

  function renameBranch(conceptId: ConceptId, branchId: string, title: string) {
    setConcepts((current) =>
      updateConcept(current, conceptId, (concept) => ({
        ...concept,
        branches:
          concept.branches?.map((branch) =>
            branch.id === branchId ? { ...branch, title } : branch,
          ) ?? null,
      })),
    );
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
      selectBranch(next.id, next.mainBranchId);
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
        inert={sync.leftOver > 0 || importFailure !== null}
      >
        <header className="flex h-10 shrink-0 items-center border-b border-[var(--border-header)] bg-[var(--surface-shell)]">
          {/* As wide as the rail, so the logo sits centred above it. */}
          <div className="flex w-[46px] shrink-0 justify-center pl-1.5">
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
            className={`truncate pl-[18px] text-ui text-[var(--text-tertiary)] transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
              label={`Branch, ${activeBranch?.title ?? "Main"}`}
              trigger={
                <>
                  {activeBranch?.title ?? "Main"}
                  <ChevronDown aria-hidden="true" size={10} />
                </>
              }
              triggerClassName="inline-flex items-center gap-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {(close) => (
                <>
                  {(
                    activeConcept.branches ?? [
                      { id: activeConcept.mainBranchId, title: "Main" },
                    ]
                  ).map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      aria-pressed={branch.id === activeBranch?.id}
                      className="menu-item min-w-36 justify-between"
                      onClick={() => {
                        selectBranch(activeConcept.id, branch.id);
                        close();
                      }}
                    >
                      {branch.title}
                      {branch.id === activeBranch?.id && (
                        <Check aria-hidden="true" size={10} />
                      )}
                    </button>
                  ))}
                  <div className="my-0.5 border-t border-[var(--border)]" />
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      createBranch();
                      close();
                    }}
                  >
                    <Plus aria-hidden="true" size={10} />
                    New Branch From Main
                  </button>
                </>
              )}
            </Menu>
            <SaveIndicator status={sync.status} onRetry={sync.retry} />
          </nav>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside
            className="flex shrink-0 bg-[var(--surface-shell)]"
            aria-label="Editor Navigation"
          >
            <nav className="my-1.5 ml-1.5 flex w-10 shrink-0 flex-col rounded-lg bg-[var(--surface-rail)] p-1 shadow-[inset_0_0_0_1px_var(--border-rail)]">
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
                    className="flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-[var(--surface-shell)]"
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
                      className="flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-[var(--surface-idle)]"
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
                  triggerClassName="settings-trigger flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-[var(--surface-canvas)]"
                >
                  {() => (
                    <>
                      <p className="px-2 py-1.5 text-ui text-[var(--text-tertiary)]">
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
                panelOpen ? "md:w-[var(--panel-width)]" : ""
              }`}
            >
              <div
                inert={!panelOpen}
                className={`flex h-full w-[var(--panel-width)] transition-opacity duration-200 ${
                  panelOpen ? "opacity-100" : "opacity-0"
                }`}
              >
                <ConceptPanel
                  workspaceTitle={workspace.title}
                  concepts={liveConcepts.map((concept) => ({
                    id: concept.id,
                    title: conceptTitle(concept),
                    branches: concept.branches ?? [
                      { id: concept.mainBranchId, title: "Main" },
                    ],
                  }))}
                  trash={concepts
                    .filter(({ deletedAt }) => deletedAt)
                    .map((concept) => ({
                      id: concept.id,
                      title: conceptTitle(concept),
                    }))}
                  activeConceptId={activeConcept.id}
                  activeBranchId={
                    activeBranch?.id ?? activeConcept.mainBranchId
                  }
                  onSelect={selectBranch}
                  onCreate={() => createConcept()}
                  onImport={importConcept}
                  onExport={downloadConcept}
                  onCreateBranch={createBranch}
                  onRename={renameConcept}
                  onRenameBranch={renameBranch}
                  onDelete={trashConcept}
                  onRestore={(id) => setTrashed(id, null)}
                  onDeleteForever={deleteForever}
                  onClose={() => setPanelOpen(false)}
                />
              </div>
            </div>
          </aside>

          <main
            className="min-w-0 flex-1 overflow-hidden rounded-l-xl border-l border-[var(--border-subtle)] bg-[var(--surface-canvas)]"
            aria-label="Concept Editor"
          >
            {activeBranch && (
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
                className="menu-item bg-[var(--surface-control)] text-[var(--text-primary)]"
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

      {importFailure && (
        <Notice
          title="Could Not Import"
          actions={
            <button
              type="button"
              className="menu-item bg-[var(--surface-control)] text-[var(--text-primary)]"
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
          className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
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
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLButtonElement>("button:last-of-type")
      ?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="notice-title"
      className="menu-surface fixed top-1/2 left-1/2 z-50 flex w-72 -translate-1/2 flex-col gap-3 p-4"
    >
      <h2 id="notice-title" className="text-[13px] font-medium">
        {title}
      </h2>
      <p className="text-[11px] leading-4 text-[var(--text-tertiary)]">
        {children}
      </p>
      <div className="flex justify-end gap-1">{actions}</div>
    </div>
  );
}
