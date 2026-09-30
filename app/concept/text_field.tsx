"use client";

import { type ComponentProps, type KeyboardEvent, useState } from "react";

interface TextFieldProps
  extends Omit<ComponentProps<"textarea">, "value" | "defaultValue"> {
  value: string;
  onCommit: (value: string) => void;
  /** Enter commits instead of inserting a line break. */
  singleLine?: boolean;
}

/**
 * An auto-growing text area that edits a local draft and commits once on blur,
 * so each edit becomes a single undo step.
 */
export function TextField({
  value,
  onCommit,
  singleLine,
  className,
  style,
  onBlur,
  onKeyDown,
  ...props
}: TextFieldProps) {
  const [draft, setDraft] = useState(value);
  const [committedValue, setCommittedValue] = useState(value);

  if (value !== committedValue) {
    setCommittedValue(value);
    setDraft(value);
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
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (draft !== value) {
            onCommit(draft);
          }
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </span>
  );
}
