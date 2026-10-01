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
  onDeleteBranch: (conceptId: ConceptId, branchId: string) => void;
  onDelete: (id: ConceptId) => void;
  onRestore: (id: ConceptId) => void;
  onDeleteForever: (id: ConceptId) => void;
  onClose: () => void;
}

function HeaderButton({
  label,
  Icon,
  iconSize = 14,
  onClick,
  expanded,
}: {
  label: string;
  Icon: LucideIcon;
  /** Chevrons draw less ink than file icons, so they are sized up to match. */
  iconSize?: number;
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
      className="grid h-8 w-10 place-items-center rounded-md text-[var(--text-rail)] transition-colors duration-150 hover:bg-[var(--surface-raised)] disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon aria-hidden="true" size={iconSize} strokeWidth={1.5} />
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
      className={`flex items-center rounded-sm bg-[var(--surface-active)] ${kind === "Branch" ? "h-6 gap-1.5 pl-[22px] pr-1" : "h-7 gap-2 px-2"}`}
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
        className="min-w-0 flex-1 text-ui leading-none text-[var(--text-primary)]"
        value={title}
        onCommit={(value) => onRename(value.trim() || `Untitled ${kind}`)}
        onBlur={onDone}
      />
    </div>
  );
}

/**
 * A concept's square and name. The square rests on the name's baseline rather
 * than being centred in the row, so it stays level with the capitals at any
 * zoom; the font's metrics leave the text off-centre in its line box.
 */
function ConceptLabel({ title }: { title: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span aria-hidden="true" className="concept-icon" />
      <span className="truncate">{title || "Untitled Concept"}</span>
    </span>
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
  onDeleteBranch,
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
        { label: "Delete", onSelect: () => onDelete(id) },
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
      {/* Lines up with the rail: the icons match its first button (10px
          down, 32px tall) and the divider falls in the gap below it. Equal
          side padding keeps the evenly spaced icons centred. */}
      <div className="flex h-11 shrink-0 items-start justify-between border-b border-[var(--border-subtle)] px-[9px] pt-2.5">
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
          iconSize={16}
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
          iconSize={16}
          onClick={onClose}
        />
      </div>

      <h2 className="eyebrow mt-[7px] mb-[7px] pl-[13px]">{workspaceTitle}</h2>

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
                  className={`flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-ui leading-none transition-colors duration-150 ${
                    active
                      ? "bg-[var(--surface-active)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <ConceptLabel title={concept.title} />
                </button>
              )}

              <div
                className="collapsible"
                data-open={open || undefined}
                inert={!open}
              >
                <ul aria-label="Branches">
                  {concept.branches.map((branch, index) => (
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
                                // Main is the concept itself; deleting the
                                // concept removes it.
                                ...(index > 0
                                  ? [
                                      {
                                        label: "Delete",
                                        onSelect: () =>
                                          onDeleteBranch(concept.id, branch.id),
                                      },
                                    ]
                                  : []),
                              ],
                            });
                          }}
                          className={`flex h-6 w-full items-center gap-1.5 rounded-md pl-[22px] pr-1 text-left text-ui leading-none transition-colors duration-150 hover:bg-[var(--surface-raised)] ${active && branch.id === activeBranchId ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
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
        <section
          aria-label="Recently Deleted"
          className="panel-row mt-auto pb-2"
        >
          <div className="px-[5px]">
            {/* The chevron sits in the square's column and the words line up
                with the concept names. */}
            <button
              type="button"
              aria-expanded={trashOpen}
              onClick={() => setTrashOpen((open) => !open)}
              className="flex h-7 w-full items-center gap-[7px] rounded-md px-2 text-left text-ui font-medium text-[var(--text-tertiary)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]"
            >
              <ChevronRight
                aria-hidden="true"
                size={10}
                strokeWidth={2}
                className={`shrink-0 transition-transform duration-200 ${trashOpen ? "rotate-90" : ""}`}
              />
              Recently Deleted
            </button>
          </div>

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
                    className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-ui leading-none text-[var(--text-tertiary)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]"
                  >
                    <ConceptLabel title={concept.title} />
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
