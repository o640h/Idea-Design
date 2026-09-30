import {
  type ComponentId,
  type ComponentLayout,
  type ComponentTextField,
  type Concept,
  type ConceptComponent,
  type ConceptLayout,
  type ConceptRelationship,
  type ConceptViewport,
  DEFAULT_TEXT_FORMATS,
  type RelationshipId,
  type TextFormat,
} from "./model";

export type EditorSelection =
  | { kind: "component"; id: ComponentId }
  | { kind: "relationship"; id: RelationshipId }
  | null;

export interface EditableConcept {
  concept: Concept;
  componentLayouts: ComponentLayout[];
}

export interface EditorState {
  past: EditableConcept[];
  present: EditableConcept;
  future: EditableConcept[];
  viewport: ConceptViewport;
  selection: EditorSelection;
}

type Position = Pick<ComponentLayout, "x" | "y">;

export type EditorAction =
  | {
      type: "concept/update";
      changes: Partial<Pick<Concept, "title" | "description">>;
    }
  | {
      type: "component/add";
      component: ConceptComponent;
      position: Position;
    }
  | {
      type: "component/update";
      id: ComponentId;
      changes: Partial<
        Pick<ConceptComponent, "title" | "description" | "tag" | "parentId">
      >;
    }
  | { type: "component/remove"; id: ComponentId }
  | { type: "component/move"; id: ComponentId; position: Position }
  | {
      type: "component/format";
      id: ComponentId;
      field: ComponentTextField;
      changes: Partial<TextFormat>;
    }
  | { type: "relationship/add"; relationship: ConceptRelationship }
  | {
      type: "relationship/update";
      id: RelationshipId;
      changes: Pick<ConceptRelationship, "type">;
    }
  | { type: "relationship/remove"; id: RelationshipId }
  | { type: "viewport/set"; viewport: ConceptViewport }
  | { type: "selection/set"; selection: EditorSelection }
  | { type: "history/undo" }
  | { type: "history/redo" };

export function createEditorState(
  concept: Concept,
  layout: ConceptLayout,
): EditorState {
  if (layout.conceptId !== concept.id) {
    throw new Error("The concept and layout must have the same concept ID.");
  }

  return {
    past: [],
    present: {
      concept,
      componentLayouts: [...layout.components],
    },
    future: [],
    viewport: layout.viewport,
    selection: null,
  };
}

export function getConceptLayout(state: EditorState): ConceptLayout {
  return {
    conceptId: state.present.concept.id,
    components: state.present.componentLayouts,
    viewport: state.viewport,
  };
}

function commit(state: EditorState, present: EditableConcept): EditorState {
  return {
    ...state,
    past: [...state.past, state.present],
    present,
    future: [],
  };
}

function undo(state: EditorState): EditorState {
  const previous = state.past.at(-1);

  if (!previous) {
    return state;
  }

  return {
    ...state,
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
    selection: null,
  };
}

function redo(state: EditorState): EditorState {
  const [next, ...remainingFuture] = state.future;

  if (!next) {
    return state;
  }

  return {
    ...state,
    past: [...state.past, state.present],
    present: next,
    future: remainingFuture,
    selection: null,
  };
}

function sameFormat(a: TextFormat, b: TextFormat) {
  return (
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.opacity === b.opacity &&
    a.italic === b.italic
  );
}

function updateComponentLayout(
  state: EditorState,
  id: ComponentId,
  update: (layout: ComponentLayout) => ComponentLayout,
): EditorState {
  const layout = state.present.componentLayouts.find(
    (candidate) => candidate.componentId === id,
  );

  if (!layout) {
    return state;
  }

  const updatedLayout = update(layout);

  if (
    updatedLayout.x === layout.x &&
    updatedLayout.y === layout.y &&
    sameFormat(updatedLayout.formats.title, layout.formats.title) &&
    sameFormat(updatedLayout.formats.description, layout.formats.description)
  ) {
    return state;
  }

  return commit(state, {
    ...state.present,
    componentLayouts: state.present.componentLayouts.map((candidate) =>
      candidate.componentId === id ? updatedLayout : candidate,
    ),
  });
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "concept/update": {
      const concept = { ...state.present.concept, ...action.changes };

      if (
        concept.title === state.present.concept.title &&
        concept.description === state.present.concept.description
      ) {
        return state;
      }

      return commit(state, { ...state.present, concept });
    }

    case "component/add": {
      if (
        state.present.concept.components.some(
          (component) => component.id === action.component.id,
        )
      ) {
        return state;
      }

      return commit(state, {
        concept: {
          ...state.present.concept,
          components: [...state.present.concept.components, action.component],
        },
        componentLayouts: [
          ...state.present.componentLayouts,
          {
            componentId: action.component.id,
            ...action.position,
            formats: DEFAULT_TEXT_FORMATS,
          },
        ],
      });
    }

    case "component/update": {
      const component = state.present.concept.components.find(
        (candidate) => candidate.id === action.id,
      );

      if (!component) {
        return state;
      }

      const updatedComponent = { ...component, ...action.changes };

      if (
        updatedComponent.title === component.title &&
        updatedComponent.description === component.description &&
        updatedComponent.tag === component.tag &&
        updatedComponent.parentId === component.parentId
      ) {
        return state;
      }

      return commit(state, {
        ...state.present,
        concept: {
          ...state.present.concept,
          components: state.present.concept.components.map((candidate) =>
            candidate.id === action.id ? updatedComponent : candidate,
          ),
        },
      });
    }

    case "component/remove": {
      if (
        !state.present.concept.components.some(
          (component) => component.id === action.id,
        )
      ) {
        return state;
      }

      const removedRelationshipIds = new Set(
        state.present.concept.relationships
          .filter(
            (relationship) =>
              relationship.sourceComponentId === action.id ||
              relationship.targetComponentId === action.id,
          )
          .map((relationship) => relationship.id),
      );
      const shouldClearSelection =
        state.selection?.id === action.id ||
        (state.selection?.kind === "relationship" &&
          removedRelationshipIds.has(state.selection.id));

      const nextState = commit(state, {
        concept: {
          ...state.present.concept,
          components: state.present.concept.components
            .filter((component) => component.id !== action.id)
            .map((component) =>
              component.parentId === action.id
                ? { ...component, parentId: null }
                : component,
            ),
          relationships: state.present.concept.relationships.filter(
            (relationship) => !removedRelationshipIds.has(relationship.id),
          ),
        },
        componentLayouts: state.present.componentLayouts.filter(
          (layout) => layout.componentId !== action.id,
        ),
      });

      return shouldClearSelection
        ? { ...nextState, selection: null }
        : nextState;
    }

    case "component/move":
      return updateComponentLayout(state, action.id, (layout) => ({
        ...layout,
        ...action.position,
      }));

    case "component/format":
      return updateComponentLayout(state, action.id, (layout) => ({
        ...layout,
        formats: {
          ...layout.formats,
          [action.field]: {
            ...layout.formats[action.field],
            ...action.changes,
          },
        },
      }));

    case "relationship/add": {
      if (
        state.present.concept.relationships.some(
          (relationship) => relationship.id === action.relationship.id,
        )
      ) {
        return state;
      }

      return commit(state, {
        ...state.present,
        concept: {
          ...state.present.concept,
          relationships: [
            ...state.present.concept.relationships,
            action.relationship,
          ],
        },
      });
    }

    case "relationship/update": {
      const relationship = state.present.concept.relationships.find(
        (candidate) => candidate.id === action.id,
      );

      if (!relationship || relationship.type === action.changes.type) {
        return state;
      }

      return commit(state, {
        ...state.present,
        concept: {
          ...state.present.concept,
          relationships: state.present.concept.relationships.map((candidate) =>
            candidate.id === action.id
              ? { ...candidate, ...action.changes }
              : candidate,
          ),
        },
      });
    }

    case "relationship/remove": {
      if (
        !state.present.concept.relationships.some(
          (relationship) => relationship.id === action.id,
        )
      ) {
        return state;
      }

      const nextState = commit(state, {
        ...state.present,
        concept: {
          ...state.present.concept,
          relationships: state.present.concept.relationships.filter(
            (relationship) => relationship.id !== action.id,
          ),
        },
      });

      return state.selection?.id === action.id
        ? { ...nextState, selection: null }
        : nextState;
    }

    case "viewport/set":
      return { ...state, viewport: action.viewport };

    case "selection/set":
      return { ...state, selection: action.selection };

    case "history/undo":
      return undo(state);

    case "history/redo":
      return redo(state);
  }
}
