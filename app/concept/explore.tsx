"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
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
  }[];
}

function shortTitle({ title }: ConceptComponent) {
  const text = title.trim() || "Untitled";
  return text.length > 32 ? `${text.slice(0, 31).trimEnd()}…` : text;
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

/** The branch a tool makes, and which component to start editing in it. */
function toolBranch(
  tool: ExploreTool,
  document: EditableConcept,
  component: ConceptComponent,
): { title: string; operations: Operation[]; editId: ComponentId | null } {
  const name = shortTitle(component);

  switch (tool) {
    case "substitute":
      return {
        title: `Instead of ${name}`,
        operations: [],
        editId: component.id,
      };

    case "remove":
      return {
        title: `Without ${name}`,
        operations: [{ type: "component/delete", id: component.id }],
        editId: null,
      };

    case "constrain": {
      const id = crypto.randomUUID();

      return {
        title: `Constraint on ${name}`,
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
      <p className="truncate">
        <span className="text-(--text-tertiary)">Exploring From </span>“
        {componentTitle || "Untitled"}”
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
        title="Keep these branches"
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
        { id: branchId, base: origin.editor.present, reviewed: [] },
      ],
    });
    setInitialEdit(editId ? { branchId, componentId: editId } : null);
  }

  /** Archives the branches made while exploring and returns to the original. */
  function discard() {
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
  }

  function markReviewed(componentId: ComponentId) {
    if (exploration) {
      setExploration({
        ...exploration,
        branches: exploration.branches.map((branch) =>
          branch.id === activeBranch.id
            ? { ...branch, reviewed: [...branch.reviewed, componentId] }
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
        onDone={() => setExploration(null)}
      />
    ),
    onTool: explore,
    onReviewed: markReviewed,
    onDiscard: discard,
  };

  return {
    canvas,
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
