"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** A small modal message; the editor behind it is made inert. */
export default function Notice({
  title,
  children,
  actions,
  onDismiss,
}: {
  title: string;
  children: ReactNode;
  /** Focus starts on the element marked `data-autofocus`, or the last action. */
  actions: ReactNode;
  /** Called on Escape; without it the message must be answered. */
  onDismiss?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>("[data-autofocus], button:last-of-type")
      ?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="notice-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && onDismiss) {
          event.stopPropagation();
          onDismiss();
        }
      }}
      className="menu-surface fixed top-1/2 left-1/2 z-50 flex w-72 -translate-1/2 flex-col gap-3 p-4"
    >
      <h2 id="notice-title" className="text-[13px] font-medium">
        {title}
      </h2>
      <div className="text-small leading-4 text-(--text-tertiary)">
        {children}
      </div>
      <div className="flex justify-end gap-1">{actions}</div>
    </div>
  );
}
