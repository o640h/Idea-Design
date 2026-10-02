"use client";

import {
  applyNodeChanges,
  type Connection,
  ConnectionMode,
  type EdgeChange,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { ChartNoAxesGantt, Check } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { componentChanges, connectedToChanges } from "@/lib/concepts/diff";
import type { EditorDispatch, EditorState } from "@/lib/concepts/editor";
import {
  type ComponentId,
  type ComponentTextField,
  type Concept,
  type ConceptRelationship,
  createComponent,
  createComponentLayout,
  DEFAULT_TEXT_FORMATS,
  type EditableConcept,
  RELATIONSHIP_KINDS,
} from "@/lib/concepts/model";
import {
  BlockNode,
  type BlockNodeType,
  CanvasActionsContext,
  RelationshipEdge,
  type RelationshipEdgeType,
} from "./blocks";
import ContextMenu, { type ContextMenuState } from "./context_menu";
import { historyShortcut, isTyping } from "./keyboard";
import type { ExploreTool } from "./explore";
import Menu from "./menu";
import ConceptOutline from "./outline";
import { TextField } from "./text_field";
import BottomBar, { animationDuration, type CanvasView } from "./toolbar";

const nodeTypes = { block: BlockNode };
const edgeTypes = { relationship: RelationshipEdge };

/** Offsets a new block so its text starts where the pointer or centre is. */
const BLOCK_TEXT_OFFSET = { x: 12, y: 18 };

export interface CanvasDisplay {
  borders: boolean;
  labels: boolean;
}

/** What the canvas shows and offers while exploring from a component. */
export interface CanvasExploration {
  /** The concept this branch started from; null in the branch explored from. */
  base: EditableConcept | null;
  reviewed: ComponentId[];
  /** False once the component explored from is gone from its branch. */
  available: boolean;
  chip: ReactNode;
  onTool: (tool: ExploreTool) => void;
  onReviewed: (id: ComponentId) => void;
  onDiscard: () => void;
}

interface ConceptCanvasProps {
  state: EditorState;
  dispatch: EditorDispatch;
  branchTitle: string;
  display: CanvasDisplay;
  onDisplayChange: (display: CanvasDisplay) => void;
  /** Starts editing this component, title selected, as the canvas opens. */
  initialEditId: ComponentId | null;
  onExplore: (id: ComponentId) => void;
  explore: CanvasExploration | null;
}

export default function ConceptCanvas(props: ConceptCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
}

function CanvasContent({
  state,
  dispatch,
  branchTitle,
  display,
  onDisplayChange,
  initialEditId,
  onExplore,
  explore,
}: ConceptCanvasProps) {
  const { concept, componentLayouts } = state.present;
  const { selection } = state;
  const { screenToFlowPosition, fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<CanvasView>("canvas");
  const [editingId, setEditingId] = useState(initialEditId);
  const [selectingId, setSelectingId] = useState(initialEditId);
  const [draft, setDraft] = useState<{
    id: ComponentId;
    position: XYPosition;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const selectedAtPointerDown = useRef<string | null>(null);
  const selectedAtKeyDown = useRef<string | null>(null);

  const base = explore?.base;
  const reviewed = explore?.reviewed;
  const changes = useMemo(() => {
    if (!base) {
      return null;
    }

    const changed = componentChanges(base, state.present);
    const review = connectedToChanges(base, state.present, changed);

    for (const id of reviewed ?? []) {
      review.delete(id);
    }

    return { ...changed, review };
  }, [base, reviewed, state.present]);

  const blockNodes = useMemo(() => {
    const layoutById = new Map(
      componentLayouts.map((layout) => [layout.componentId, layout]),
    );
    const baseTitles = new Map(
      base?.concept.components.map(({ id, title }) => [id, title]),
    );
    const blocks = concept.components.flatMap((component): BlockNodeType[] => {
      const layout = layoutById.get(component.id);
      const previousTitle = baseTitles.get(component.id);

      if (!layout) {
        return [];
      }

      return [
        {
          id: component.id,
          type: "block",
          position: { x: layout.x, y: layout.y },
          width: layout.width,
          data: {
            component,
            formats: layout.formats,
            fixedWidth: layout.width !== undefined,
            minHeight: layout.height,
            editing: component.id === editingId,
            selectTitle: component.id === selectingId,
            draft: false,
            mark:
              changes?.added.has(component.id) ||
              changes?.edited.has(component.id)
                ? "changed"
                : changes?.review.has(component.id)
                  ? "review"
                  : undefined,
            previousTitle:
              previousTitle !== undefined && previousTitle !== component.title
                ? previousTitle
                : undefined,
          },
          selected:
            selection?.kind === "component" && selection.id === component.id,
        },
      ];
    });
    const removed = (base?.componentLayouts ?? []).flatMap(
      (layout): BlockNodeType[] => {
        const component = base?.concept.components.find(
          ({ id }) => id === layout.componentId,
        );

        if (!component || !changes?.removed.has(component.id)) {
          return [];
        }

        return [
          {
            id: component.id,
            type: "block",
            position: { x: layout.x, y: layout.y },
            width: layout.width,
            selectable: false,
            draggable: false,
            connectable: false,
            focusable: false,
            data: {
              component,
              formats: layout.formats,
              fixedWidth: layout.width !== undefined,
              minHeight: layout.height,
              editing: false,
              draft: false,
              mark: "removed",
            },
          },
        ];
      },
    );

    if (!draft) {
      return [...blocks, ...removed];
    }

    const draftNode: BlockNodeType = {
      id: draft.id,
      type: "block",
      position: draft.position,
      data: {
        component: createComponent(draft.id),
        formats: DEFAULT_TEXT_FORMATS,
        fixedWidth: false,
        editing: true,
        draft: true,
      },
    };

    return [...blocks, ...removed, draftNode];
  }, [
    concept.components,
    componentLayouts,
    draft,
    editingId,
    selectingId,
    selection,
    base,
    changes,
  ]);

  // React Flow keeps measured sizes and in-progress drags on its node objects,
  // so nodes are held locally and rebuilt from editor state when it changes.
  const [nodes, setNodes] = useState(blockNodes);
  const [syncedBlockNodes, setSyncedBlockNodes] = useState(blockNodes);

  if (blockNodes !== syncedBlockNodes) {
    const measured = new Map(nodes.map((node) => [node.id, node.measured]));
    setSyncedBlockNodes(blockNodes);
    setNodes(
      blockNodes.map((node) => ({ ...node, measured: measured.get(node.id) })),
    );
  }

  const edges = useMemo(() => {
    const centreX = new Map(
      nodes.map((node) => [
        node.id,
        node.position.x + (node.measured?.width ?? 0) / 2,
      ]),
    );

    const titles = new Map(
      nodes.map((node) => [node.id, node.data.component.title || "Untitled"]),
    );

    const edge = (relationship: ConceptRelationship): RelationshipEdgeType => {
      const leftToRight =
        (centreX.get(relationship.sourceComponentId) ?? 0) <=
        (centreX.get(relationship.targetComponentId) ?? 0);

      return {
        id: relationship.id,
        type: "relationship",
        source: relationship.sourceComponentId,
        target: relationship.targetComponentId,
        sourceHandle: leftToRight ? "right" : "left",
        targetHandle: leftToRight ? "left" : "right",
        // React Flow names an unlabelled edge by its IDs.
        ariaLabel: [
          `${titles.get(relationship.sourceComponentId)} to ${titles.get(relationship.targetComponentId)}`,
          relationship.type,
        ]
          .filter(Boolean)
          .join(", "),
        data: { relationship },
        selected:
          selection?.kind === "relationship" &&
          selection.id === relationship.id,
      };
    };
    // Connections that went with a removed component, drawn faintly too.
    const removed = (base?.concept.relationships ?? [])
      .filter(
        ({ sourceComponentId, targetComponentId }) =>
          (changes?.removed.has(sourceComponentId) ||
            changes?.removed.has(targetComponentId)) &&
          centreX.has(sourceComponentId) &&
          centreX.has(targetComponentId),
      )
      .map(
        (relationship): RelationshipEdgeType => ({
          ...edge(relationship),
          data: { relationship, removed: true },
          className: "is-removed",
          selectable: false,
          focusable: false,
        }),
      );

    return [...concept.relationships.map(edge), ...removed];
  }, [concept.relationships, nodes, selection, base, changes]);

  function createDraft(position: XYPosition) {
    const id = crypto.randomUUID();
    setDraft({ id, position });
    setEditingId(id);
    dispatch({ type: "selection/set", selection: null });
  }

  function blockPositionAt({
    clientX,
    clientY,
  }: Pick<MouseEvent, "clientX" | "clientY">) {
    const pointer = screenToFlowPosition({ x: clientX, y: clientY });
    return {
      x: pointer.x - BLOCK_TEXT_OFFSET.x,
      y: pointer.y - BLOCK_TEXT_OFFSET.y,
    };
  }

  function centrePosition() {
    const bounds = containerRef.current?.getBoundingClientRect();
    const centre = screenToFlowPosition({
      x: (bounds?.left ?? 0) + (bounds?.width ?? 0) / 2,
      y: (bounds?.top ?? 0) + (bounds?.height ?? 0) / 2,
    });
    const position = { x: centre.x - 120, y: centre.y - BLOCK_TEXT_OFFSET.y };
    // Clear of every block, with a gap, by their measured size where known.
    const overlaps = (y: number) =>
      nodes.some(({ position: other, measured }) => {
        const width = measured?.width ?? 240;
        const height = measured?.height ?? 48;

        return (
          position.x < other.x + width + 16 &&
          position.x + 240 > other.x - 16 &&
          y < other.y + height + 16 &&
          y + 48 > other.y - 16
        );
      });

    while (overlaps(position.y)) {
      position.y += 24;
    }

    return position;
  }

  // Memoised so dragging, which re-renders the canvas, does not re-render
  // every block through context.
  const actions = useMemo(
    () => ({
      dispatch,
      stopEditing: (id: ComponentId) => {
        setDraft((current) => (current?.id === id ? null : current));
        setEditingId((current) => (current === id ? null : current));
        setSelectingId(null);
      },
      commitField: (
        id: ComponentId,
        field: ComponentTextField,
        value: string,
        continuing: boolean,
      ) => {
        if (draft?.id !== id) {
          dispatch(
            { type: "component/update", id, field, value },
            { continuing },
          );
          return;
        }

        if (value.trim()) {
          dispatch({
            type: "component/create",
            component: { ...createComponent(id), [field]: value },
            layout: createComponentLayout(id, draft.position),
          });
          dispatch({
            type: "selection/set",
            selection: { kind: "component", id },
          });
          setDraft(null);
        }
      },
    }),
    [dispatch, draft],
  );

  /** Mirrors React Flow's selection, including Escape on a focused node. */
  function syncSelection(
    kind: "component" | "relationship",
    changes: (NodeChange<BlockNodeType> | EdgeChange<RelationshipEdgeType>)[],
  ) {
    const selectChanges = changes.filter((change) => change.type === "select");
    const selected = selectChanges.find((change) => change.selected);

    if (selected) {
      dispatch({
        type: "selection/set",
        selection: { kind, id: selected.id },
      });
    } else if (selectChanges.some((change) => change.id === selection?.id)) {
      dispatch({ type: "selection/set", selection: null });
    }
  }

  function fitToContent() {
    fitView({ padding: 0.2, maxZoom: 1.5, duration: animationDuration() });
  }

  function isValidConnection({
    source,
    target,
  }: Connection | RelationshipEdgeType) {
    const componentIds = new Set(concept.components.map(({ id }) => id));

    return (
      source !== target &&
      componentIds.has(source) &&
      componentIds.has(target) &&
      !concept.relationships.some(
        (relationship) =>
          relationship.sourceComponentId === source &&
          relationship.targetComponentId === target,
      )
    );
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      const history = historyShortcut(event);

      if (history) {
        event.preventDefault();
        dispatch(history);
        return;
      }

      if (view !== "canvas") {
        return;
      }

      // Escape steps out: first of the selection, then of exploring.
      if (event.key === "Escape" && !selection && explore) {
        event.preventDefault();
        explore.onDiscard();
        return;
      }

      if (!selection) {
        return;
      }

      if (
        event.key.toLowerCase() === "e" &&
        !explore &&
        selection.kind === "component" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        onExplore(selection.id);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        dispatch(
          selection.kind === "component"
            ? { type: "component/delete", id: selection.id }
            : { type: "relationship/unlink", id: selection.id },
        );
      } else if (event.key === "Escape") {
        dispatch({ type: "selection/set", selection: null });
      } else if (event.key === "Enter" && selection.kind === "component") {
        const target =
          event.target instanceof HTMLElement ? event.target : null;
        const focusedNodeId =
          target?.closest<HTMLElement>(".react-flow__node")?.dataset.id;

        // Enter presses a focused button rather than editing the selection.
        // On a focused node, React Flow selects it during this same keypress,
        // so it is edited only if it was already selected.
        if (
          !target?.closest("button, a[href]") &&
          (!focusedNodeId || focusedNodeId === selectedAtKeyDown.current)
        ) {
          event.preventDefault();
          setEditingId(selection.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, selection, view, explore, onExplore]);

  const header = (
    <ConceptHeader
      concept={concept}
      branchTitle={branchTitle}
      reviewCount={changes?.review.size ?? 0}
      dispatch={dispatch}
    />
  );

  return (
    <CanvasActionsContext value={actions}>
      <div
        ref={containerRef}
        className="concept-canvas relative h-full"
        data-borders={display.borders || undefined}
        data-labels={display.labels || undefined}
        // React Flow selects on pointer down and on Enter, so note what was
        // selected before.
        onPointerDownCapture={() => {
          selectedAtPointerDown.current = selection?.id ?? null;
        }}
        onKeyDownCapture={() => {
          selectedAtKeyDown.current = selection?.id ?? null;
        }}
      >
        {view === "canvas" ? (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultViewport={state.viewport}
              minZoom={0.2}
              maxZoom={3}
              connectionMode={ConnectionMode.Loose}
              connectionRadius={24}
              isValidConnection={isValidConnection}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              selectionKeyCode={null}
              zoomOnDoubleClick={false}
              proOptions={{ hideAttribution: true }}
              onNodesChange={(changes: NodeChange<BlockNodeType>[]) => {
                syncSelection("component", changes);

                setNodes((current) =>
                  applyNodeChanges(
                    changes.filter((change) => change.type !== "select"),
                    current,
                  ),
                );
              }}
              onEdgesChange={(changes: EdgeChange<RelationshipEdgeType>[]) =>
                syncSelection("relationship", changes)
              }
              onNodeDragStop={(_, node) => {
                const position = {
                  x: Math.round(node.position.x),
                  y: Math.round(node.position.y),
                };

                if (node.id === draft?.id) {
                  setDraft({ id: node.id, position });
                } else {
                  dispatch({ type: "component/move", id: node.id, position });
                }
              }}
              onNodeClick={(_, node) => {
                if (selectedAtPointerDown.current === node.id) {
                  setEditingId(node.id);
                }
              }}
              onNodeDoubleClick={(_, node) => setEditingId(node.id)}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();

                if (node.id === draft?.id || node.data.mark === "removed") {
                  return;
                }

                dispatch({
                  type: "selection/set",
                  selection: { kind: "component", id: node.id },
                });
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: [
                    ...(explore
                      ? []
                      : [
                          {
                            label: "Explore From Here",
                            onSelect: () => onExplore(node.id),
                          },
                        ]),
                    ...(node.data.mark === "review"
                      ? [
                          {
                            label: "Mark Reviewed",
                            onSelect: () => explore?.onReviewed(node.id),
                          },
                        ]
                      : []),
                    {
                      label: "Edit Text",
                      onSelect: () => setEditingId(node.id),
                    },
                    ...(node.data.fixedWidth ||
                    node.data.minHeight !== undefined
                      ? [
                          {
                            label: "Fit to Text",
                            onSelect: () =>
                              dispatch({
                                type: "component/resize",
                                id: node.id,
                                width: null,
                                height: null,
                              }),
                          },
                        ]
                      : []),
                    {
                      label: "Delete",
                      onSelect: () =>
                        dispatch({ type: "component/delete", id: node.id }),
                    },
                  ],
                });
              }}
              onEdgeContextMenu={(event, edge) => {
                event.preventDefault();
                dispatch({
                  type: "selection/set",
                  selection: { kind: "relationship", id: edge.id },
                });
                const label = (value: string | null) => () =>
                  dispatch({
                    type: "relationship/update",
                    id: edge.id,
                    field: "type",
                    value,
                  });

                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: [
                    ...Object.keys(RELATIONSHIP_KINDS).map((kind) => ({
                      label: kind.replace(/\b\w/g, (letter) =>
                        letter.toUpperCase(),
                      ),
                      onSelect: label(kind),
                    })),
                    ...(edge.data?.relationship.type
                      ? [{ label: "Remove Label", onSelect: label(null) }]
                      : []),
                    {
                      label: "Delete",
                      onSelect: () =>
                        dispatch({ type: "relationship/unlink", id: edge.id }),
                    },
                  ],
                });
              }}
              onPaneContextMenu={(event) => {
                event.preventDefault();
                const position = blockPositionAt(event);
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: [
                    {
                      label: "Add Text Here",
                      onSelect: () => createDraft(position),
                    },
                    { label: "Fit to Content", onSelect: fitToContent },
                  ],
                });
              }}
              onConnect={({ source, target }) =>
                dispatch({
                  type: "relationship/link",
                  relationship: {
                    id: crypto.randomUUID(),
                    sourceComponentId: source,
                    targetComponentId: target,
                    type: null,
                  },
                })
              }
              onPaneClick={(event) => {
                if (event.detail === 2) {
                  createDraft(blockPositionAt(event));
                } else {
                  dispatch({ type: "selection/set", selection: null });
                }
              }}
              onMoveEnd={(_, viewport) =>
                dispatch({ type: "viewport/set", viewport })
              }
            />
            <div className="pointer-events-none absolute top-6 left-10 z-10">
              {header}
            </div>
            <DisplayMenu display={display} onChange={onDisplayChange} />
            {explore && (
              <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
                {explore.chip}
              </div>
            )}
            {nodes.length === 0 && (
              <EmptyState
                onSubmit={(title) => {
                  const id = crypto.randomUUID();
                  dispatch({
                    type: "component/create",
                    component: { ...createComponent(id), title },
                    layout: createComponentLayout(id, centrePosition()),
                  });
                }}
              />
            )}
          </>
        ) : (
          <ConceptOutline
            editable={state.present}
            dispatch={dispatch}
            header={header}
          />
        )}

        <ThinkingOrb
          state="composing"
          size={64}
          theme="dark"
          aria-hidden="true"
          className={`canvas-orb${
            view === "canvas" && nodes.length === 0 ? "" : " is-docked"
          }`}
        />

        <BottomBar
          view={view}
          onViewChange={setView}
          onAdd={() => createDraft(centrePosition())}
          onExplore={
            selection?.kind === "component"
              ? () => onExplore(selection.id)
              : null
          }
          explore={
            explore && { onTool: explore.onTool, available: explore.available }
          }
          onFit={fitToContent}
          canUndo={state.undoStack.length > 0}
          canRedo={state.redoStack.length > 0}
          dispatch={dispatch}
        />

        {contextMenu && (
          <ContextMenu
            menu={contextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    </CanvasActionsContext>
  );
}

function pluralise(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function ConceptHeader({
  concept,
  branchTitle,
  reviewCount,
  dispatch,
}: {
  concept: Concept;
  branchTitle: string;
  /** Components connected to changes made while exploring. */
  reviewCount: number;
  dispatch: EditorDispatch;
}) {
  return (
    <header className="flex max-w-105 flex-col items-start">
      <TextField
        singleLine
        aria-label="Concept Title"
        placeholder="Untitled Concept"
        className="pointer-events-auto text-base leading-5.5 font-medium text-(--text-primary)"
        commitWhileTyping
        value={concept.title}
        onCommit={(value, continuing) =>
          dispatch(
            { type: "concept/update", field: "title", value },
            { continuing },
          )
        }
      />
      <p className="mt-1 text-small text-(--text-tertiary)">
        {branchTitle}
        <span aria-hidden="true">{"  ·  "}</span>
        {pluralise(concept.components.length, "Component")}
        <span aria-hidden="true">{"  ·  "}</span>
        {pluralise(concept.relationships.length, "Connection")}
        {reviewCount > 0 && (
          <>
            <span aria-hidden="true">{"  ·  "}</span>
            <span className="text-(--attention)">{reviewCount} to Review</span>
          </>
        )}
      </p>
    </header>
  );
}

function EmptyState({ onSubmit }: { onSubmit: (title: string) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="writing-underline pointer-events-auto">
        <TextField
          singleLine
          aria-label="First Component"
          placeholder="What’s on your mind?"
          className="max-w-105 text-xl leading-6 text-(--text-primary)"
          value=""
          onCommit={(title) => {
            if (title.trim()) {
              onSubmit(title.trim());
            }
          }}
        />
      </div>
    </div>
  );
}

function DisplayMenu({
  display,
  onChange,
}: {
  display: CanvasDisplay;
  onChange: (display: CanvasDisplay) => void;
}) {
  const options = [
    { key: "borders", label: "Borders" },
    { key: "labels", label: "Labels" },
  ] as const;

  return (
    <div className="absolute top-5.5 right-5.75 z-10">
      <Menu
        label="Display"
        align="end"
        trigger={
          <ChartNoAxesGantt aria-hidden="true" size={16} strokeWidth={1} />
        }
        triggerClassName="display-trigger grid size-6 place-items-center rounded-sm text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
      >
        {() =>
          options.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={display[key]}
              className="menu-item w-28 justify-between"
              onClick={() => onChange({ ...display, [key]: !display[key] })}
            >
              {label}
              {display[key] && <Check aria-hidden="true" size={10} />}
            </button>
          ))
        }
      </Menu>
    </div>
  );
}
