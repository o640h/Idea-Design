"use client";

import { Check, ChevronDown, Flag, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Revision } from "@/lib/concepts/database";
import Menu, { MenuDivider, MenuHeading } from "./menu";
import type { SaveStatus, SessionBranch } from "./sync";

interface BranchMenuProps {
  branches: SessionBranch[];
  activeBranch: SessionBranch;
  /** The open branch's checkpoints, newest first. */
  checkpoints: Revision[];
  onSelectBranch: (branchId: string) => void;
  onNewBranch: () => void;
  onSaveCheckpoint: () => void;
  onBranchFromCheckpoint: (revision: Revision) => void;
}

interface EditorHeaderProps extends BranchMenuProps {
  workspaceTitle: string;
  conceptTitle: string;
  /** The breadcrumb lines up with the canvas beside the Concepts panel. */
  panelOpen: boolean;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
}

/** The logo and breadcrumb, whose last segment switches branches. */
export default function EditorHeader({
  workspaceTitle,
  conceptTitle,
  panelOpen,
  saveStatus,
  onRetrySave,
  ...branchMenu
}: EditorHeaderProps) {
  return (
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
        {workspaceTitle}
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span>{conceptTitle || "Untitled Concept"}</span>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <BranchMenu {...branchMenu} />
        <SaveIndicator status={saveStatus} onRetry={onRetrySave} />
      </nav>
    </header>
  );
}

function BranchMenu({
  branches,
  activeBranch,
  checkpoints,
  onSelectBranch,
  onNewBranch,
  onSaveCheckpoint,
  onBranchFromCheckpoint,
}: BranchMenuProps) {
  const archived = branches.filter(({ archivedAt }) => archivedAt);

  return (
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
        const act = (action: () => void) => () => {
          action();
          close();
        };
        const branchItem = (branch: SessionBranch) => (
          <button
            key={branch.id}
            type="button"
            aria-pressed={branch.id === activeBranch.id}
            className="menu-item min-w-44 justify-between"
            onClick={act(() => onSelectBranch(branch.id))}
          >
            <span className="truncate">{branch.title}</span>
            {branch.id === activeBranch.id && (
              <Check aria-hidden="true" size={10} />
            )}
          </button>
        );

        return (
          <>
            {branches.filter(({ archivedAt }) => !archivedAt).map(branchItem)}
            <MenuDivider />
            <button
              type="button"
              className="menu-item"
              onClick={act(onNewBranch)}
            >
              <Plus aria-hidden="true" size={10} />
              New Branch
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={act(onSaveCheckpoint)}
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
                    onClick={act(() => onBranchFromCheckpoint(revision))}
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
