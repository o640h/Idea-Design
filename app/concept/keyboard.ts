import type { EditorAction } from "@/lib/concepts/editor";

/** Shortcuts are left to fields while someone is typing in one. */
export function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable]"))
  );
}

/** Undo for Ctrl or Cmd+Z; redo for Ctrl or Cmd+Y or with Shift. */
export function historyShortcut(
  event: KeyboardEvent,
): Extract<EditorAction, { type: "history/undo" | "history/redo" }> | null {
  const key = event.key.toLowerCase();

  if (!(event.metaKey || event.ctrlKey) || (key !== "z" && key !== "y")) {
    return null;
  }

  return {
    type: key === "y" || event.shiftKey ? "history/redo" : "history/undo",
  };
}
