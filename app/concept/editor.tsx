"use client";

import Image from "next/image";

const navigationItems = [
  { label: "Concept", icon: "/icons/concept.svg", current: true, size: 12 },
  { label: "Search", icon: "/icons/search.svg", current: false, size: 12 },
  { label: "Lineage", icon: "/icons/lineage.svg", current: false, size: 12 },
  { label: "Compare", icon: "/icons/compare.svg", current: false, size: 12.8 },
  { label: "Bookmark", icon: "/icons/bookmark.svg", current: false, size: 12 },
  { label: "History", icon: "/icons/history.svg", current: false, size: 12 },
] as const;

export default function ConceptEditor() {
  return (
    <div className="editor-stage">
      <div className="editor-window">
        <header className="flex h-9 items-center border-b border-[var(--editor-header-border)] bg-[var(--editor-shell)] px-[9px]">
          <Image
            src="/icons/idea_design_logo.svg"
            alt="Idea Design"
            width={26.0088}
            height={4.33431}
            loading="eager"
          />
        </header>

        <div className="grid h-[calc(100%-36px)] grid-cols-[44px_minmax(0,1fr)] md:grid-cols-[160px_minmax(0,1fr)]">
          <aside
            className="relative bg-[var(--editor-shell)]"
            aria-label="Editor navigation"
          >
            <nav className="absolute inset-y-1.5 left-1.5 flex w-8 flex-col rounded-md border border-[var(--editor-rail-border)] bg-[var(--editor-rail)] p-0.5">
              <div className="flex flex-col gap-0.5">
                {navigationItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    aria-label={item.label}
                    aria-current={item.current ? "page" : undefined}
                    disabled={!item.current}
                    className={`grid size-[26px] place-items-center rounded-sm ${
                      item.current
                        ? "bg-[var(--editor-nav-active)]"
                        : "bg-[var(--editor-nav-idle)]"
                    }`}
                  >
                    <span className="grid size-3 place-items-center">
                      <Image
                        src={item.icon}
                        alt=""
                        width={item.size}
                        height={item.size}
                        loading="eager"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Settings"
                disabled
                className="mt-auto grid size-[26px] place-items-center rounded-sm bg-[var(--editor-canvas)]"
              >
                <span className="grid size-3 place-items-center">
                  <Image
                    src="/icons/settings.svg"
                    alt=""
                    width={12}
                    height={12}
                    loading="eager"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </nav>
          </aside>

          <main
            className="overflow-hidden rounded-tl-xl border-l border-[var(--editor-canvas-border)] bg-[var(--editor-canvas)]"
            aria-label="Concept editor"
          />
        </div>
      </div>
    </div>
  );
}
