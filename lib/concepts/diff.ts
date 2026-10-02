import type {
  ComponentId,
  ConceptComponent,
  ConceptRelationship,
  EditableConcept,
} from "./model";

/** How components differ from an earlier state, matched by ID. Layout is ignored. */
export interface ComponentChanges {
  added: Set<ComponentId>;
  edited: Set<ComponentId>;
  removed: Set<ComponentId>;
}

function sameContent(a: ConceptComponent, b: ConceptComponent) {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.tag === b.tag &&
    a.parentId === b.parentId
  );
}

export function componentChanges(
  base: EditableConcept,
  present: EditableConcept,
): ComponentChanges {
  const before = new Map(base.concept.components.map((c) => [c.id, c]));
  const after = new Map(present.concept.components.map((c) => [c.id, c]));
  const changes: ComponentChanges = {
    added: new Set(),
    edited: new Set(),
    removed: new Set(),
  };

  for (const [id, component] of after) {
    const previous = before.get(id);

    if (!previous) {
      changes.added.add(id);
    } else if (!sameContent(previous, component)) {
      changes.edited.add(id);
    }
  }

  for (const id of before.keys()) {
    if (!after.has(id)) {
      changes.removed.add(id);
    }
  }

  return changes;
}

/**
 * Unchanged components connected to a changed one, before or after the
 * change. They may need review, but nothing about them has changed.
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

  for (const { sourceComponentId, targetComponentId } of relationships) {
    for (const [from, to] of [
      [sourceComponentId, targetComponentId],
      [targetComponentId, sourceComponentId],
    ]) {
      if (changed.has(from) && existing.has(to) && !changed.has(to)) {
        connected.add(to);
      }
    }
  }

  return connected;
}
