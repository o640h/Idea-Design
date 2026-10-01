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
  NodeResizeControl,
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
import type { EditorDispatch } from "@/lib/concepts/editor";
import {
  type ComponentId,
  type ComponentLayout,
  type ComponentTextField,
  type ConceptComponent,
  type ConceptRelationship,
  relationshipKind,
  type TextFormat,
} from "@/lib/concepts/model";
import Menu from "./menu";
import TagMenu from "./tag_menu";
import { TextField } from "./text_field";

const FONT_SIZES = [11, 13, 16, 20, 24, 32];
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
    /** Set by resizing; otherwise the block fits its text. */
    fixedWidth: boolean;
    minHeight?: number;
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
  dispatch: EditorDispatch;
  stopEditing: (id: ComponentId) => void;
  commitField: (
    id: ComponentId,
    field: ComponentTextField,
    value: string,
    continuing: boolean,
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
        commitWhileTyping
        value={component.title}
        onFocus={() => onFocusField("title")}
        onCommit={(value, continuing) =>
          commitField(component.id, "title", value, continuing)
        }
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
        commitWhileTyping
        value={component.description}
        onFocus={() => onFocusField("description")}
        onCommit={(value, continuing) =>
          commitField(component.id, "description", value, continuing)
        }
      />
    </fieldset>
  );
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/** Previews each option on hover or focus and applies it on click. */
function FormatMenu({
  label,
  value,
  options,
  onFormat,
  onPreview,
}: {
  label: string;
  value: string;
  options: { label: string; changes: Partial<TextFormat>; selected: boolean }[];
  onFormat: (changes: Partial<TextFormat>) => void;
  onPreview: (format: Partial<TextFormat> | null) => void;
}) {
  return (
    <Menu
      label={`${label}, ${value}`}
      trigger={
        <>
          {value}
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
        options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={option.selected}
            className="menu-item tabular-nums"
            onPointerEnter={() => onPreview(option.changes)}
            onPointerLeave={() => onPreview(null)}
            onFocus={() => onPreview(option.changes)}
            onBlur={() => onPreview(null)}
            onClick={() => {
              onFormat(option.changes);
              close();
            }}
          >
            {option.label}
          </button>
        ))
      }
    </Menu>
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
      <FormatMenu
        label="Text Size"
        value={String(format.fontSize)}
        options={FONT_SIZES.map((fontSize) => ({
          label: String(fontSize),
          changes: { fontSize },
          selected: fontSize === format.fontSize,
        }))}
        onFormat={onFormat}
        onPreview={onPreview}
      />
      <span aria-hidden="true" className="format-divider" />
      <FormatMenu
        label="Font Weight"
        value={
          FONT_WEIGHTS.find(({ value }) => value === format.fontWeight)
            ?.label ?? ""
        }
        options={FONT_WEIGHTS.map(({ label, value }) => ({
          label,
          changes: { fontWeight: value },
          selected: value === format.fontWeight,
        }))}
        onFormat={onFormat}
        onPreview={onPreview}
      />
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
      <FormatMenu
        label="Text Opacity"
        value={percent(format.opacity)}
        options={TEXT_OPACITIES.map((opacity) => ({
          label: percent(opacity),
          changes: { opacity },
          selected: opacity === format.opacity,
        }))}
        onFormat={onFormat}
        onPreview={onPreview}
      />
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
  data: { component, formats, fixedWidth, minHeight, editing, draft },
  selected,
  dragging,
  width,
}: NodeProps<BlockNodeType>) {
  const { dispatch } = useCanvasActions();
  const [field, setField] = useState<ComponentTextField>("title");
  const [preview, setPreview] = useState<Partial<TextFormat> | null>(null);
  const [resizing, setResizing] = useState(false);
  const shownFormats =
    preview === null
      ? formats
      : { ...formats, [field]: { ...formats[field], ...preview } };

  return (
    <div
      className={`concept-block writing-underline${selected ? " is-selected" : ""}`}
      data-fixed-width={fixedWidth || resizing || undefined}
      data-resizing={resizing || undefined}
      style={{ fontSize: shownFormats.title.fontSize, minHeight }}
    >
      {(selected || editing) && !draft && !dragging && (
        <NodeResizeControl
          position="bottom-right"
          minWidth={96}
          minHeight={36}
          className="block-resize nodrag"
          onResizeStart={() => setResizing(true)}
          onResizeEnd={(_, { width, height }) => {
            setResizing(false);
            dispatch({
              type: "component/resize",
              id,
              width: Math.round(width),
              height: Math.round(height),
            });
          }}
        ></NodeResizeControl>
      )}
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
          onFocusField={setField}
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
          onTagChange={(tag) => dispatch({ type: "component/tag", id, tag })}
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
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={16}
        className={`edge-kind-${relationshipKind(label ?? null) ?? "default"}`}
      />
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
                    field: "type",
                    value: value.trim() || null,
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
