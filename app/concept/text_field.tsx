"use client";

import {
  type ComponentProps,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

const TYPING_PAUSE_MS = 400;

interface TextFieldProps
  extends Omit<ComponentProps<"textarea">, "value" | "defaultValue"> {
  value: string;
  /** `continuing` is true for each commit after the first during one focus. */
  onCommit: (value: string, continuing: boolean) => void;
  /** Enter commits instead of inserting a line break. */
  singleLine?: boolean;
  /** Also commits after a pause in typing, so unfinished text is saved. */
  commitWhileTyping?: boolean;
}

/**
 * An auto-growing text area that edits a local draft and commits it on blur,
 * and optionally while typing. Callers can merge the commits from one focus
 * into a single undo step.
 */
export function TextField({
  value,
  onCommit,
  singleLine,
  commitWhileTyping,
  className,
  style,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: TextFieldProps) {
  const [draft, setDraft] = useState(value);
  const [committedValue, setCommittedValue] = useState(value);
  const pauseTimer = useRef<number>(undefined);
  const committedSinceFocus = useRef(false);

  if (value !== committedValue) {
    setCommittedValue(value);
    setDraft(value);
  }

  useEffect(() => () => window.clearTimeout(pauseTimer.current), []);

  function commit(next: string) {
    window.clearTimeout(pauseTimer.current);

    if (next !== value) {
      onCommit(next, committedSinceFocus.current);
      committedSinceFocus.current = true;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    const commitsOnEnter =
      event.key === "Enter" &&
      (singleLine ? !event.shiftKey : event.metaKey || event.ctrlKey);

    if (event.key === "Escape" || commitsOnEnter) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <span
      className={`text-field ${className ?? ""}`}
      style={style}
      data-value={draft || props.placeholder}
    >
      <textarea
        rows={1}
        cols={1}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);

          if (commitWhileTyping) {
            window.clearTimeout(pauseTimer.current);
            // Rendering the commit at once stops a keystroke landing before
            // the committed value comes back and replaces the newer draft.
            pauseTimer.current = window.setTimeout(
              () => flushSync(() => commit(next)),
              TYPING_PAUSE_MS,
            );
          }
        }}
        onFocus={(event) => {
          committedSinceFocus.current = false;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          commit(draft);
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </span>
  );
}
