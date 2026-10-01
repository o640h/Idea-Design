"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { ChevronDown, Plus, Redo, Undo } from "lucide-react";
import type { ReactNode } from "react";
import type { EditorAction } from "@/lib/concepts/editor";
import Menu from "./menu";

export type CanvasView = "canvas" | "outline";

export function animationDuration() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 250;
}

function ToolbarButton({
  label,
  children,
  disabled,
  pressed,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="flex h-5 items-center gap-1 rounded-sm px-1 text-[9px] font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40 disabled:hover:text-[var(--text-tertiary)] aria-pressed:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}

export default function BottomBar({
  view,
  onViewChange,
  onAdd,
  onFit,
  canUndo,
  canRedo,
  dispatch,
}: {
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  onAdd: () => void;
  onFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dispatch: (action: EditorAction) => void;
}) {
  const divider = <span aria-hidden="true" className="menu-divider" />;

  return (
    <div
      role="toolbar"
      aria-label="Canvas Tools"
      className="absolute bottom-[34px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 border-b border-[var(--border-underline)] px-1 pb-1.5"
    >
      {view === "canvas" && (
        <>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-5 items-center gap-1.5 rounded-md bg-[var(--surface-control)] px-2 text-[9px] font-medium text-[var(--text-tertiary)] transition-[color,background-color,translate,scale,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--surface-active)] hover:text-[var(--text-primary)] motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[0_3px_8px_rgb(0_0_0/0.35)] motion-safe:active:translate-y-0 motion-safe:active:scale-[0.96] motion-safe:active:shadow-none motion-safe:active:duration-75"
          >
            <Plus aria-hidden="true" size={8} strokeWidth={1.5} />
            Add
          </button>
          {divider}
        </>
      )}

      <ToolbarButton
        label="Undo"
        disabled={!canUndo}
        onClick={() => dispatch({ type: "history/undo" })}
      >
        <Undo aria-hidden="true" size={14} strokeWidth={1.25} />
      </ToolbarButton>
      {divider}
      <ToolbarButton
        label="Redo"
        disabled={!canRedo}
        onClick={() => dispatch({ type: "history/redo" })}
      >
        <Redo aria-hidden="true" size={14} strokeWidth={1.25} />
      </ToolbarButton>
      {divider}

      {view === "canvas" && (
        <>
          <ToolbarButton label="Fit to Content" onClick={onFit}>
            Fit
          </ToolbarButton>
          <ZoomMenu />
          {divider}
        </>
      )}

      <ToolbarButton
        label="Outline"
        pressed={view === "outline"}
        onClick={() => onViewChange(view === "outline" ? "canvas" : "outline")}
      >
        Outline
      </ToolbarButton>
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
          <ChevronDown aria-hidden="true" size={8} />
        </>
      }
      triggerClassName="flex h-5 items-center gap-0.5 text-[8px] font-medium text-[var(--text-tertiary)] tabular-nums transition-colors hover:text-[var(--text-primary)]"
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
