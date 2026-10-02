"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { ChevronDown, Plus, Redo, Undo } from "lucide-react";
import type { ReactNode } from "react";
import type { EditorAction } from "@/lib/concepts/editor";
import { EXPLORE_TOOLS, type ExploreTool } from "./explore";
import Menu from "./menu";

export type CanvasView = "canvas" | "outline";

export function animationDuration() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 250;
}

function ToolbarButton({
  label,
  hint,
  children,
  disabled,
  pressed,
  onClick,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={hint}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 items-center gap-1 rounded-sm px-1.5 text-ui font-medium text-(--text-tertiary) transition-colors hover:text-(--text-primary) disabled:opacity-40 disabled:hover:text-(--text-tertiary) aria-pressed:text-(--text-primary)"
    >
      {children}
    </button>
  );
}

/** Canvas tools; while exploring, the explore tools replace adding and the outline. */
export default function BottomBar({
  view,
  onViewChange,
  onAdd,
  onExplore,
  explore,
  onFit,
  canUndo,
  canRedo,
  dispatch,
}: {
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  onAdd: () => void;
  /** Null while no component is selected. */
  onExplore: (() => void) | null;
  explore: {
    onTool: (tool: ExploreTool) => void;
    /** False once the component explored from is gone from its branch. */
    available: boolean;
  } | null;
  onFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dispatch: (action: EditorAction) => void;
}) {
  const divider = <span aria-hidden="true" className="menu-divider" />;

  return (
    <div
      role="toolbar"
      aria-label={explore ? "Explore Tools" : "Canvas Tools"}
      className="absolute bottom-8.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 border-b border-(--border-underline) px-1 pb-2"
    >
      {explore && (
        <>
          {EXPLORE_TOOLS.map(({ tool, label, hint }) => (
            <ToolbarButton
              key={tool}
              label={label}
              hint={hint}
              disabled={!explore.available}
              onClick={() => explore.onTool(tool)}
            >
              {label}
            </ToolbarButton>
          ))}
          {divider}
        </>
      )}

      {!explore && view === "canvas" && (
        <>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-6 items-center gap-1.5 rounded-md bg-(--surface-control) px-2.5 text-ui font-medium text-(--text-tertiary) transition-[color,background-color,translate,scale,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-(--surface-active) hover:text-(--text-primary) motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[0_3px_8px_rgb(0_0_0/0.35)] motion-safe:active:translate-y-0 motion-safe:active:scale-[0.96] motion-safe:active:shadow-none motion-safe:active:duration-75"
          >
            <Plus aria-hidden="true" size={10} strokeWidth={1.5} />
            Add
          </button>
          <ToolbarButton
            label="Explore"
            hint={
              onExplore
                ? "Explore alternatives to the selected component (E)"
                : "Select a component to explore from it"
            }
            disabled={!onExplore}
            onClick={() => onExplore?.()}
          >
            Explore
          </ToolbarButton>
          {divider}
        </>
      )}

      <ToolbarButton
        label="Undo"
        disabled={!canUndo}
        onClick={() => dispatch({ type: "history/undo" })}
      >
        <Undo aria-hidden="true" size={16} strokeWidth={1.25} />
      </ToolbarButton>
      {divider}
      <ToolbarButton
        label="Redo"
        disabled={!canRedo}
        onClick={() => dispatch({ type: "history/redo" })}
      >
        <Redo aria-hidden="true" size={16} strokeWidth={1.25} />
      </ToolbarButton>
      {divider}

      {view === "canvas" && (
        <>
          <ToolbarButton label="Fit to Content" onClick={onFit}>
            Fit
          </ToolbarButton>
          <ZoomMenu />
        </>
      )}

      {!explore && (
        <>
          {view === "canvas" && divider}
          <ToolbarButton
            label="Outline"
            pressed={view === "outline"}
            onClick={() =>
              onViewChange(view === "outline" ? "canvas" : "outline")
            }
          >
            Outline
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

const ZOOM_LEVELS = [50, 75, 100, 150, 200];

function ZoomMenu() {
  const zoom = Math.round(useStore((store) => store.transform[2]) * 100);
  const { zoomTo } = useReactFlow();

  return (
    <Menu
      label={`Zoom, ${zoom}%`}
      above
      align="center"
      trigger={
        <>
          {zoom}%
          <ChevronDown aria-hidden="true" size={10} />
        </>
      }
      triggerClassName="flex h-6 items-center gap-0.5 text-ui font-medium text-(--text-tertiary) tabular-nums transition-colors hover:text-(--text-primary)"
    >
      {(close) =>
        ZOOM_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={level === zoom}
            className="menu-item w-14 justify-center tabular-nums"
            onClick={() => {
              zoomTo(level / 100, { duration: animationDuration() });
              close();
            }}
          >
            {level}%
          </button>
        ))
      }
    </Menu>
  );
}
