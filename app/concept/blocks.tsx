"use client";

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  Handle,
  type Node,
  type NodeProps,
  NodeToolbar,
  Position,
} from "@xyflow/react";
import { ChevronDown, Italic } from "lucide-react";
import {
  type CSSProperties,
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { EditorAction } from "@/lib/concepts/editor";
import type {
  ComponentId,
  ComponentLayout,
  ComponentTextField,
  ConceptComponent,
  ConceptRelationship,
  TextFormat,
} from "@/lib/concepts/model";
import Menu from "./menu";
import TagMenu from "./tag_menu";
import { TextField } from "./text_field";

const FONT_SIZES = [10, 13, 16, 20, 24, 32];
const FONT_WEIGHTS = [
  { label: "Regular", value: 300 },
  { label: "Medium", value: 400 },
  { label: "Bold", value: 500 },
] as const;
const TEXT_OPACITIES = [0.25, 0.5, 0.75, 0.85, 1];

export type BlockNodeType = Node<
  {
    component: ConceptComponent;
    formats: ComponentLayout["formats"];
    editing: boolean;
    /** Not yet added to the concept; it becomes a component once it has text. */
    draft: boolean;
  },
  "block"
>;

export type RelationshipEdgeType = Edge<
  { relationship: ConceptRelationship },
  "relationship"
>;

interface CanvasActions {
  dispatch: (action: EditorAction) => void;
  stopEditing: (id: ComponentId) => void;
  commitField: (
    id: ComponentId,
    field: ComponentTextField,
    value: string,
  ) => void;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);

function useCanvasActions() {
  const actions = useContext(CanvasActionsContext);

  if (!actions) {
    throw new Error("Canvas items must be rendered inside the concept canvas.");
  }

  return actions;
}

function textStyle({
  fontSize,
  fontWeight,
  opacity,
  italic,
}: TextFormat): CSSProperties {
  return {
    fontSize,
    fontWeight,
    opacity,
    fontStyle: italic ? "italic" : undefined,
  };
}

function BlockEditor({
  component,
  formats,
  measured,
  onFocusField,
}: {
  component: ConceptComponent;
  formats: ComponentLayout["formats"];
  measured: boolean;
  onFocusField: (field: ComponentTextField) => void;
}) {
  const { commitField, stopEditing } = useCanvasActions();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // React Flow hides a node until it is measured, and hidden fields cannot
  // take focus.
  useEffect(() => {
    const title = titleRef.current;

    if (measured && title) {
      title.focus();
      title.setSelectionRange(title.value.length, title.value.length);
    }
  }, [measured]);

  return (
    <fieldset
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          stopEditing(component.id);
        }
      }}
    >
      <TextField
        ref={titleRef}
        singleLine
        aria-label="Component Title"
        placeholder="Type here"
        className="block-title nodrag"
        style={textStyle(formats.title)}
        value={component.title}
        onFocus={() => onFocusField("title")}
        onCommit={(value) => commitField(component.id, "title", value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            descriptionRef.current?.focus();
          }
        }}
      />
      <TextField
        ref={descriptionRef}
        aria-label="Component Description"
        placeholder="Add detail"
        className="block-description nodrag"
        style={textStyle(formats.description)}
        value={component.description}
        onFocus={() => onFocusField("description")}
        onCommit={(value) => commitField(component.id, "description", value)}
      />
    </fieldset>
  );
}

function FormatBar({
  format,
  tag,
  onFormat,
  onPreview,
  onTagChange,
}: {
  format: TextFormat;
  tag: string | null;
  onFormat: (changes: Partial<TextFormat>) => void;
  onPreview: (format: Partial<TextFormat> | null) => void;
  onTagChange: (tag: string | null) => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Format Text"
      className="format-bar nodrag nopan"
      // Keeps focus, and so the field being formatted, in the text being edited.
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLInputElement)) {
          event.preventDefault();
        }
      }}
      // The toolbar is portalled but still inside the node in React's tree,
      // where clicks would start editing and arrow keys would move the node.
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key !== "Escape") {
          event.stopPropagation();
        }
      }}
    >
      <Menu
        label={`Text Size, ${format.fontSize}`}
        trigger={
          <>
            {format.fontSize}
            <ChevronDown aria-hidden="true" size={10} />
          </>
        }
        triggerClassName="format-button gap-1 tabular-nums"
        onOpenChange={(open) => {
          if (!open) {
            onPreview(null);
          }
        }}
      >
        {(close) =>
          FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={size === format.fontSize}
              className="menu-item tabular-nums"
              onPointerEnter={() => onPreview({ fontSize: size })}
              onPointerLeave={() => onPreview(null)}
              onFocus={() => onPreview({ fontSize: size })}
              onBlur={() => onPreview(null)}
              onClick={() => {
                onFormat({ fontSize: size });
                close();
              }}
            >
              {size}
            </button>
          ))
        }
      </Menu>
      <span aria-hidden="true" className="format-divider" />
      <Menu
        label={`Font Weight, ${format.fontWeight}`}
        trigger={
          <>
            {
              FONT_WEIGHTS.find((weight) => weight.value === format.fontWeight)
                ?.label
            }
            <ChevronDown aria-hidden="true" size={10} />
          </>
        }
        triggerClassName="format-button gap-1"
        onOpenChange={(open) => {
          if (!open) onPreview(null);
        }}
      >
        {(close) =>
          FONT_WEIGHTS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              aria-pressed={format.fontWeight === value}
              className="menu-item"
              onPointerEnter={() => onPreview({ fontWeight: value })}
              onPointerLeave={() => onPreview(null)}
              onFocus={() => onPreview({ fontWeight: value })}
              onBlur={() => onPreview(null)}
              onClick={() => {
                onFormat({ fontWeight: value });
                close();
              }}
            >
              {label}
            </button>
          ))
        }
      </Menu>
      <span aria-hidden="true" className="format-divider" />
      <button
        type="button"
        aria-label="Italic"
        aria-pressed={format.italic}
        className="format-button"
        onClick={() => onFormat({ italic: !format.italic })}
      >
        <Italic aria-hidden="true" size={12} strokeWidth={1.75} />
      </button>
      <span aria-hidden="true" className="format-divider" />
      <Menu
        label={`Text Opacity, ${Math.round(format.opacity * 100)}%`}
        trigger={
          <>
            {Math.round(format.opacity * 100)}%
            <ChevronDown aria-hidden="true" size={10} />
          </>
        }
        triggerClassName="format-button gap-1 tabular-nums"
        onOpenChange={(open) => {
          if (!open) onPreview(null);
        }}
      >
        {(close) =>
          TEXT_OPACITIES.map((opacity) => (
            <button
              key={opacity}
              type="button"
              aria-pressed={format.opacity === opacity}
              className="menu-item tabular-nums"
              onPointerEnter={() => onPreview({ opacity })}
              onPointerLeave={() => onPreview(null)}
              onFocus={() => onPreview({ opacity })}
              onBlur={() => onPreview(null)}
              onClick={() => {
                onFormat({ opacity });
                close();
              }}
            >
              {Math.round(opacity * 100)}%
            </button>
          ))
        }
      </Menu>
      <span aria-hidden="true" className="format-divider" />
      <TagMenu
        tag={tag}
        triggerClassName="format-button gap-1"
        onChange={onTagChange}
      />
    </div>
  );
}

export const BlockNode = memo(function BlockNode({
  id,
  data: { component, formats, editing, draft },
  selected,
  dragging,
  width,
}: NodeProps<BlockNodeType>) {
  const { dispatch } = useCanvasActions();
  const [focusedField, setFocusedField] = useState<ComponentTextField>("title");
  const [preview, setPreview] = useState<Partial<TextFormat> | null>(null);
  const field = focusedField;
  const shownFormats =
    preview === null
      ? formats
      : { ...formats, [field]: { ...formats[field], ...preview } };

  return (
    <div
      className={`concept-block writing-underline${selected ? " is-selected" : ""}`}
      style={{ fontSize: shownFormats.title.fontSize }}
    >
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className="block-handle"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="block-handle"
      />

      {component.tag && <p className="eyebrow block-tag">{component.tag}</p>}

      {editing ? (
        <BlockEditor
          component={component}
          formats={shownFormats}
          measured={Boolean(width)}
          onFocusField={setFocusedField}
        />
      ) : (
        <>
          <p
            className={`block-title${component.title ? "" : " is-empty"}`}
            style={textStyle(shownFormats.title)}
          >
            {component.title || "Untitled"}
          </p>
          {component.description && (
            <p
              className="block-description"
              style={textStyle(shownFormats.description)}
            >
              {component.description}
            </p>
          )}
        </>
      )}

      <NodeToolbar
        isVisible={(selected || editing) && !dragging && !draft}
        position={Position.Bottom}
        align="start"
        offset={4}
      >
        <FormatBar
          format={formats[field]}
          tag={component.tag}
          onFormat={(changes) =>
            dispatch({ type: "component/format", id, field, changes })
          }
          onPreview={setPreview}
          onTagChange={(tag) =>
            dispatch({ type: "component/update", id, changes: { tag } })
          }
        />
      </NodeToolbar>
    </div>
  );
});

export function RelationshipEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<RelationshipEdgeType>) {
  const { dispatch } = useCanvasActions();
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const label = data?.relationship.type;

  return (
    <>
      <BaseEdge id={id} path={path} interactionWidth={16} />
      <circle className="edge-end" cx={targetX} cy={targetY} r={2} />

      {(label || selected) && (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {selected ? (
              <TextField
                singleLine
                aria-label="Connection Label"
                placeholder="Add Label"
                className="menu-surface min-w-16 max-w-40 px-2 py-1 text-[var(--text-primary)]"
                value={label ?? ""}
                onCommit={(value) =>
                  dispatch({
                    type: "relationship/update",
                    id,
                    changes: { type: value.trim() || null },
                  })
                }
              />
            ) : (
              <span>{label}</span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
