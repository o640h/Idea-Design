import type {
  ComponentId,
  ConceptLayout,
  ConceptViewport,
  EditableConcept,
  RelationshipId,
} from "./model";
import { applyOperations, coalesce, type Operation } from "./operations";

export type EditorSelection =
  | { kind: "component"; id: ComponentId }
  | { kind: "relationship"; id: RelationshipId }
  | null;

/** A change and the operations that revert it. */
interface HistoryEntry {
  operations: Operation[];
  inverse: Operation[];
}

export interface EditorState {
  present: EditableConcept;
  /** Each change made this session, in order. Undo and redo append to it. */
  log: Operation[][];
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  /** Each person's own view, so it is kept out of the log. */
  viewport: ConceptViewport;
  selection: EditorSelection;
}

export type EditorAction =
  | Operation
  | { type: "viewport/set"; viewport: ConceptViewport }
  | { type: "selection/set"; selection: EditorSelection }
  | { type: "history/undo" }
  | { type: "history/redo" };

export interface ChangeOptions {
  /** Merges a text edit into the previous change made during the same focus. */
  continuing?: boolean;
}

export type EditorDispatch = (
  action: EditorAction,
  options?: ChangeOptions,
) => void;

export function createEditorState(
  concept: EditableConcept["concept"],
  layout: ConceptLayout,
): EditorState {
  return {
    present: { concept, componentLayouts: layout.components },
    log: [],
    undoStack: [],
    redoStack: [],
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

/** Replaces the document, dropping a selection whose item no longer exists. */
function withPresent(
  state: EditorState,
  present: EditableConcept,
): EditorState {
  const { selection } = state;
  const items =
    selection?.kind === "component"
      ? present.concept.components
      : present.concept.relationships;

  return {
    ...state,
    present,
    selection:
      selection && items.some(({ id }) => id === selection.id)
        ? selection
        : null,
  };
}

function change(
  state: EditorState,
  operation: Operation,
  { continuing = false }: ChangeOptions,
): EditorState {
  const { document, inverse } = applyOperations(state.present, [operation]);

  if (!inverse.length) {
    return state;
  }

  const previous = state.undoStack.at(-1);

  if (continuing && previous && state.log.at(-1) === previous.operations) {
    const operations = coalesce(previous.operations, operation);

    if (operations) {
      return withPresent(
        {
          ...state,
          log: [...state.log.slice(0, -1), operations],
          // The earlier inverse already restores the text from before focus.
          undoStack: [
            ...state.undoStack.slice(0, -1),
            { operations, inverse: previous.inverse },
          ],
          redoStack: [],
        },
        document,
      );
    }
  }

  const operations = [operation];

  return withPresent(
    {
      ...state,
      log: [...state.log, operations],
      undoStack: [...state.undoStack, { operations, inverse }],
      redoStack: [],
    },
    document,
  );
}

/** Appends an entry's inverse as a new change and returns what reverts it. */
function revert(state: EditorState, entry: HistoryEntry) {
  const { document, inverse } = applyOperations(state.present, entry.inverse);

  return {
    state: withPresent(
      { ...state, log: [...state.log, entry.inverse] },
      document,
    ),
    reverted: { operations: entry.inverse, inverse },
  };
}

function undo(state: EditorState): EditorState {
  const entry = state.undoStack.at(-1);

  if (!entry) {
    return state;
  }

  const { state: next, reverted } = revert(state, entry);

  return {
    ...next,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, reverted],
  };
}

function redo(state: EditorState): EditorState {
  const entry = state.redoStack.at(-1);

  if (!entry) {
    return state;
  }

  const { state: next, reverted } = revert(state, entry);

  return {
    ...next,
    undoStack: [...state.undoStack, reverted],
    redoStack: state.redoStack.slice(0, -1),
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
  options: ChangeOptions = {},
): EditorState {
  switch (action.type) {
    case "viewport/set":
      return { ...state, viewport: action.viewport };

    case "selection/set":
      return { ...state, selection: action.selection };

    case "history/undo":
      return undo(state);

    case "history/redo":
      return redo(state);

    default:
      return change(state, action, options);
  }
}
