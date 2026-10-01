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
import { useEffect, useMemo, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import type { EditorDispatch, EditorState } from "@/lib/concepts/editor";
import {
  type ComponentId,
  type ComponentTextField,
  type Concept,
  createComponent,
  createComponentLayout,
  DEFAULT_TEXT_FORMATS,
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

interface ConceptCanvasProps {
  state: EditorState;
  dispatch: EditorDispatch;
  display: CanvasDisplay;
  onDisplayChange: (display: CanvasDisplay) => void;
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
  display,
  onDisplayChange,
}: ConceptCanvasProps) {
  const { concept, componentLayouts } = state.present;
  const { selection } = state;
  const { screenToFlowPosition, fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<CanvasView>("canvas");
  const [editingId, setEditingId] = useState<ComponentId | null>(null);
  const [draft, setDraft] = useState<{
    id: ComponentId;
    position: XYPosition;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const selectedAtPointerDown = useRef<string | null>(null);

  const blockNodes = useMemo(() => {
    const layoutById = new Map(
      componentLayouts.map((layout) => [layout.componentId, layout]),
    );
    const blocks = concept.components.flatMap((component): BlockNodeType[] => {
      const layout = layoutById.get(component.id);

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
            draft: false,
          },
          selected:
            selection?.kind === "component" && selection.id === component.id,
        },
      ];
    });

    if (!draft) {
      return blocks;
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

    return [...blocks, draftNode];
  }, [concept.components, componentLayouts, draft, editingId, selection]);

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

    return concept.relationships.map((relationship): RelationshipEdgeType => {
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
        data: { relationship },
        selected:
          selection?.kind === "relationship" &&
          selection.id === relationship.id,
      };
    });
  }, [concept.relationships, nodes, selection]);

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
    let position = { x: centre.x - 120, y: centre.y - BLOCK_TEXT_OFFSET.y };

    while (
      componentLayouts.some(
        (existing) =>
          Math.abs(existing.x - position.x) < 8 &&
          Math.abs(existing.y - position.y) < 8,
      )
    ) {
      position = { x: position.x + 24, y: position.y + 24 };
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
        return;
      }

      if (view !== "canvas" || !selection) {
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
        // React Flow selects a focused node on Enter; only edit once selected.
        const focusedNodeId =
          target?.closest<HTMLElement>(".react-flow__node")?.dataset.id;

        if (!focusedNodeId || focusedNodeId === selection.id) {
          event.preventDefault();
          setEditingId(selection.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, selection, view]);

  const header = <ConceptHeader concept={concept} dispatch={dispatch} />;

  return (
    <CanvasActionsContext value={actions}>
      <div
        ref={containerRef}
        className="concept-canvas relative h-full"
        data-borders={display.borders || undefined}
        data-labels={display.labels || undefined}
        // React Flow selects on pointer down, so note what was selected before.
        onPointerDownCapture={() => {
          selectedAtPointerDown.current = selection?.id ?? null;
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

                if (node.id === draft?.id) {
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
  dispatch,
}: {
  concept: Concept;
  dispatch: EditorDispatch;
}) {
  return (
    <header className="flex max-w-[420px] flex-col items-start">
      <TextField
        singleLine
        aria-label="Concept Title"
        placeholder="Untitled Concept"
        className="pointer-events-auto text-base leading-[22px] font-medium text-[var(--text-primary)]"
        commitWhileTyping
        value={concept.title}
        onCommit={(value, continuing) =>
          dispatch(
            { type: "concept/update", field: "title", value },
            { continuing },
          )
        }
      />
      <p className="mt-1 text-small text-[var(--text-tertiary)]">
        {pluralise(concept.components.length, "Component")}
        <span aria-hidden="true">{"  ·  "}</span>
        {pluralise(concept.relationships.length, "Connection")}
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
          className="max-w-[420px] text-xl leading-6 text-[var(--text-primary)]"
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
    <div className="absolute top-[22px] right-[23px] z-10">
      <Menu
        label="Display"
        align="end"
        trigger={
          <ChartNoAxesGantt aria-hidden="true" size={16} strokeWidth={1} />
        }
        triggerClassName="display-trigger grid size-6 place-items-center rounded-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
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
