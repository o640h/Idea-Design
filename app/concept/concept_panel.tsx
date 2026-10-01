"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FilePlusCorner,
  FolderPlus,
  type LucideIcon,
} from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import type { ConceptId } from "@/lib/concepts/model";
import ContextMenu, { type ContextMenuState } from "./context_menu";
import { TextField } from "./text_field";

interface ConceptPanelProps {
  workspaceTitle: string;
  concepts: {
    id: ConceptId;
    title: string;
    branches: { id: string; title: string }[];
  }[];
  trash: { id: ConceptId; title: string }[];
  activeConceptId: ConceptId;
  activeBranchId: string;
  onSelect: (id: ConceptId, branchId: string) => void;
  onCreate: () => void;
  onImport: (file: File) => void;
  onExport: (id: ConceptId) => void;
  onCreateBranch: () => void;
  onRename: (id: ConceptId, title: string) => void;
  onRenameBranch: (
    conceptId: ConceptId,
    branchId: string,
    title: string,
  ) => void;
  onDelete: (id: ConceptId) => void;
  onRestore: (id: ConceptId) => void;
  onDeleteForever: (id: ConceptId) => void;
  onClose: () => void;
}

function HeaderButton({
  label,
  Icon,
  onClick,
  expanded,
}: {
  label: string;
  Icon: LucideIcon;
  onClick?: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      disabled={!onClick}
      onClick={onClick}
      className="grid size-5 place-items-center rounded-sm text-[var(--text-rail)] opacity-80 transition-[opacity,background-color] duration-150 hover:bg-[var(--surface-raised)] hover:opacity-100 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon aria-hidden="true" size={12} strokeWidth={1.6} />
    </button>
  );
}

function RenameField({
  title,
  kind = "Concept",
  onRename,
  onDone,
}: {
  title: string;
  kind?: "Concept" | "Branch";
  onRename: (title: string) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <div
      className={`flex items-center rounded-sm bg-[var(--surface-active)] ${kind === "Branch" ? "h-5 gap-[3px] pl-[18px] pr-1" : "h-[22px] gap-1.5 px-[7px]"}`}
    >
      <span
        aria-hidden="true"
        className={kind === "Branch" ? "branch-dot" : "concept-icon"}
      />
      <TextField
        ref={inputRef}
        singleLine
        aria-label={`${kind} Name`}
        placeholder={`Untitled ${kind}`}
        className="min-w-0 flex-1 text-[10.5px] leading-none text-[var(--text-primary)]"
        value={title}
        onCommit={(value) => onRename(value.trim() || `Untitled ${kind}`)}
        onBlur={onDone}
      />
    </div>
  );
}

/** The workspace browser beside the rail, following the Figma Concepts panel. */
export default function ConceptPanel({
  workspaceTitle,
  concepts,
  trash,
  activeConceptId,
  activeBranchId,
  onSelect,
  onCreate,
  onImport,
  onExport,
  onCreateBranch,
  onRename,
  onRenameBranch,
  onDelete,
  onRestore,
  onDeleteForever,
  onClose,
}: ConceptPanelProps) {
  // Concepts start expanded; compacting collapses them all, and opening one
  // concept expands only that one.
  const [collapsed, setCollapsed] = useState<ReadonlySet<ConceptId>>(
    () => new Set(),
  );
  const allCollapsed = concepts.every(({ id }) => collapsed.has(id));
  const [trashOpen, setTrashOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<ConceptId | null>(null);
  const [renamingBranchId, setRenamingBranchId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  function expand(id: ConceptId) {
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function openConceptMenu(event: MouseEvent, id: ConceptId) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        { label: "Rename", onSelect: () => setRenamingId(id) },
        { label: "Export", onSelect: () => onExport(id) },
        { label: "Move to Trash", onSelect: () => onDelete(id) },
      ],
    });
  }

  function openTrashMenu(event: MouseEvent, id: ConceptId) {
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    // A click opens the menu under the item; a right-click at the pointer.
    setContextMenu({
      x: event.type === "click" ? bounds.left : event.clientX,
      y: event.type === "click" ? bounds.bottom : event.clientY,
      items: [
        { label: "Restore", onSelect: () => onRestore(id) },
        { label: "Delete Permanently", onSelect: () => onDeleteForever(id) },
      ],
    });
  }

  return (
    <section
      id="concepts-panel"
      aria-label="Concepts"
      className="hidden min-w-0 flex-1 flex-col md:flex"
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          items: [
            { label: "New Concept", onSelect: onCreate },
            {
              label: "Import Concept…",
              onSelect: () => importInput.current?.click(),
            },
          ],
        });
      }}
    >
      <div className="flex h-[45px] shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] pl-2.5">
        <HeaderButton
          label="New Branch From Main"
          Icon={FilePlusCorner}
          onClick={() => {
            onCreateBranch();
            expand(activeConceptId);
          }}
        />
        <HeaderButton
          label="New Concept"
          Icon={FolderPlus}
          onClick={onCreate}
        />
        <HeaderButton
          label={allCollapsed ? "Expand Concepts" : "Compact Concepts"}
          Icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp}
          expanded={!allCollapsed}
          onClick={() =>
            setCollapsed(
              allCollapsed ? new Set() : new Set(concepts.map(({ id }) => id)),
            )
          }
        />
        <HeaderButton
          label="Collapse Panel"
          Icon={ChevronLeft}
          onClick={onClose}
        />
      </div>

      <h2 className="eyebrow mt-[7px] mb-[7px] pl-2.5">{workspaceTitle}</h2>

      <ul className="flex flex-col px-[5px]">
        {concepts.map((concept) => {
          const active = concept.id === activeConceptId;
          const open = !collapsed.has(concept.id);

          return (
            <li key={concept.id} className="panel-row">
              {renamingId === concept.id ? (
                <RenameField
                  title={concept.title}
                  onRename={(title) => onRename(concept.id, title)}
                  onDone={() => setRenamingId(null)}
                />
              ) : (
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    onSelect(concept.id, concept.branches[0].id);
                    expand(concept.id);
                  }}
                  onContextMenu={(event) => openConceptMenu(event, concept.id)}
                  onDoubleClick={() => setRenamingId(concept.id)}
                  onKeyDown={(event) => {
                    if (event.key === "F2") {
                      event.preventDefault();
                      setRenamingId(concept.id);
                    }
                  }}
                  className={`flex h-[22px] w-full items-center gap-1.5 rounded-sm px-[7px] text-left text-[10.5px] leading-none transition-colors duration-150 ${
                    active
                      ? "bg-[var(--surface-active)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span aria-hidden="true" className="concept-icon" />
                  <span className="truncate">
                    {concept.title || "Untitled Concept"}
                  </span>
                </button>
              )}

              <div
                className="collapsible"
                data-open={open || undefined}
                inert={!open}
              >
                <ul aria-label="Branches">
                  {concept.branches.map((branch) => (
                    <li key={branch.id} className="panel-row relative">
                      <span aria-hidden="true" className="branch-line" />
                      {renamingBranchId === branch.id ? (
                        <RenameField
                          title={branch.title}
                          kind="Branch"
                          onRename={(title) =>
                            onRenameBranch(concept.id, branch.id, title)
                          }
                          onDone={() => setRenamingBranchId(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          aria-current={
                            active && branch.id === activeBranchId
                              ? "page"
                              : undefined
                          }
                          onClick={() => onSelect(concept.id, branch.id)}
                          onDoubleClick={() => setRenamingBranchId(branch.id)}
                          onKeyDown={(event) => {
                            if (event.key === "F2") {
                              event.preventDefault();
                              setRenamingBranchId(branch.id);
                            }
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              items: [
                                {
                                  label: "Rename",
                                  onSelect: () =>
                                    setRenamingBranchId(branch.id),
                                },
                              ],
                            });
                          }}
                          className={`flex h-5 w-full items-center gap-[3px] rounded-sm pl-[18px] pr-1 text-left text-[10px] leading-none transition-colors duration-150 hover:bg-[var(--surface-raised)] ${active && branch.id === activeBranchId ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
                        >
                          <span aria-hidden="true" className="branch-dot" />
                          <span className="truncate">{branch.title}</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>

      {trash.length > 0 && (
        <section aria-label="Trash" className="panel-row mt-auto pb-2">
          <button
            type="button"
            aria-expanded={trashOpen}
            onClick={() => setTrashOpen((open) => !open)}
            className="eyebrow mb-[5px] flex items-center gap-1 pl-2.5 transition-colors duration-150 hover:text-[var(--text-tertiary)]"
          >
            <ChevronRight
              aria-hidden="true"
              size={9}
              className={`transition-transform duration-200 ${trashOpen ? "rotate-90" : ""}`}
            />
            Trash
          </button>

          <div
            className="collapsible"
            data-open={trashOpen || undefined}
            inert={!trashOpen}
          >
            <ul className="flex flex-col px-[5px]">
              {trash.map((concept) => (
                <li key={concept.id} className="panel-row">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    onClick={(event) => openTrashMenu(event, concept.id)}
                    onContextMenu={(event) => openTrashMenu(event, concept.id)}
                    className="flex h-[22px] w-full items-center gap-1.5 rounded-sm px-[7px] text-left text-[10.5px] leading-none text-[var(--text-tertiary)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]"
                  >
                    <span aria-hidden="true" className="concept-icon" />
                    <span className="truncate">
                      {concept.title || "Untitled Concept"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const [file] = event.target.files ?? [];
          // Cleared so choosing the same file again still imports it.
          event.target.value = "";

          if (file) {
            onImport(file);
          }
        }}
      />

      {contextMenu && (
        <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </section>
  );
}
