"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "./menu";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const MENU_WIDTH = 144;

/** A right-click menu at the pointer, rendered above the editor window. */
export default function ContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [refs] = useState(() => [menuRef]);
  useDismiss(refs, true, onClose);

  useEffect(() => {
    menuRef.current?.querySelector("button")?.focus();
  }, []);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={moveFocus}
      onContextMenu={(event) => event.preventDefault()}
      className="menu-surface fixed z-50 flex flex-col p-0.5"
      style={{
        left: Math.min(menu.x, window.innerWidth - MENU_WIDTH - 8),
        top: Math.min(menu.y, window.innerHeight - menu.items.length * 24 - 12),
        width: MENU_WIDTH,
      }}
    >
      {menu.items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className="menu-item"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
