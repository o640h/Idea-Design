import type {
  ComponentId,
  ConceptRelationship,
  EditableConcept,
} from "./model";
import { relationshipKind } from "./model";
import type { Operation } from "./operations";

/** One item compared by ID: what it was and what it became. */
export type Difference<T, F extends keyof T> =
  | { status: "added"; id: string; after: T }
  | { status: "removed"; id: string; before: T }
  | { status: "changed"; id: string; before: T; after: T; fields: F[] }
  | { status: "unchanged"; id: string; before: T; after: T };

export type ComponentField = "title" | "description" | "tag" | "parentId";
export type RelationshipField =
  | "sourceComponentId"
  | "targetComponentId"
  | "type";

const COMPONENT_FIELDS: ComponentField[] = [
  "title",
  "description",
  "tag",
  "parentId",
];
const RELATIONSHIP_FIELDS: RelationshipField[] = [
  "sourceComponentId",
  "targetComponentId",
  "type",
];

/** In the order of `after`, then what was removed in the order of `before`. */
function compareItems<T extends { id: string }, F extends keyof T>(
  before: T[],
  after: T[],
  fields: F[],
): Difference<T, F>[] {
  const previous = new Map(before.map((item) => [item.id, item]));
  const current = new Set(after.map(({ id }) => id));
  const differences = after.map((item): Difference<T, F> => {
    const old = previous.get(item.id);

    if (!old) {
      return { status: "added", id: item.id, after: item };
    }

    const changed = fields.filter((field) => old[field] !== item[field]);

    return changed.length
      ? {
          status: "changed",
          id: item.id,
          before: old,
          after: item,
          fields: changed,
        }
      : { status: "unchanged", id: item.id, before: old, after: item };
  });

  return [
    ...differences,
    ...before
      .filter(({ id }) => !current.has(id))
      .map(
        (item): Difference<T, F> => ({
          status: "removed",
          id: item.id,
          before: item,
        }),
      ),
  ];
}

/**
 * How `after` differs from `before`, matching components and connections by
 * ID. Layout is ignored, so moving or restyling a component changes nothing.
 */
export function compareConcepts(
  before: EditableConcept,
  after: EditableConcept,
) {
  return {
    components: compareItems(
      before.concept.components,
      after.concept.components,
      COMPONENT_FIELDS,
    ),
    relationships: compareItems(
      before.concept.relationships,
      after.concept.relationships,
      RELATIONSHIP_FIELDS,
    ),
  };
}

/** Whether anything other than layout differs between two states. */
export function hasDifferences(
  before: EditableConcept,
  after: EditableConcept,
) {
  const { components, relationships } = compareConcepts(before, after);
  return [...components, ...relationships].some(
    ({ status }) => status !== "unchanged",
  );
}

/** How components differ from an earlier state, matched by ID. Layout is ignored. */
interface ComponentChanges {
  added: Set<ComponentId>;
  edited: Set<ComponentId>;
  removed: Set<ComponentId>;
}

export function componentChanges(
  base: EditableConcept,
  present: EditableConcept,
): ComponentChanges {
  const changes: ComponentChanges = {
    added: new Set(),
    edited: new Set(),
    removed: new Set(),
  };
  const sets = {
    added: changes.added,
    changed: changes.edited,
    removed: changes.removed,
  };

  for (const { status, id } of compareConcepts(base, present).components) {
    if (status !== "unchanged") {
      sets[status].add(id);
    }
  }

  return changes;
}

/**
 * The operations that make a component in `current` match its version in
 * `reference`, restoring it with its connections if `current` removed it.
 * Nothing is taken for a component `reference` does not have.
 */
export function takeVersion(
  reference: EditableConcept,
  current: EditableConcept,
  id: ComponentId,
): Operation[] {
  const theirs = reference.concept.components.find((c) => c.id === id);
  const ours = current.concept.components.find((c) => c.id === id);
  const existing = new Set(current.concept.components.map((c) => c.id));

  if (!theirs) {
    return [];
  }

  // Nesting under a component this branch no longer has would orphan it.
  const parentId =
    theirs.parentId && existing.has(theirs.parentId) ? theirs.parentId : null;

  if (ours) {
    const operations: Operation[] = [];

    for (const field of ["title", "description"] as const) {
      if (ours[field] !== theirs[field]) {
        operations.push({
          type: "component/update",
          id,
          field,
          value: theirs[field],
        });
      }
    }

    if (ours.tag !== theirs.tag) {
      operations.push({ type: "component/tag", id, tag: theirs.tag });
    }

    if (ours.parentId !== parentId) {
      operations.push({ type: "component/nest", id, parentId });
    }

    return operations;
  }

  const layout = reference.componentLayouts.find((l) => l.componentId === id);
  const linked = new Set(current.concept.relationships.map((r) => r.id));

  if (!layout) {
    return [];
  }

  // Its connections come back where the other end is still here.
  const connections = reference.concept.relationships.filter(
    ({ id: relationshipId, sourceComponentId: from, targetComponentId: to }) =>
      !linked.has(relationshipId) &&
      ((from === id && existing.has(to)) || (to === id && existing.has(from))),
  );

  return [
    { type: "component/create", component: { ...theirs, parentId }, layout },
    ...connections.map(
      (relationship): Operation => ({
        type: "relationship/link",
        relationship,
      }),
    ),
  ];
}

/**
 * Unchanged components connected to a changed one, before or after the
 * change. They may need review, but nothing about them has changed. A
 * dependency points one way: what depends on a change needs review, while
 * what the change depends on does not.
 */
export function connectedToChanges(
  base: EditableConcept,
  present: EditableConcept,
  changes: ComponentChanges,
): Set<ComponentId> {
  const changed = new Set([
    ...changes.added,
    ...changes.edited,
    ...changes.removed,
  ]);
  const existing = new Set(present.concept.components.map(({ id }) => id));
  const connected = new Set<ComponentId>();
  const relationships: ConceptRelationship[] = [
    ...base.concept.relationships,
    ...present.concept.relationships,
  ];

  for (const { sourceComponentId, targetComponentId, type } of relationships) {
    const affected = [[targetComponentId, sourceComponentId]];

    if (relationshipKind(type) !== "dependency") {
      affected.push([sourceComponentId, targetComponentId]);
    }

    for (const [from, to] of affected) {
      if (changed.has(from) && existing.has(to) && !changed.has(to)) {
        connected.add(to);
      }
    }
  }

  return connected;
}
