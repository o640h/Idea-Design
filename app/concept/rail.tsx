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
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { isTyping } from "./keyboard";
import Menu from "./menu";

/** Lucide's Split without its arrowheads, as drawn in the Figma rail. */
const Lineage = createLucideIcon("lineage", [
  ["path", { d: "M12 22v-8.3a4 4 0 0 0-1.172-2.828L3 3", key: "stem" }],
  ["path", { d: "m15 9 6-6", key: "branch" }],
]);

/** The Figma Compare icon, whose corners are rounder than Lucide's Copy. */
const Compare = createLucideIcon("compare", [
  [
    "path",
    {
      d: "M20.04 10.39h-6.43a3.21 3.21 0 0 0-3.22 3.22v6.43a3.21 3.21 0 0 0 3.22 3.21h6.43a3.21 3.21 0 0 0 3.21-3.21v-6.43a3.21 3.21 0 0 0-3.21-3.22Z",
      key: "front",
    },
  ],
  [
    "path",
    {
      d: "M3.96 13.61a3.21 3.21 0 0 1-3.21-3.22V3.96A3.21 3.21 0 0 1 3.96.75h6.43a3.21 3.21 0 0 1 3.22 3.21",
      key: "back",
    },
  ],
]);

/** Views after Concepts; those still to come keep their shortcuts reserved. */
const navigationItems = [
  { label: "Search", Icon: Search, key: "2" },
  { label: "Lineage", Icon: Lineage, key: "3" },
  { label: "Compare", Icon: Compare, key: "4" },
  { label: "Bookmarks", Icon: Bookmark, key: "5" },
  { label: "History", Icon: RotateCcwClock, key: "6" },
];

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
  panelOpen,
  onTogglePanel,
  compareOpen,
  onToggleCompare,
}: {
  email: string | undefined;
  panelOpen: boolean;
  onTogglePanel: () => void;
  compareOpen: boolean;
  onToggleCompare: () => void;
}) {
  const router = useRouter();
  const settingsRef = useRef<HTMLSpanElement>(null);
  const isMac = useIsMac();
  const shortcut = (key: string) => (isMac ? `⌥${key}` : `Alt+${key}`);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) {
        return;
      }

      const command = isMacPlatform() ? event.metaKey : event.ctrlKey;
      const alt = event.altKey && !event.ctrlKey && !event.metaKey;

      if (alt && event.code === "Digit1") {
        event.preventDefault();
        onTogglePanel();
      } else if (alt && event.code === "Digit4") {
        event.preventDefault();
        onToggleCompare();
      } else if (command && !event.altKey && event.key === ",") {
        event.preventDefault();
        settingsRef.current?.querySelector("button")?.click();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePanel, onToggleCompare]);

  return (
    <nav className="my-1.5 ml-1.5 flex w-10 shrink-0 flex-col rounded-lg bg-(--surface-rail) p-1 shadow-[inset_0_0_0_1px_var(--border-rail)]">
      <div className="flex flex-col gap-1">
        <RailItem id="rail-concepts" label="Concepts" shortcut={shortcut("1")}>
          <button
            type="button"
            aria-label="Concepts"
            aria-describedby="rail-concepts"
            aria-keyshortcuts="Alt+1"
            aria-expanded={panelOpen}
            aria-controls="concepts-panel"
            onClick={onTogglePanel}
            className="flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-shell)"
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
                aria-pressed={available ? compareOpen : undefined}
                disabled={!available}
                onClick={onToggleCompare}
                className="flex h-8 w-full shrink-0 items-center justify-center rounded-md bg-(--surface-idle) transition-colors enabled:hover:bg-(--surface-shell) aria-pressed:bg-(--surface-shell)"
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
