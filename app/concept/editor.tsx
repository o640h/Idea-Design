"use client";

import {
  Bookmark,
  createLucideIcon,
  RotateCcwClock,
  Search,
  Settings,
  Squircle,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import {
  createEditorState,
  type EditorAction,
  type EditorState,
  editorReducer,
  getConceptLayout,
} from "@/lib/concepts/editor";
import type { ConceptId, Workspace } from "@/lib/concepts/model";
import ConceptCanvas, { type CanvasDisplay } from "./canvas";
import ConceptPanel from "./concept_panel";

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

const navigationItems = [
  { label: "Search", Icon: Search },
  { label: "Lineage", Icon: Lineage },
  { label: "Compare", Icon: Compare },
  { label: "Bookmarks", Icon: Bookmark },
  { label: "History", Icon: RotateCcwClock },
];

const railIconProps = {
  "aria-hidden": true,
  size: 12,
  strokeWidth: 1.6,
  className: "text-[var(--text-rail)]",
} as const;

interface SessionBranch {
  id: string;
  title: string;
  editor: EditorState;
}

interface SessionConcept {
  id: ConceptId;
  branches: SessionBranch[];
}

function createSessionConcept(workspace: Workspace): SessionConcept {
  const id = crypto.randomUUID();
  const editor = createEditorState(
    {
      id,
      workspaceId: workspace.id,
      title: "",
      description: "",
      components: [],
      relationships: [],
    },
    { conceptId: id, components: [], viewport: { x: 0, y: 0, zoom: 1 } },
  );

  return {
    id,
    branches: [{ id: crypto.randomUUID(), title: "Main", editor }],
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

export default function ConceptEditor() {
  // Concepts are held in memory until saving is added.
  const [workspace] = useState<Workspace>(() => ({
    id: crypto.randomUUID(),
    title: "Personal",
  }));
  const [concepts, setConcepts] = useState(() => [
    createSessionConcept(workspace),
  ]);
  const [activeId, setActiveId] = useState<ConceptId>(() => concepts[0].id);
  const [activeBranchId, setActiveBranchId] = useState(
    () => concepts[0].branches[0].id,
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [display, setDisplay] = useState<CanvasDisplay>({
    borders: false,
    labels: true,
  });

  const activeConcept =
    concepts.find((concept) => concept.id === activeId) ?? concepts[0];
  const activeBranch =
    activeConcept.branches.find((branch) => branch.id === activeBranchId) ??
    activeConcept.branches[0];
  const activeEditor = activeBranch.editor;
  const activeTitle = activeEditor.present.concept.title || "Untitled Concept";

  const dispatchTo = useCallback(
    (id: ConceptId, action: EditorAction, branchId?: string) =>
      setConcepts((current) =>
        updateConcept(current, id, (concept) => ({
          ...concept,
          branches: concept.branches.map((branch) =>
            !branchId || branch.id === branchId
              ? { ...branch, editor: editorReducer(branch.editor, action) }
              : branch,
          ),
        })),
      ),
    [],
  );
  const dispatch = useCallback(
    (action: EditorAction) => dispatchTo(activeId, action, activeBranch.id),
    [dispatchTo, activeId, activeBranch.id],
  );

  function createConcept() {
    const concept = createSessionConcept(workspace);
    setConcepts((current) => [...current, concept]);
    selectBranch(concept.id, concept.branches[0].id);
  }

  function selectBranch(conceptId: ConceptId, branchId: string) {
    setActiveId(conceptId);
    setActiveBranchId(branchId);
  }

  function createBranch() {
    const main = activeConcept.branches[0].editor;
    const branch: SessionBranch = {
      id: crypto.randomUUID(),
      title: `Alternative ${activeConcept.branches.length}`,
      editor: createEditorState(
        structuredClone(main.present.concept),
        structuredClone(getConceptLayout(main)),
      ),
    };
    setConcepts((current) =>
      updateConcept(current, activeConcept.id, (concept) => ({
        ...concept,
        branches: [...concept.branches, branch],
      })),
    );
    selectBranch(activeConcept.id, branch.id);
  }

  function renameBranch(conceptId: ConceptId, branchId: string, title: string) {
    setConcepts((current) =>
      updateConcept(current, conceptId, (concept) => ({
        ...concept,
        branches: concept.branches.map((branch) =>
          branch.id === branchId ? { ...branch, title } : branch,
        ),
      })),
    );
  }

  function deleteConcept(id: ConceptId) {
    const index = concepts.findIndex((concept) => concept.id === id);
    const remaining = concepts.filter((concept) => concept.id !== id);
    const next = remaining.length
      ? remaining
      : [createSessionConcept(workspace)];

    setConcepts(next);

    if (id === activeConcept.id) {
      const concept = next[Math.min(index, next.length - 1)];
      selectBranch(concept.id, concept.branches[0].id);
    }
  }

  return (
    <div className="editor-stage">
      <div className="editor-window">
        <header className="flex h-9 shrink-0 items-center border-b border-[var(--border-header)] bg-[var(--surface-shell)] px-[9px]">
          <Image
            src="/icons/idea_design_logo.svg"
            alt="Idea Design"
            width={26.0088}
            height={4.33431}
            loading="eager"
          />
          <nav
            aria-label="Breadcrumb"
            className={`truncate pl-[21px] text-[11px] text-[var(--text-tertiary)] ${
              panelOpen ? "md:pl-[137px]" : ""
            }`}
          >
            {workspace.title}
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span>{activeTitle}</span>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span aria-current="page">{activeBranch.title}</span>
          </nav>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside
            className={`flex shrink-0 bg-[var(--surface-shell)] ${
              panelOpen ? "md:w-40" : ""
            }`}
            aria-label="Editor Navigation"
          >
            <nav className="my-1.5 ml-1.5 flex w-8 shrink-0 flex-col rounded-md bg-[var(--surface-rail)] p-1 shadow-[inset_0_0_0_1px_var(--border-rail)]">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Concepts"
                  aria-expanded={panelOpen}
                  aria-controls="concepts-panel"
                  onClick={() => setPanelOpen((open) => !open)}
                  className="flex h-6 w-full shrink-0 items-center justify-center rounded-sm bg-[var(--surface-shell)]"
                >
                  <Squircle {...railIconProps} />
                </button>
                {navigationItems.map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    disabled
                    className="flex h-6 w-full shrink-0 items-center justify-center rounded-sm bg-[var(--surface-idle)]"
                  >
                    <Icon {...railIconProps} />
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Settings"
                disabled
                className="mt-auto flex h-6 w-full shrink-0 items-center justify-center rounded-sm bg-[var(--surface-canvas)]"
              >
                <Settings {...railIconProps} />
              </button>
            </nav>

            {panelOpen && (
              <ConceptPanel
                workspaceTitle={workspace.title}
                concepts={concepts.map(({ id, branches }) => ({
                  id,
                  title: branches[0].editor.present.concept.title,
                  branches,
                }))}
                activeConceptId={activeConcept.id}
                activeBranchId={activeBranch.id}
                onSelect={selectBranch}
                onCreate={createConcept}
                onCreateBranch={createBranch}
                onRename={(id, title) =>
                  dispatchTo(id, { type: "concept/update", changes: { title } })
                }
                onRenameBranch={renameBranch}
                onDelete={deleteConcept}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </aside>

          <main
            className="min-w-0 flex-1 overflow-hidden rounded-l-xl border-l border-[var(--border-subtle)] bg-[var(--surface-canvas)]"
            aria-label="Concept Editor"
          >
            <ConceptCanvas
              key={activeBranch.id}
              state={activeEditor}
              dispatch={dispatch}
              display={display}
              onDisplayChange={setDisplay}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
