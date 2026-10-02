"use client";

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * Calls `onDismiss` on a press outside every ref, on Escape, or when the page
 * zooms or resizes under a fixed popover, while `active`.
 */
export function useDismiss(
  refs: RefObject<HTMLElement | null>[],
  active: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!active) {
      return;
    }

    function dismissOnOutsidePointer(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        !refs.some((ref) => ref.current?.contains(target))
      ) {
        onDismiss();
      }
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Captured on the window first, so only the popover closes and the
        // canvas or a focused node does not also react to Escape.
        event.stopPropagation();
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    window.addEventListener("keydown", dismissOnEscape, true);
    document.addEventListener("wheel", onDismiss, { passive: true });
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
      window.removeEventListener("keydown", dismissOnEscape, true);
      document.removeEventListener("wheel", onDismiss);
      window.removeEventListener("resize", onDismiss);
    };
  }, [refs, active, onDismiss]);
}

type Align = "start" | "center" | "end";

interface MenuProps {
  label: string;
  trigger: ReactNode;
  triggerClassName: string;
  /** Opens above the trigger instead of below it. */
  above?: boolean;
  align?: Align;
  onOpenChange?: (open: boolean) => void;
  children: (close: () => void) => ReactNode;
}

function popoverPosition(
  trigger: DOMRect,
  above: boolean,
  align: Align,
): CSSProperties {
  return {
    minWidth: trigger.width,
    ...(above
      ? { bottom: window.innerHeight - trigger.top + 8 }
      : { top: trigger.bottom + 6 }),
    ...(align === "end"
      ? { right: window.innerWidth - trigger.right }
      : {
          left:
            align === "center"
              ? trigger.left + trigger.width / 2
              : trigger.left,
          translate: align === "center" ? "-50% 0" : undefined,
        }),
  };
}

/**
 * A trigger button with a popover that closes on outside press or Escape.
 * The popover is portalled so canvas overlays and React Flow layers cannot
 * cover it.
 */
export default function Menu({
  label,
  trigger,
  triggerClassName,
  above = false,
  align = "start",
  onOpenChange,
  children,
}: MenuProps) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [refs] = useState(() => [triggerRef, popoverRef]);

  function close() {
    setPosition(null);
    onOpenChange?.(false);
  }

  useDismiss(refs, position !== null, close);

  // Flip above the trigger when the popover would run off the bottom edge.
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const trigger = triggerRef.current;

    if (
      position &&
      !above &&
      popover &&
      trigger &&
      popover.getBoundingClientRect().bottom > window.innerHeight - 8 &&
      position.top !== undefined
    ) {
      setPosition(
        popoverPosition(trigger.getBoundingClientRect(), true, align),
      );
    }
  }, [position, above, align]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={position !== null}
        onClick={(event) => {
          if (position) {
            close();
            return;
          }

          setPosition(
            popoverPosition(
              event.currentTarget.getBoundingClientRect(),
              above,
              align,
            ),
          );
          onOpenChange?.(true);
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {position &&
        createPortal(
          <div
            ref={popoverRef}
            className="menu-surface fixed z-50 flex flex-col p-0.5"
            style={position}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}

export function MenuDivider() {
  return <div className="my-0.5 border-t border-(--border)" />;
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <p className="eyebrow px-2.5 pt-1.5 pb-1">{children}</p>;
}
