import type {
  ComponentId,
  ComponentLayout,
  ComponentTextField,
  ConceptComponent,
  ConceptRelationship,
  EditableConcept,
  RelationshipId,
  TextFormat,
} from "./model";

/**
 * One recorded change to a concept. Each operation sets a single field or
 * creates or deletes a single item, so concurrent edits resolve per field.
 * Deleting a component also removes its relationships and un-nests its
 * children, and its inverse restores them.
 *
 * An operation whose target no longer exists, or that would change nothing,
 * does nothing. Replaying the same log therefore gives the same concept even
 * when another tab deleted something first.
 */
export type Operation =
  | { type: "concept/update"; field: "title" | "description"; value: string }
  | {
      type: "component/create";
      component: ConceptComponent;
      layout: ComponentLayout;
    }
  | {
      type: "component/update";
      id: ComponentId;
      field: ComponentTextField;
      value: string;
    }
  | { type: "component/tag"; id: ComponentId; tag: string | null }
  | { type: "component/nest"; id: ComponentId; parentId: ComponentId | null }
  | {
      type: "component/move";
      id: ComponentId;
      position: Pick<ComponentLayout, "x" | "y">;
    }
  /** A null width or height returns that dimension to fitting the text. */
  | {
      type: "component/resize";
      id: ComponentId;
      width: number | null;
      height: number | null;
    }
  | {
      type: "component/format";
      id: ComponentId;
      field: ComponentTextField;
      changes: Partial<TextFormat>;
    }
  | { type: "component/delete"; id: ComponentId }
  | { type: "relationship/link"; relationship: ConceptRelationship }
  | {
      type: "relationship/update";
      id: RelationshipId;
      field: "type";
      value: string | null;
    }
  | { type: "relationship/unlink"; id: RelationshipId };

interface Applied {
  document: EditableConcept;
  /** Operations that restore the document as it was before. */
  inverse: Operation[];
}

function replaceComponent(
  document: EditableConcept,
  component: ConceptComponent,
): EditableConcept {
  return {
    ...document,
    concept: {
      ...document.concept,
      components: document.concept.components.map((candidate) =>
        candidate.id === component.id ? component : candidate,
      ),
    },
  };
}

function replaceLayout(
  document: EditableConcept,
  layout: ComponentLayout,
): EditableConcept {
  return {
    ...document,
    componentLayouts: document.componentLayouts.map((candidate) =>
      candidate.componentId === layout.componentId ? layout : candidate,
    ),
  };
}

export function applyOperation(
  document: EditableConcept,
  operation: Operation,
): Applied {
  const { concept, componentLayouts } = document;
  const unchanged: Applied = { document, inverse: [] };

  switch (operation.type) {
    case "concept/update": {
      const previous = concept[operation.field];

      if (previous === operation.value) {
        return unchanged;
      }

      return {
        document: {
          ...document,
          concept: { ...concept, [operation.field]: operation.value },
        },
        inverse: [{ ...operation, value: previous }],
      };
    }

    case "component/create": {
      const { component, layout } = operation;

      if (concept.components.some(({ id }) => id === component.id)) {
        return unchanged;
      }

      return {
        document: {
          concept: {
            ...concept,
            components: [...concept.components, component],
          },
          componentLayouts: [...componentLayouts, layout],
        },
        inverse: [{ type: "component/delete", id: component.id }],
      };
    }

    case "component/update": {
      const component = concept.components.find(
        ({ id }) => id === operation.id,
      );

      if (!component || component[operation.field] === operation.value) {
        return unchanged;
      }

      return {
        document: replaceComponent(document, {
          ...component,
          [operation.field]: operation.value,
        }),
        inverse: [{ ...operation, value: component[operation.field] }],
      };
    }

    case "component/tag": {
      const component = concept.components.find(
        ({ id }) => id === operation.id,
      );

      if (!component || component.tag === operation.tag) {
        return unchanged;
      }

      return {
        document: replaceComponent(document, {
          ...component,
          tag: operation.tag,
        }),
        inverse: [{ ...operation, tag: component.tag }],
      };
    }

    case "component/nest": {
      const component = concept.components.find(
        ({ id }) => id === operation.id,
      );
      const parentExists =
        operation.parentId === null ||
        concept.components.some(({ id }) => id === operation.parentId);

      if (
        !component ||
        !parentExists ||
        component.parentId === operation.parentId
      ) {
        return unchanged;
      }

      return {
        document: replaceComponent(document, {
          ...component,
          parentId: operation.parentId,
        }),
        inverse: [{ ...operation, parentId: component.parentId }],
      };
    }

    case "component/move": {
      const layout = componentLayouts.find(
        ({ componentId }) => componentId === operation.id,
      );
      const { x, y } = operation.position;

      if (!layout || (layout.x === x && layout.y === y)) {
        return unchanged;
      }

      return {
        document: replaceLayout(document, { ...layout, x, y }),
        inverse: [{ ...operation, position: { x: layout.x, y: layout.y } }],
      };
    }

    case "component/resize": {
      const layout = componentLayouts.find(
        ({ componentId }) => componentId === operation.id,
      );
      const width = layout?.width ?? null;
      const height = layout?.height ?? null;

      if (
        !layout ||
        (width === operation.width && height === operation.height)
      ) {
        return unchanged;
      }

      return {
        document: replaceLayout(document, {
          ...layout,
          width: operation.width ?? undefined,
          height: operation.height ?? undefined,
        }),
        inverse: [{ ...operation, width, height }],
      };
    }

    case "component/format": {
      const layout = componentLayouts.find(
        ({ componentId }) => componentId === operation.id,
      );

      if (!layout) {
        return unchanged;
      }

      const format = layout.formats[operation.field];
      const keys = Object.keys(operation.changes) as (keyof TextFormat)[];

      if (keys.every((key) => format[key] === operation.changes[key])) {
        return unchanged;
      }

      return {
        document: replaceLayout(document, {
          ...layout,
          formats: {
            ...layout.formats,
            [operation.field]: { ...format, ...operation.changes },
          },
        }),
        inverse: [
          {
            ...operation,
            changes: Object.fromEntries(keys.map((key) => [key, format[key]])),
          },
        ],
      };
    }

    case "component/delete": {
      const component = concept.components.find(
        ({ id }) => id === operation.id,
      );
      const layout = componentLayouts.find(
        ({ componentId }) => componentId === operation.id,
      );

      if (!component || !layout) {
        return unchanged;
      }

      const isRemoved = (relationship: ConceptRelationship) =>
        relationship.sourceComponentId === operation.id ||
        relationship.targetComponentId === operation.id;
      const children = concept.components.filter(
        ({ parentId }) => parentId === operation.id,
      );

      return {
        document: {
          concept: {
            ...concept,
            components: concept.components
              .filter(({ id }) => id !== operation.id)
              .map((candidate) =>
                candidate.parentId === operation.id
                  ? { ...candidate, parentId: null }
                  : candidate,
              ),
            relationships: concept.relationships.filter(
              (relationship) => !isRemoved(relationship),
            ),
          },
          componentLayouts: componentLayouts.filter(
            (candidate) => candidate !== layout,
          ),
        },
        inverse: [
          { type: "component/create", component, layout },
          ...concept.relationships.filter(isRemoved).map(
            (relationship): Operation => ({
              type: "relationship/link",
              relationship,
            }),
          ),
          ...children.map(
            (child): Operation => ({
              type: "component/nest",
              id: child.id,
              parentId: operation.id,
            }),
          ),
        ],
      };
    }

    case "relationship/link": {
      const { relationship } = operation;
      const componentIds = new Set(concept.components.map(({ id }) => id));

      if (
        !componentIds.has(relationship.sourceComponentId) ||
        !componentIds.has(relationship.targetComponentId) ||
        concept.relationships.some(({ id }) => id === relationship.id)
      ) {
        return unchanged;
      }

      return {
        document: {
          ...document,
          concept: {
            ...concept,
            relationships: [...concept.relationships, relationship],
          },
        },
        inverse: [{ type: "relationship/unlink", id: relationship.id }],
      };
    }

    case "relationship/update": {
      const relationship = concept.relationships.find(
        ({ id }) => id === operation.id,
      );

      if (!relationship || relationship.type === operation.value) {
        return unchanged;
      }

      return {
        document: {
          ...document,
          concept: {
            ...concept,
            relationships: concept.relationships.map((candidate) =>
              candidate === relationship
                ? { ...relationship, type: operation.value }
                : candidate,
            ),
          },
        },
        inverse: [{ ...operation, value: relationship.type }],
      };
    }

    case "relationship/unlink": {
      const relationship = concept.relationships.find(
        ({ id }) => id === operation.id,
      );

      if (!relationship) {
        return unchanged;
      }

      return {
        document: {
          ...document,
          concept: {
            ...concept,
            relationships: concept.relationships.filter(
              (candidate) => candidate !== relationship,
            ),
          },
        },
        inverse: [{ type: "relationship/link", relationship }],
      };
    }
  }
}

/** Applies operations in order; replaying a log from a snapshot is one call. */
export function applyOperations(
  document: EditableConcept,
  operations: Operation[],
): Applied {
  const inverses: Operation[][] = [];

  for (const operation of operations) {
    const applied = applyOperation(document, operation);
    document = applied.document;
    inverses.push(applied.inverse);
  }

  return { document, inverse: inverses.reverse().flat() };
}

/**
 * Folds a text edit into the change before it when that change set the same
 * field or created the same component, so a typing session is one operation.
 * Returns null when the edit must start a change of its own.
 */
export function coalesce(
  change: Operation[],
  edit: Operation,
): Operation[] | null {
  const [previous] = change;

  if (change.length !== 1) {
    return null;
  }

  if (edit.type === "concept/update") {
    return previous.type === "concept/update" && previous.field === edit.field
      ? [edit]
      : null;
  }

  if (edit.type !== "component/update") {
    return null;
  }

  if (
    previous.type === "component/update" &&
    previous.id === edit.id &&
    previous.field === edit.field
  ) {
    return [edit];
  }

  if (
    previous.type === "component/create" &&
    previous.component.id === edit.id
  ) {
    return [
      {
        ...previous,
        component: { ...previous.component, [edit.field]: edit.value },
      },
    ];
  }

  return null;
}
