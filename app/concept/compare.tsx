"use client";

import { Check, ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { revisionDocument } from "@/lib/concepts/database";
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
import { createClient } from "@/lib/supabase/client";
import { historyShortcut, isTyping } from "./keyboard";
import Menu from "./menu";
import { type ConceptSession, parentBranch } from "./session";
import { ToolbarButton, UndoRedo } from "./toolbar";

interface CompareOption {
  /** A branch ID, or the source revision for where the branch started. */
  id: string;
  title: string;
  note?: string;
}

/**
 * What Compare shows on the left: another branch, or where the open branch
 * started. It is the branch's parent until something else is chosen.
 */
export function useCompareReference(session: ConceptSession, open: boolean) {
  const { activeConcept, activeBranch } = session;
  const [chosenId, setChosenId] = useState<string | null>(null);
  /** Documents at source revisions, which never change once saved. */
  const [startDocuments, setStartDocuments] = useState<
    Record<string, EditableConcept | "failed">
  >({});
  const parent = parentBranch(activeConcept, activeBranch);
  const options: CompareOption[] = [
    ...(activeBranch.sourceRevisionId
      ? [
          {
            id: activeBranch.sourceRevisionId,
            title: "Where It Started",
            note: parent && `In ${parent.title}`,
          },
        ]
      : []),
    ...activeConcept.branches
      .filter(({ id, archivedAt }) => id !== activeBranch.id && !archivedAt)
      .map(({ id, title }) => ({
        id,
        title,
        note: id === parent?.id ? "Parent" : undefined,
      })),
  ];
  const id =
    options.find((option) => option.id === chosenId)?.id ??
    parent?.id ??
    options[0]?.id ??
    null;
  const branch = activeConcept.branches.find(
    (candidate) => candidate.id === id,
  );
  const reference = branch
    ? (branch.editor?.present ?? null)
    : id
      ? (startDocuments[id] ?? null)
      : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: loading depends only on what is compared; load and sync read the latest state themselves
  useEffect(() => {
    if (!open || !id || reference) {
      return;
    }

    if (branch) {
      void session.load(activeConcept, id);
      return;
    }

    void (async () => {
      try {
        // A new branch's source revision may still be on its way. Sending
        // flushes React updates, which cannot happen during an effect.
        await new Promise((resolve) => window.setTimeout(resolve));
        await session.sync.flush();
        const document = await revisionDocument(
          createClient(),
          id,
          session.owner(activeConcept.id),
        );
        setStartDocuments((current) => ({ ...current, [id]: document }));
      } catch (error) {
        console.warn("Could not load where the branch started", error);
        setStartDocuments((current) => ({ ...current, [id]: "failed" }));
      }
    })();
  }, [open, id, reference]);

  return {
    options,
    id,
    /** Null while it loads; "failed" if it could not be loaded. */
    reference,
    choose: setChosenId,
    retry: () =>
      setStartDocuments(({ [id ?? ""]: _failed, ...loaded }) => loaded),
  };
}

type ComponentDifference = Difference<ConceptComponent, ComponentField>;
type UnchangedComponent = Extract<ComponentDifference, { status: "unchanged" }>;
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

/** Rows of differences, in this order, under each heading. */
const DIFFERING = ["changed", "added", "removed"] as const;

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

/** A side of a row. The current branch's side is marked when it differs. */
function Card({
  eyebrow,
  label,
  current,
  children,
}: {
  eyebrow: string;
  label?: string | null;
  current?: boolean;
  children: ReactNode;
}) {
  const marked = current && label;

  return (
    <div className={`compare-card${marked ? " is-changed" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow flex items-center gap-1.5">
          {marked && <span aria-hidden="true" className="compare-dot" />}
          {eyebrow}
        </p>
        {label && <p className="compare-label">{label}</p>}
      </div>
      {children}
    </div>
  );
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
    <Card eyebrow={component.tag ?? "Untagged"} label={label} current={current}>
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
    </Card>
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
    <Card
      eyebrow={relationship.type ?? "Connection"}
      label={label}
      current={current}
    >
      <p className="mt-1 text-[13px] leading-[1.35] text-(--text-primary)">
        {title(relationship.sourceComponentId)}
        <span className="px-1.5 text-(--text-tertiary)">→</span>
        {title(relationship.targetComponentId)}
      </p>
    </Card>
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

/** The rows for a loaded comparison, with unchanged content folded. */
function Differences({
  comparison: { components, relationships },
  reference,
  referenceTitle,
  current,
  currentTitle,
  dispatch,
}: {
  comparison: ReturnType<typeof compareConcepts>;
  reference: EditableConcept;
  referenceTitle: string;
  current: EditableConcept;
  currentTitle: string;
  dispatch: EditorDispatch;
}) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const unchanged = components.filter(
    (difference): difference is UnchangedComponent =>
      difference.status === "unchanged",
  );
  const unchangedConnections = relationships.filter(
    ({ status }) => status === "unchanged",
  ).length;
  const changedConnections = relationships.length - unchangedConnections;
  const tagCounts = new Map<string, number>();

  for (const { after } of unchanged) {
    const tag = after.tag ?? "untagged";
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const takeButton = (id: string) => (
    <button
      type="button"
      className="compare-take"
      title={`Copy this version into ${currentTitle}`}
      onClick={() =>
        dispatch({
          type: "change",
          operations: takeVersion(reference, current, id),
        })
      }
    >
      Take This Version
    </button>
  );

  function componentRow(difference: ComponentDifference) {
    const label = changeLabel(difference);

    return (
      <Row
        key={difference.id}
        status={difference.status}
        left={
          difference.status === "added" ? (
            <AbsentCard tag={difference.after.tag} branch={referenceTitle} />
          ) : (
            <ComponentCard component={difference.before} document={reference}>
              {difference.status !== "unchanged" && takeButton(difference.id)}
            </ComponentCard>
          )
        }
        right={
          difference.status === "removed" ? (
            <AbsentCard tag={difference.before.tag} branch={currentTitle} />
          ) : (
            <ComponentCard
              component={difference.after}
              document={current}
              label={label}
              current
            />
          )
        }
      />
    );
  }

  function connectionRow(difference: RelationshipDifference) {
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
              document={reference}
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
              label={changeLabel(difference)}
              current
            />
          )
        }
      />
    );
  }

  return (
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

      {unchanged.length === components.length && changedConnections === 0 ? (
        <p className="mt-10 text-center text-ui text-(--text-tertiary)">
          {currentTitle} matches {referenceTitle}.
        </p>
      ) : (
        <>
          <ul aria-label="Changed Components" className="compare-list">
            {DIFFERING.flatMap((status) =>
              components
                .filter((difference) => difference.status === status)
                .map(componentRow),
            )}
          </ul>
          {changedConnections > 0 && (
            <>
              <h2 className="eyebrow mt-8 mb-2">Connections</h2>
              <ul aria-label="Changed Connections" className="compare-list">
                {DIFFERING.flatMap((status) =>
                  relationships
                    .filter((difference) => difference.status === status)
                    .map(connectionRow),
                )}
              </ul>
            </>
          )}
        </>
      )}
    </>
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
  compare,
  canUndo,
  canRedo,
  dispatch,
  onClose,
}: {
  currentTitle: string;
  current: EditableConcept;
  compare: ReturnType<typeof useCompareReference>;
  canUndo: boolean;
  canRedo: boolean;
  dispatch: EditorDispatch;
  onClose: () => void;
}) {
  const { options, id, reference, choose, retry } = compare;
  const referenceTitle = options.find((option) => option.id === id)?.title;
  const loaded = reference && reference !== "failed" ? reference : null;
  const comparison = useMemo(
    () => loaded && compareConcepts(loaded, current),
    [loaded, current],
  );
  const differences = comparison
    ? [...comparison.components, ...comparison.relationships]
    : [];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      const history = historyShortcut(event);

      if (history) {
        event.preventDefault();
        dispatch(history);
      } else if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, onClose]);

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
                {referenceTitle && (
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
                          aria-pressed={option.id === id}
                          className="menu-item min-w-52 justify-between gap-4"
                          onClick={() => {
                            choose(option.id);
                            close();
                          }}
                        >
                          <span className="truncate">{option.title}</span>
                          {option.id === id ? (
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
                {[...DIFFERING, "unchanged"].map((status) => (
                  <li key={status} className="compare-count">
                    {
                      differences.filter(
                        (difference) => difference.status === status,
                      ).length
                    }{" "}
                    {status}
                  </li>
                ))}
              </ul>
            )}
          </header>

          {!referenceTitle ? (
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
                onClick={retry}
              >
                Try Again
              </button>
            </p>
          ) : !loaded || !comparison ? (
            <p className="mt-16 text-center text-ui text-(--text-tertiary)">
              Loading “{referenceTitle}”…
            </p>
          ) : (
            <Differences
              comparison={comparison}
              reference={loaded}
              referenceTitle={referenceTitle}
              current={current}
              currentTitle={currentTitle}
              dispatch={dispatch}
            />
          )}
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="Compare Tools"
        className="absolute bottom-8.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 border-b border-(--border-underline) bg-(--surface-canvas) px-1 pb-2"
      >
        <UndoRedo canUndo={canUndo} canRedo={canRedo} dispatch={dispatch} />
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
