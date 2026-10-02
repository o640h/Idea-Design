"use client";

import { Check, ChevronDown, Redo, Undo } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type ComponentField,
  compareConcepts,
  type Difference,
  type RelationshipField,
  takeVersion,
} from "@/lib/concepts/diff";
import type { EditorDispatch } from "@/lib/concepts/editor";
import type {
  ConceptComponent,
  ConceptRelationship,
  EditableConcept,
} from "@/lib/concepts/model";
import Menu from "./menu";
import { ToolbarButton } from "./toolbar";

export interface CompareOption {
  /** A branch ID, or the source revision for where the branch started. */
  id: string;
  title: string;
  note?: string;
}

type ComponentDifference = Difference<ConceptComponent, ComponentField>;
type RelationshipDifference = Difference<
  ConceptRelationship,
  RelationshipField
>;

const FIELD_NAMES: Record<ComponentField | RelationshipField, string> = {
  title: "Title",
  description: "Description",
  tag: "Tag",
  parentId: "Moved",
  type: "Label",
  sourceComponentId: "Reconnected",
  targetComponentId: "Reconnected",
};

const SYMBOLS = { changed: "~", added: "+", removed: "−" } as const;

function changeLabel(difference: ComponentDifference | RelationshipDifference) {
  if (difference.status !== "changed") {
    return difference.status === "unchanged" ? null : difference.status;
  }

  const names = new Set(difference.fields.map((field) => FIELD_NAMES[field]));
  const verbs = ["Moved", "Reconnected"].filter((verb) => names.has(verb));
  const fields = [...names].filter((name) => !verbs.includes(name));

  return [fields.length ? `${fields.join(" · ")} changed` : null, ...verbs]
    .filter(Boolean)
    .join(" · ");
}

function pluralise(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function ComponentCard({
  component,
  document,
  label,
  current,
  children,
}: {
  component: ConceptComponent;
  /** The concept the component is in, for naming its parent. */
  document: EditableConcept;
  label?: string | null;
  current?: boolean;
  children?: ReactNode;
}) {
  const parent =
    component.parentId &&
    document.concept.components.find(({ id }) => id === component.parentId);

  return (
    <div className={`compare-card${current && label ? " is-changed" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow flex items-center gap-1.5">
          {current && label && (
            <span aria-hidden="true" className="compare-dot" />
          )}
          {component.tag ?? "Untagged"}
        </p>
        {label && <p className="compare-label">{label}</p>}
      </div>
      <p className="mt-1 text-[13px] leading-[1.35] text-(--text-primary)">
        {component.title || "Untitled"}
      </p>
      {component.description && (
        <p className="mt-1 text-small leading-4 whitespace-pre-wrap text-(--text-secondary)">
          {component.description}
        </p>
      )}
      {parent && (
        <p className="mt-1 text-small text-(--text-tertiary)">
          Under “{parent.title || "Untitled"}”
        </p>
      )}
      {children}
    </div>
  );
}

function AbsentCard({ tag, branch }: { tag?: string | null; branch: string }) {
  return (
    <div className="compare-card is-absent">
      <p className="eyebrow">{tag ?? "Untagged"}</p>
      <p className="mt-1 text-small text-(--text-tertiary)">Not in {branch}</p>
    </div>
  );
}

function ConnectionCard({
  relationship,
  document,
  label,
  current,
}: {
  relationship: ConceptRelationship;
  document: EditableConcept;
  label?: string | null;
  current?: boolean;
}) {
  const title = (id: string) => {
    const component = document.concept.components.find((c) => c.id === id);
    return component ? component.title || "Untitled" : "Removed Component";
  };

  return (
    <div className={`compare-card${current && label ? " is-changed" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow flex items-center gap-1.5">
          {current && label && (
            <span aria-hidden="true" className="compare-dot" />
          )}
          {relationship.type ?? "Connection"}
        </p>
        {label && <p className="compare-label">{label}</p>}
      </div>
      <p className="mt-1 text-[13px] leading-[1.35] text-(--text-primary)">
        {title(relationship.sourceComponentId)}
        <span className="px-1.5 text-(--text-tertiary)">→</span>
        {title(relationship.targetComponentId)}
      </p>
    </div>
  );
}

function Row({
  status,
  left,
  right,
}: {
  status: keyof typeof SYMBOLS | "unchanged";
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <li className="compare-row">
      {left}
      {/* The cards say the same in words. */}
      <span aria-hidden="true" className="compare-symbol">
        {status === "unchanged" ? "" : SYMBOLS[status]}
      </span>
      {right}
    </li>
  );
}

/**
 * The current branch side by side with another branch, or with where it
 * started, matched by component and connection ID. Differences describe the
 * current branch, on the right, relative to the left.
 */
export default function CompareView({
  currentTitle,
  current,
  options,
  referenceId,
  reference,
  onReferenceChange,
  onRetry,
  canUndo,
  canRedo,
  dispatch,
  onClose,
}: {
  currentTitle: string;
  current: EditableConcept;
  options: CompareOption[];
  referenceId: string | null;
  /** Null while it loads; "failed" if it could not be loaded. */
  reference: EditableConcept | "failed" | null;
  onReferenceChange: (id: string) => void;
  onRetry: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dispatch: EditorDispatch;
  onClose: () => void;
}) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const selected = options.find(({ id }) => id === referenceId);
  const referenceDocument =
    reference && reference !== "failed" ? reference : null;
  const comparison = useMemo(
    () =>
      referenceDocument ? compareConcepts(referenceDocument, current) : null,
    [referenceDocument, current],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;

      if (target?.closest("input, textarea, select, [contenteditable]")) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && (key === "z" || key === "y")) {
        event.preventDefault();
        dispatch({
          type: key === "y" || event.shiftKey ? "history/redo" : "history/undo",
        });
      } else if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, onClose]);

  const byStatus = <T extends { status: string }>(items: T[], status: string) =>
    items.filter((item) => item.status === status);
  const components = comparison?.components ?? [];
  const relationships = comparison?.relationships ?? [];
  const differing = [...components, ...relationships].filter(
    ({ status }) => status !== "unchanged",
  );
  const unchanged = byStatus(components, "unchanged");
  const unchangedConnections = byStatus(relationships, "unchanged").length;
  const counts = ["changed", "added", "removed", "unchanged"].map(
    (status) =>
      [
        status,
        byStatus([...components, ...relationships], status).length,
      ] as const,
  );
  const tagCounts = new Map<string, number>();

  for (const difference of unchanged) {
    if (difference.status === "unchanged") {
      const tag = difference.after.tag ?? "untagged";
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const referenceTitle = selected?.title ?? "";

  function take(id: string) {
    if (referenceDocument) {
      dispatch({
        type: "change",
        operations: takeVersion(referenceDocument, current, id),
      });
    }
  }

  const takeButton = (id: string) => (
    <button
      type="button"
      className="compare-take"
      title={`Copy this version into ${currentTitle}`}
      onClick={() => take(id)}
    >
      Take This Version
    </button>
  );

  function componentRow(difference: ComponentDifference) {
    const label = changeLabel(difference);

    switch (difference.status) {
      case "added":
        return (
          <Row
            key={difference.id}
            status="added"
            left={
              <AbsentCard tag={difference.after.tag} branch={referenceTitle} />
            }
            right={
              <ComponentCard
                component={difference.after}
                document={current}
                label={label}
                current
              />
            }
          />
        );

      case "removed":
        return (
          <Row
            key={difference.id}
            status="removed"
            left={
              <ComponentCard
                component={difference.before}
                document={referenceDocument ?? current}
              >
                {takeButton(difference.id)}
              </ComponentCard>
            }
            right={
              <AbsentCard tag={difference.before.tag} branch={currentTitle} />
            }
          />
        );

      default:
        return (
          <Row
            key={difference.id}
            status={difference.status}
            left={
              <ComponentCard
                component={difference.before}
                document={referenceDocument ?? current}
              >
                {difference.status === "changed" && takeButton(difference.id)}
              </ComponentCard>
            }
            right={
              <ComponentCard
                component={difference.after}
                document={current}
                label={label}
                current
              />
            }
          />
        );
    }
  }

  function connectionRow(difference: RelationshipDifference) {
    const label = changeLabel(difference);
    const document = referenceDocument ?? current;

    return (
      <Row
        key={difference.id}
        status={difference.status}
        left={
          difference.status === "added" ? (
            <AbsentCard tag="Connection" branch={referenceTitle} />
          ) : (
            <ConnectionCard
              relationship={difference.before}
              document={document}
            />
          )
        }
        right={
          difference.status === "removed" ? (
            <AbsentCard tag="Connection" branch={currentTitle} />
          ) : (
            <ConnectionCard
              relationship={difference.after}
              document={current}
              label={label}
              current
            />
          )
        }
      />
    );
  }

  return (
    <div className="compare-view relative h-full">
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-280 px-10 pt-6 pb-32">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-base leading-5.5 font-medium text-(--text-primary)">
                Compare
              </h1>
              <div className="mt-3 flex items-center gap-2 text-ui">
                {options.length > 0 && (
                  <Menu
                    label={`Compare With, ${referenceTitle}`}
                    trigger={
                      <>
                        <span
                          aria-hidden="true"
                          className="compare-dot is-muted"
                        />
                        {referenceTitle}
                        <ChevronDown aria-hidden="true" size={10} />
                      </>
                    }
                    triggerClassName="compare-branch"
                  >
                    {(close) =>
                      options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={option.id === referenceId}
                          className="menu-item min-w-52 justify-between gap-4"
                          onClick={() => {
                            onReferenceChange(option.id);
                            close();
                          }}
                        >
                          <span className="truncate">{option.title}</span>
                          {option.id === referenceId ? (
                            <Check aria-hidden="true" size={10} />
                          ) : (
                            option.note && (
                              <span className="font-normal text-(--text-tertiary)">
                                {option.note}
                              </span>
                            )
                          )}
                        </button>
                      ))
                    }
                  </Menu>
                )}
                <span className="text-small text-(--text-tertiary)">vs</span>
                <span className="compare-branch is-current">
                  <span aria-hidden="true" className="compare-dot" />
                  {currentTitle}
                </span>
              </div>
            </div>
            {comparison && (
              <ul aria-label="Summary" className="flex gap-1.5">
                {counts.map(([status, count]) => (
                  <li key={status} className="compare-count">
                    {count} {status}
                  </li>
                ))}
              </ul>
            )}
          </header>

          {options.length === 0 ? (
            <p className="mt-16 text-center text-ui text-(--text-tertiary)">
              Nothing to compare yet. Make a branch, then compare it with{" "}
              {currentTitle}.
            </p>
          ) : reference === "failed" ? (
            <p className="mt-16 text-center text-ui text-(--text-tertiary)">
              “{referenceTitle}” couldn’t be loaded. Check your connection.{" "}
              <button
                type="button"
                className="text-(--text-secondary) underline-offset-2 hover:text-(--text-primary) hover:underline"
                onClick={onRetry}
              >
                Try Again
              </button>
            </p>
          ) : !comparison ? (
            <p className="mt-16 text-center text-ui text-(--text-tertiary)">
              Loading “{referenceTitle}”…
            </p>
          ) : (
            <>
              <div className="compare-row mt-8 mb-2">
                <p className="eyebrow truncate">{referenceTitle}</p>
                <span />
                <p className="eyebrow truncate">{currentTitle}</p>
              </div>

              {unchanged.length + unchangedConnections > 0 && (
                <div className="compare-fold">
                  <p className="min-w-0 truncate">
                    {pluralise(unchanged.length, "unchanged component")}
                    {tagCounts.size > 0 && (
                      <span className="text-(--text-tertiary)">
                        {"  ·  "}
                        {[...tagCounts]
                          .map(([tag, count]) =>
                            tag === "untagged"
                              ? `${count} untagged`
                              : pluralise(count, tag),
                          )
                          .join(", ")}
                      </span>
                    )}
                    {unchangedConnections > 0 && (
                      <span className="text-(--text-tertiary)">
                        {"  ·  "}
                        {pluralise(unchangedConnections, "connection")}
                      </span>
                    )}
                  </p>
                  {unchanged.length > 0 && (
                    <button
                      type="button"
                      aria-expanded={showUnchanged}
                      className="shrink-0 text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                      onClick={() => setShowUnchanged((shown) => !shown)}
                    >
                      {showUnchanged ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
              )}

              {showUnchanged && (
                <ul
                  aria-label="Unchanged Components"
                  className="compare-list is-unchanged"
                >
                  {unchanged.map(componentRow)}
                </ul>
              )}

              {differing.length === 0 ? (
                <p className="mt-10 text-center text-ui text-(--text-tertiary)">
                  {currentTitle} matches {referenceTitle}.
                </p>
              ) : (
                <>
                  <ul aria-label="Changed Components" className="compare-list">
                    {(["changed", "added", "removed"] as const).flatMap(
                      (status) =>
                        byStatus(components, status).map(componentRow),
                    )}
                  </ul>
                  {relationships.some(
                    ({ status }) => status !== "unchanged",
                  ) && (
                    <>
                      <h2 className="eyebrow mt-8 mb-2">Connections</h2>
                      <ul
                        aria-label="Changed Connections"
                        className="compare-list"
                      >
                        {(["changed", "added", "removed"] as const).flatMap(
                          (status) =>
                            byStatus(relationships, status).map(connectionRow),
                        )}
                      </ul>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="Compare Tools"
        className="absolute bottom-8.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 border-b border-(--border-underline) bg-(--surface-canvas) px-1 pb-2"
      >
        <ToolbarButton
          label="Undo"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "history/undo" })}
        >
          <Undo aria-hidden="true" size={16} strokeWidth={1.25} />
        </ToolbarButton>
        <span aria-hidden="true" className="menu-divider" />
        <ToolbarButton
          label="Redo"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "history/redo" })}
        >
          <Redo aria-hidden="true" size={16} strokeWidth={1.25} />
        </ToolbarButton>
        <span aria-hidden="true" className="menu-divider" />
        <ToolbarButton
          label="Back to Canvas"
          hint="Back to Canvas (Esc)"
          onClick={onClose}
        >
          Canvas
        </ToolbarButton>
      </div>
    </div>
  );
}
