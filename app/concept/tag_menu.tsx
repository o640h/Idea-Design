"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { normaliseTag, SUGGESTED_TAGS } from "@/lib/concepts/model";
import Menu from "./menu";

const suggestedTags: readonly string[] = SUGGESTED_TAGS;

function formatTag(tag: string) {
  return tag.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function TagMenu({
  tag,
  onChange,
  triggerClassName,
}: {
  tag: string | null;
  onChange: (tag: string | null) => void;
  triggerClassName: string;
}) {
  const [customTag, setCustomTag] = useState("");
  const options: (string | null)[] = [
    null,
    ...suggestedTags,
    ...(tag && !suggestedTags.includes(tag) ? [tag] : []),
  ];

  return (
    <Menu
      label={`Tag, ${tag ? formatTag(tag) : "None"}`}
      trigger={
        <>
          <span className="max-w-32 truncate">
            {tag ? formatTag(tag) : "Tag"}
          </span>
          <ChevronDown aria-hidden="true" size={10} />
        </>
      }
      triggerClassName={triggerClassName}
    >
      {(close) => (
        <>
          {options.map((option) => (
            <button
              key={option ?? "none"}
              type="button"
              aria-pressed={option === tag}
              className="menu-item justify-between"
              onClick={() => {
                onChange(option);
                close();
              }}
            >
              {option ? formatTag(option) : "No Tag"}
              {option === tag && <Check aria-hidden="true" size={10} />}
            </button>
          ))}
          <input
            aria-label="Custom Tag"
            placeholder="Custom Tag"
            value={customTag}
            onChange={(event) => setCustomTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && normaliseTag(customTag)) {
                event.preventDefault();
                onChange(normaliseTag(customTag));
                setCustomTag("");
                close();
              }
            }}
            className="mt-0.5 h-6 w-28 border-t border-[var(--border)] bg-transparent px-2 text-[10px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-placeholder)]"
          />
        </>
      )}
    </Menu>
  );
}
