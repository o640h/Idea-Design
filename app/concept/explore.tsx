"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { hasDifferences } from "@/lib/concepts/diff";
import {
  type ComponentId,
  type ConceptComponent,
  type ConceptId,
  createComponent,
  createComponentLayout,
  type EditableConcept,
} from "@/lib/concepts/model";
import type { Operation } from "@/lib/concepts/operations";
import type { CanvasExploration } from "./canvas";
import Menu from "./menu";
import Notice from "./notice";
import type { ConceptSession } from "./session";

export type ExploreTool = "substitute" | "constrain" | "remove";

export const EXPLORE_TOOLS: {
  tool: ExploreTool;
  label: string;
  hint: string;
}[] = [
  {
    tool: "substitute",
    label: "Substitute",
    hint: "Branch with something else in its place",
  },
  {
    tool: "constrain",
    label: "Constrain",
    hint: "Branch with a constraint on it",
  },
  { tool: "remove", label: "Remove", hint: "Branch without it" },
];

/** Exploring alternatives to one component, each in a branch of its own. */
interface Exploration {
  conceptId: ConceptId;
  originBranchId: string;
  componentId: ComponentId;
  /** Branches made while exploring, with the concept each started from. */
  branches: {
    id: string;
    base: EditableConcept;
    /** Connected components someone looked at and left as they are. */
    reviewed: ComponentId[];
    /** The component whose title names the branch while exploring. */
    namedBy: ComponentId | null;
    /** The name last given automatically; renaming the branch keeps yours. */
    autoTitle: string;
  }[];
}

/** Short enough to fit the panel and the chip, cut at a word. */
function fitName(text: string, length = 24) {
  const name = text.trim().replace(/\s+/g, " ") || "Untitled";

  if (name.length <= length) {
    return name;
  }

  const cut = name.slice(0, length - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > length / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Beside the component, moved down past anything already there. */
function constraintPosition(document: EditableConcept, id: ComponentId) {
  const layout = document.componentLayouts.find(
    ({ componentId }) => componentId === id,
  );
  const position = {
    x: (layout?.x ?? 0) + (layout?.width ?? 260) + 80,
    y: layout?.y ?? 0,
  };

  while (
    document.componentLayouts.some(
      ({ x, y }) =>
        Math.abs(x - position.x) < 240 && Math.abs(y - position.y) < 100,
    )
  ) {
    position.y += 60;
  }

  return position;
}

/**
 * The branch a tool makes, and which component to start editing in it. A
 * substitute or constraint names the branch once it is written.
 */
function toolBranch(
  tool: ExploreTool,
  document: EditableConcept,
  component: ConceptComponent,
): { title: string; operations: Operation[]; editId: ComponentId | null } {
  switch (tool) {
    case "substitute":
      return { title: "Substitute", operations: [], editId: component.id };

    case "remove":
      return {
        title: `Without ${fitName(component.title, 16)}`,
        operations: [{ type: "component/delete", id: component.id }],
        editId: null,
      };

    case "constrain": {
      const id = crypto.randomUUID();

      return {
        title: "Constraint",
        operations: [
          {
            type: "component/create",
            component: { ...createComponent(id), tag: "constraint" },
            layout: createComponentLayout(
              id,
              constraintPosition(document, component.id),
            ),
          },
          {
            type: "relationship/link",
            relationship: {
              id: crypto.randomUUID(),
              sourceComponentId: id,
              targetComponentId: component.id,
              type: "constrains",
            },
          },
        ],
        editId: id,
      };
    }
  }
}

function ExploreChip({
  componentTitle,
  origin,
  branches,
  activeBranchId,
  onSelect,
  onDiscard,
  onDone,
}: {
  componentTitle: string;
  origin: { id: string; title: string };
  branches: { id: string; title: string }[];
  activeBranchId: string;
  onSelect: (branchId: string) => void;
  onDiscard: () => void;
  onDone: () => void;
}) {
  const count = `${branches.length} ${branches.length === 1 ? "Branch" : "Branches"}`;
  const branchItem = (
    branch: { id: string; title: string },
    close: () => void,
    note?: string,
  ) => (
    <button
      key={branch.id}
      type="button"
      aria-pressed={branch.id === activeBranchId}
      className="menu-item min-w-48 justify-between gap-4"
      onClick={() => {
        onSelect(branch.id);
        close();
      }}
    >
      <span className="truncate">{branch.title}</span>
      {branch.id === activeBranchId ? (
        <Check aria-hidden="true" size={10} />
      ) : (
        note && (
          <span className="font-normal text-(--text-tertiary)">{note}</span>
        )
      )}
    </button>
  );

  return (
    <section aria-label="Exploring" className="explore-chip">
      <p className="truncate" title={componentTitle || undefined}>
        <span className="text-(--text-tertiary)">Exploring </span>“
        {fitName(componentTitle)}”
      </p>
      <span aria-hidden="true" className="text-(--text-tertiary)">
        ·
      </span>
      <Menu
        label={`Explored Branches, ${count}`}
        align="center"
        trigger={
          <>
            {count}
            <ChevronDown aria-hidden="true" size={10} />
          </>
        }
        triggerClassName="flex shrink-0 items-center gap-1 text-(--text-secondary) transition-colors hover:text-(--text-primary)"
      >
        {(close) => (
          <>
            {branchItem(origin, close, "Original")}
            {branches.map((branch) => branchItem(branch, close))}
          </>
        )}
      </Menu>
      <span aria-hidden="true" className="menu-divider" />
      <button
        type="button"
        title="Archive these branches and return (Esc)"
        className="explore-chip-action"
        onClick={onDiscard}
      >
        Discard
      </button>
      <button
        type="button"
        title="Keep the branches you changed"
        className="explore-chip-action is-primary"
        onClick={onDone}
      >
        Done
      </button>
    </section>
  );
}

/**
 * Exploring from a component of the open branch. Opening a branch that is
 * neither the original nor one made while exploring keeps what was explored
 * and stops exploring.
 */
export function useExploration(session: ConceptSession) {
  const { activeConcept, activeBranch } = session;
  const [exploration, setExploration] = useState<Exploration | null>(null);
  /** A component a tool opened for editing, until its branch is left. */
  const [initialEdit, setInitialEdit] = useState<{
    branchId: string;
    componentId: ComponentId;
  } | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const explored = exploration?.branches.find(
    ({ id }) => id === activeBranch.id,
  );
  const origin = activeConcept.branches.find(
    ({ id }) => id === exploration?.originBranchId,
  );
  // As it is in the original branch, which every tool starts from.
  const component = origin?.editor?.present.concept.components.find(
    ({ id }) => id === exploration?.componentId,
  );

  if (
    exploration &&
    !explored &&
    (exploration.conceptId !== activeConcept.id ||
      exploration.originBranchId !== activeBranch.id)
  ) {
    setExploration(null);
  }

  if (initialEdit && initialEdit.branchId !== activeBranch.id) {
    setInitialEdit(null);
  }

  // Each explored branch as it is now, beside the concept it started from.
  const explorations = (exploration?.branches ?? []).flatMap((explored) => {
    const branch = activeConcept.branches.find(({ id }) => id === explored.id);
    return branch?.editor
      ? [{ ...explored, branch, editor: branch.editor }]
      : [];
  });
  const changed = explorations.filter(({ base, editor }) =>
    hasDifferences(base, editor.present),
  );
  // A substitute or constraint names its branch as it is written, unless the
  // branch has been renamed since.
  const renames = explorations.flatMap(
    ({ id, namedBy, autoTitle, branch, editor }) => {
      const title = editor.present.concept.components.find(
        (candidate) => candidate.id === namedBy,
      )?.title;
      const name = title?.trim() && fitName(title);

      return name && name !== autoTitle && branch.title === autoTitle
        ? [{ id, name }]
        : [];
    },
  );
  const renameKey = renames.map(({ id, name }) => `${id}:${name}`).join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: renames are keyed by their content
  useEffect(() => {
    if (!exploration || !renames.length) {
      return;
    }

    for (const { id, name } of renames) {
      session.renameBranch(exploration.conceptId, id, name);
    }

    setExploration({
      ...exploration,
      branches: exploration.branches.map((branch) => {
        const rename = renames.find(({ id }) => id === branch.id);
        return rename ? { ...branch, autoTitle: rename.name } : branch;
      }),
    });
  }, [renameKey]);

  function explore(tool: ExploreTool) {
    if (!exploration || !origin?.editor || !component) {
      return;
    }

    const { title, operations, editId } = toolBranch(
      tool,
      origin.editor.present,
      component,
    );
    const branchId = session.branchFromEditor(
      activeConcept,
      origin.id,
      origin.editor,
      { title, operations },
    );

    setExploration({
      ...exploration,
      branches: [
        ...exploration.branches,
        {
          id: branchId,
          base: origin.editor.present,
          reviewed: [],
          namedBy: tool === "remove" ? null : editId,
          autoTitle: title,
        },
      ],
    });
    setInitialEdit(editId ? { branchId, componentId: editId } : null);
  }

  /** Archives the branches made while exploring and returns to the original. */
  function discardNow() {
    if (!exploration) {
      return;
    }

    session.setArchived(
      exploration.conceptId,
      exploration.branches.map(({ id }) => id),
      true,
    );
    session.selectBranch(exploration.conceptId, exploration.originBranchId);
    setExploration(null);
    setConfirmingDiscard(false);
  }

  /** Asks first when discarding would archive real changes. */
  function discard() {
    if (changed.length) {
      setConfirmingDiscard(true);
    } else {
      discardNow();
    }
  }

  /** Keeps the branches that changed something and archives the rest. */
  function finish() {
    if (!exploration) {
      return;
    }

    const unchanged = explorations
      .filter((explored) => !changed.includes(explored))
      .map(({ id }) => id);

    if (unchanged.length) {
      session.setArchived(exploration.conceptId, unchanged, true);
    }

    setExploration(null);
  }

  function markReviewed(componentIds: ComponentId[]) {
    if (exploration) {
      setExploration({
        ...exploration,
        branches: exploration.branches.map((branch) =>
          branch.id === activeBranch.id
            ? { ...branch, reviewed: [...branch.reviewed, ...componentIds] }
            : branch,
        ),
      });
    }
  }

  const canvas: CanvasExploration | null = exploration && {
    base: explored?.base ?? null,
    reviewed: explored?.reviewed ?? [],
    available: Boolean(component),
    chip: (
      <ExploreChip
        componentTitle={component?.title ?? ""}
        origin={{ id: exploration.originBranchId, title: origin?.title ?? "" }}
        branches={activeConcept.branches.filter(({ id }) =>
          exploration.branches.some((branch) => branch.id === id),
        )}
        activeBranchId={activeBranch.id}
        onSelect={(branchId) =>
          session.selectBranch(exploration.conceptId, branchId)
        }
        onDiscard={discard}
        onDone={finish}
      />
    ),
    onTool: explore,
    onReviewed: markReviewed,
    onDiscard: discard,
  };

  const count = changed.length;
  const notice = confirmingDiscard && (
    <Notice
      title="Discard Explored Branches"
      onDismiss={() => setConfirmingDiscard(false)}
      actions={
        <>
          <button
            type="button"
            data-autofocus
            className="menu-item"
            onClick={() => setConfirmingDiscard(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="menu-item is-primary"
            onClick={discardNow}
          >
            Discard
          </button>
        </>
      }
    >
      {count === 1 ? "One branch has" : `${count} branches have`} changes. They
      will move to Archived in the branch menu, where you can open them again.
    </Notice>
  );

  return {
    canvas,
    /** Shown over the editor, which is inert while it is. */
    notice: notice || null,
    initialEditId: initialEdit?.componentId ?? null,
    start(componentId: ComponentId) {
      setExploration({
        conceptId: activeConcept.id,
        originBranchId: activeBranch.id,
        componentId,
        branches: [],
      });
    },
  };
}
