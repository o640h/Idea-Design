"use client";

import {
  ChevronLeft,
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
  activeConceptId: ConceptId;
  activeBranchId: string;
  onSelect: (id: ConceptId, branchId: string) => void;
  onCreate: () => void;
  onCreateBranch: () => void;
  onRename: (id: ConceptId, title: string) => void;
  onRenameBranch: (
    conceptId: ConceptId,
    branchId: string,
    title: string,
  ) => void;
  onDelete: (id: ConceptId) => void;
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
      className="grid size-5 place-items-center rounded-sm text-[var(--text-rail)] opacity-80 transition-opacity hover:opacity-100 disabled:opacity-40"
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
  activeConceptId,
  activeBranchId,
  onSelect,
  onCreate,
  onCreateBranch,
  onRename,
  onRenameBranch,
  onDelete,
  onClose,
}: ConceptPanelProps) {
  const [branchesOpen, setBranchesOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<ConceptId | null>(null);
  const [renamingBranchId, setRenamingBranchId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  function openConceptMenu(event: MouseEvent, id: ConceptId) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        { label: "Rename", onSelect: () => setRenamingId(id) },
        { label: "Delete", onSelect: () => onDelete(id) },
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
          items: [{ label: "New Concept", onSelect: onCreate }],
        });
      }}
    >
      <div className="flex h-[45px] shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] pl-2.5">
        <HeaderButton
          label="New Branch From Main"
          Icon={FilePlusCorner}
          onClick={() => {
            onCreateBranch();
            setBranchesOpen(true);
          }}
        />
        <HeaderButton
          label="New Concept"
          Icon={FolderPlus}
          onClick={onCreate}
        />
        <HeaderButton
          label={branchesOpen ? "Compact Concepts" : "Expand Concepts"}
          Icon={branchesOpen ? ChevronsDownUp : ChevronsUpDown}
          expanded={branchesOpen}
          onClick={() => setBranchesOpen((open) => !open)}
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

          return (
            <li key={concept.id}>
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
                    setBranchesOpen(true);
                  }}
                  onContextMenu={(event) => openConceptMenu(event, concept.id)}
                  onDoubleClick={() => setRenamingId(concept.id)}
                  onKeyDown={(event) => {
                    if (event.key === "F2") {
                      event.preventDefault();
                      setRenamingId(concept.id);
                    }
                  }}
                  className={`flex h-[22px] w-full items-center gap-1.5 rounded-sm px-[7px] text-left text-[10.5px] leading-none transition-colors ${
                    active
                      ? "bg-[var(--surface-active)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span aria-hidden="true" className="concept-icon" />
                  <span className="truncate">
                    {concept.title || "Untitled Concept"}
                  </span>
                </button>
              )}

              {branchesOpen && (
                <ul aria-label="Branches">
                  {concept.branches.map((branch) => (
                    <li key={branch.id} className="relative">
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
                          className={`flex h-5 w-full items-center gap-[3px] rounded-sm pl-[18px] pr-1 text-left text-[10px] leading-none hover:bg-[var(--surface-active)] ${active && branch.id === activeBranchId ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}
                        >
                          <span aria-hidden="true" className="branch-dot" />
                          <span className="truncate">{branch.title}</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {contextMenu && (
        <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </section>
  );
}
