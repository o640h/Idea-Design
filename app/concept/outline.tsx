"use client";

import { ArrowRight, Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { EditorDispatch } from "@/lib/concepts/editor";
import {
  type ComponentId,
  type ConceptComponent,
  type ConceptRelationship,
  createComponent,
  createComponentLayout,
  type EditableConcept,
} from "@/lib/concepts/model";
import TagMenu from "./tag_menu";
import { TextField } from "./text_field";

interface ConceptOutlineProps {
  editable: EditableConcept;
  dispatch: EditorDispatch;
  header: ReactNode;
}

/** A keyboard-first view of the same concept content shown on the canvas. */
export default function ConceptOutline({
  editable: { concept, componentLayouts },
  dispatch,
  header,
}: ConceptOutlineProps) {
  const [newComponentId, setNewComponentId] = useState<ComponentId | null>(
    null,
  );
  const titles = new Map(
    concept.components.map((component) => [
      component.id,
      component.title || "Untitled",
    ]),
  );

  function addComponent() {
    const id = crypto.randomUUID();
    // The first one starts below the canvas header, with its text in line
    // with the title, as a new concept's canvas first shows it.
    const position = componentLayouts.length
      ? {
          x: Math.min(...componentLayouts.map((layout) => layout.x)),
          y: Math.max(...componentLayouts.map((layout) => layout.y)) + 120,
        }
      : { x: 28, y: 120 };

    dispatch({
      type: "component/create",
      component: createComponent(id),
      layout: createComponentLayout(id, position),
    });
    setNewComponentId(id);
  }

  return (
    <section
      aria-label="Concept Outline"
      className="h-full overflow-y-auto px-10 pt-6 pb-28"
    >
      {header}
      <TextField
        aria-label="Concept Description"
        placeholder="Describe the idea"
        className="mt-3 max-w-xl text-[11.5px] leading-4 text-(--text-secondary)"
        commitWhileTyping
        value={concept.description}
        onCommit={(value, continuing) =>
          dispatch(
            { type: "concept/update", field: "description", value },
            { continuing },
          )
        }
      />

      <ol className="mt-8 flex max-w-xl flex-col gap-6">
        {concept.components.map((component) => (
          <li key={component.id}>
            <OutlineItem
              component={component}
              outgoing={concept.relationships.filter(
                (relationship) =>
                  relationship.sourceComponentId === component.id,
              )}
              titles={titles}
              dispatch={dispatch}
              focusOnMount={component.id === newComponentId}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="menu-item mt-6 -ml-2"
        onClick={addComponent}
      >
        <Plus aria-hidden="true" size={10} />
        Add Component
      </button>
    </section>
  );
}

function OutlineItem({
  component,
  outgoing,
  titles,
  dispatch,
  focusOnMount,
}: {
  component: ConceptComponent;
  outgoing: ConceptRelationship[];
  titles: Map<ComponentId, string>;
  dispatch: EditorDispatch;
  focusOnMount: boolean;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const connectableIds = [...titles.keys()].filter(
    (id) =>
      id !== component.id &&
      !outgoing.some((relationship) => relationship.targetComponentId === id),
  );

  useEffect(() => {
    if (focusOnMount) {
      titleRef.current?.focus();
    }
  }, [focusOnMount]);

  return (
    <article
      aria-label={titles.get(component.id)}
      className="flex flex-col gap-1.5 border-l border-(--border) pl-3"
    >
      <div className="-ml-2 flex items-center">
        <TagMenu
          tag={component.tag}
          triggerClassName="menu-item"
          onChange={(tag) =>
            dispatch({ type: "component/tag", id: component.id, tag })
          }
        />
        <button
          type="button"
          className="menu-item ml-auto"
          onClick={() =>
            dispatch({ type: "component/delete", id: component.id })
          }
        >
          Remove
        </button>
      </div>

      <TextField
        ref={titleRef}
        singleLine
        aria-label="Title"
        placeholder="Untitled"
        className="text-[13px] leading-4.25 text-(--text-primary)"
        commitWhileTyping
        value={component.title}
        onCommit={(value, continuing) =>
          dispatch(
            {
              type: "component/update",
              id: component.id,
              field: "title",
              value,
            },
            { continuing },
          )
        }
      />
      <TextField
        aria-label="Description"
        placeholder="Add detail"
        className="text-small leading-3.5 text-(--text-secondary)"
        commitWhileTyping
        value={component.description}
        onCommit={(value, continuing) =>
          dispatch(
            {
              type: "component/update",
              id: component.id,
              field: "description",
              value,
            },
            { continuing },
          )
        }
      />

      {outgoing.length > 0 && (
        <ul aria-label="Connections" className="mt-1 flex flex-col gap-1">
          {outgoing.map((relationship) => (
            <li
              key={relationship.id}
              className="flex items-center gap-2 text-small text-(--text-tertiary)"
            >
              <ArrowRight aria-hidden="true" size={10} />
              <span className="text-(--text-secondary)">
                {titles.get(relationship.targetComponentId)}
              </span>
              <TextField
                singleLine
                aria-label={`Label for connection to ${titles.get(
                  relationship.targetComponentId,
                )}`}
                placeholder="Add Label"
                className="min-w-16"
                value={relationship.type ?? ""}
                onCommit={(value) =>
                  dispatch({
                    type: "relationship/update",
                    id: relationship.id,
                    field: "type",
                    value: value.trim() || null,
                  })
                }
              />
              <button
                type="button"
                className="menu-item ml-auto"
                onClick={() =>
                  dispatch({ type: "relationship/unlink", id: relationship.id })
                }
              >
                Remove Connection
              </button>
            </li>
          ))}
        </ul>
      )}

      {connectableIds.length > 0 && (
        <select
          aria-label="Connect To"
          value=""
          onChange={(event) =>
            dispatch({
              type: "relationship/link",
              relationship: {
                id: crypto.randomUUID(),
                sourceComponentId: component.id,
                targetComponentId: event.target.value,
                type: null,
              },
            })
          }
          className="menu-item -ml-2 w-fit appearance-none bg-transparent"
        >
          <option value="" disabled>
            Connect To…
          </option>
          {connectableIds.map((id) => (
            <option key={id} value={id}>
              {titles.get(id)}
            </option>
          ))}
        </select>
      )}
    </article>
  );
}
