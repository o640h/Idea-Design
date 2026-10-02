"use client";

import {
  Bookmark,
  createLucideIcon,
  RotateCcwClock,
  Search,
  Settings,
  Squircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isTyping } from "./keyboard";
import Menu from "./menu";

/** Lucide's Split without its arrowheads, as drawn in the Figma rail. */
const Lineage = createLucideIcon("lineage", [
  ["path", { d: "M12 22v-8.3a4 4 0 0 0-1.172-2.828L3 3", key: "stem" }],
  ["path", { d: "m15 9 6-6", key: "branch" }],
]);

/**
 * The Figma Compare icon, whose corners are rounder than Lucide's Copy, drawn
 * on Lucide's 2–22 grid so the stroke is not clipped at the edge.
 */
const Compare = createLucideIcon("compare", [
  [
    "path",
    {
      d: "M19.15 10.57h-5.72a2.85 2.85 0 0 0-2.86 2.86v5.72a2.85 2.85 0 0 0 2.86 2.85h5.72a2.85 2.85 0 0 0 2.85-2.85v-5.72a2.85 2.85 0 0 0-2.85-2.86Z",
      key: "front",
    },
  ],
  [
    "path",
    {
      d: "M4.85 13.43a2.85 2.85 0 0 1-2.85-2.86V4.85A2.85 2.85 0 0 1 4.85 2h5.72a2.85 2.85 0 0 1 2.86 2.85",
      key: "back",
    },
  ],
]);

/** The view shown beside the panel: the canvas, under Concepts, or Compare. */
export type EditorView = "canvas" | "compare";

/** Views after Concepts; those still to come keep their shortcuts reserved. */
const navigationItems = [
  { label: "Search", Icon: Search, key: "2" },
  { label: "Lineage", Icon: Lineage, key: "3" },
  { label: "Compare", Icon: Compare, key: "4" },
  { label: "Bookmarks", Icon: Bookmark, key: "5" },
  { label: "History", Icon: RotateCcwClock, key: "6" },
];

const railButtonClassName =
  "flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-idle) transition-colors enabled:hover:bg-(--surface-shell)";

const railIconProps = {
  "aria-hidden": true,
  size: 15,
  strokeWidth: 1.5,
  className: "text-(--text-rail)",
} as const;

function isMacPlatform() {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

/** False on the server, so the first render matches before the real value. */
function useIsMac() {
  return useSyncExternalStore(
    () => () => {},
    isMacPlatform,
    () => false,
  );
}

/** Names a rail view and its shortcut beside the rail. */
function RailItem({
  id,
  label,
  shortcut,
  available = true,
  children,
}: {
  id: string;
  label: string;
  shortcut: string;
  available?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="rail-item">
      {children}
      <span role="tooltip" id={id} className="rail-tooltip">
        <span>{label}</span>
        <kbd>{shortcut}</kbd>
        {!available && <span className="rail-tooltip-note">Coming Soon</span>}
      </span>
    </span>
  );
}

/**
 * The views beside the canvas and Settings, with their shortcuts: Alt plus
 * the view's number, and Ctrl or Cmd+, for Settings.
 */
export default function Rail({
  email,
  view,
  onViewChange,
  panelOpen,
  onTogglePanel,
}: {
  email: string | undefined;
  view: EditorView;
  onViewChange: (view: EditorView) => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const router = useRouter();
  const settingsRef = useRef<HTMLSpanElement>(null);
  const isMac = useIsMac();
  const shortcut = (key: string) => (isMac ? `⌥${key}` : `Alt+${key}`);
  // The open view's place in the rail, counting Concepts as the first.
  const openIndex =
    view === "compare"
      ? 1 + navigationItems.findIndex(({ label }) => label === "Compare")
      : 0;

  // Concepts returns to the canvas, then toggles the panel once there.
  const showConcepts = useCallback(
    () => (view === "canvas" ? onTogglePanel() : onViewChange("canvas")),
    [view, onTogglePanel, onViewChange],
  );
  const toggleCompare = useCallback(
    () => onViewChange(view === "compare" ? "canvas" : "compare"),
    [view, onViewChange],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      const command = isMacPlatform() ? event.metaKey : event.ctrlKey;
      const alt = event.altKey && !event.ctrlKey && !event.metaKey;

      if (alt && event.code === "Digit1") {
        event.preventDefault();
        showConcepts();
      } else if (alt && event.code === "Digit4") {
        event.preventDefault();
        toggleCompare();
      } else if (command && !event.altKey && event.key === ",") {
        event.preventDefault();
        settingsRef.current?.querySelector("button")?.click();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConcepts, toggleCompare]);

  return (
    <nav className="my-1.5 ml-1.5 flex w-10 shrink-0 flex-col rounded-lg bg-(--surface-rail) p-1 shadow-[inset_0_0_0_1px_var(--border-rail)]">
      <div className="relative flex flex-col gap-1">
        <span
          aria-hidden="true"
          className="rail-indicator"
          style={{ "--rail-index": openIndex } as CSSProperties}
        />
        <RailItem id="rail-concepts" label="Concepts" shortcut={shortcut("1")}>
          <button
            type="button"
            aria-label="Concepts"
            aria-describedby="rail-concepts"
            aria-keyshortcuts="Alt+1"
            aria-current={view === "canvas" ? "page" : undefined}
            aria-expanded={panelOpen}
            aria-controls="concepts-panel"
            onClick={showConcepts}
            className={railButtonClassName}
          >
            <Squircle {...railIconProps} />
          </button>
        </RailItem>
        {navigationItems.map(({ label, Icon, key }) => {
          const available = label === "Compare";

          return (
            <RailItem
              key={label}
              id={`rail-${key}`}
              label={label}
              shortcut={shortcut(key)}
              available={available}
            >
              <button
                type="button"
                aria-label={label}
                aria-describedby={`rail-${key}`}
                aria-keyshortcuts={`Alt+${key}`}
                aria-current={
                  available && view === "compare" ? "page" : undefined
                }
                disabled={!available}
                onClick={toggleCompare}
                className={railButtonClassName}
              >
                <Icon {...railIconProps} />
              </button>
            </RailItem>
          );
        })}
      </div>

      <span ref={settingsRef} className="mt-auto flex">
        <Menu
          label="Settings"
          above
          trigger={<Settings {...railIconProps} />}
          triggerClassName="settings-trigger flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-canvas)"
        >
          {() => (
            <>
              <p className="px-2 py-1.5 text-ui text-(--text-tertiary)">
                {email}
              </p>
              <button
                type="button"
                className="menu-item"
                onClick={async () => {
                  await createClient().auth.signOut();
                  router.replace("/sign-in");
                }}
              >
                Sign Out
              </button>
            </>
          )}
        </Menu>
      </span>
    </nav>
  );
}
