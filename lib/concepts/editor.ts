import type {
  ComponentId,
  ConceptViewport,
  EditableConcept,
  RelationshipId,
} from "./model";
import { applyOperations, coalesce, type Operation } from "./operations";

export type EditorSelection =
  | { kind: "component"; id: ComponentId }
  | { kind: "relationship"; id: RelationshipId }
  | null;

/** Operations applied together, identified so the server can return them. */
export interface Change {
  id: string;
  operations: Operation[];
}

/** An operation as the server recorded it, in its order. */
export interface OperationRow {
  seq: number;
  changeId: string;
  operation: Operation;
}

/** A change and the operations that revert it. */
interface HistoryEntry {
  operations: Operation[];
  inverse: Operation[];
}

export interface EditorState {
  /** The concept as of the server's operation `seq`. */
  confirmed: EditableConcept;
  seq: number;
  /** Changes made here that the server has not returned yet, oldest first. */
  pending: Change[];
  /** How many pending changes are saved or being saved; edits no longer merge into them. */
  sealed: number;
  /** The confirmed concept with the pending changes applied. */
  present: EditableConcept;
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
  | { type: "history/redo" }
  | { type: "sync/seal" }
  | { type: "sync/pull"; rows: OperationRow[] };

export interface ChangeOptions {
  /** Merges a text edit into the previous change made during the same focus. */
  continuing?: boolean;
}

export type EditorDispatch = (
  action: EditorAction,
  options?: ChangeOptions,
) => void;

export function createEditorState(
  document: EditableConcept,
  seq = 0,
): EditorState {
  return {
    confirmed: document,
    seq,
    pending: [],
    sealed: 0,
    present: document,
    undoStack: [],
    redoStack: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: null,
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
  const last = state.pending.at(-1);

  if (
    continuing &&
    previous &&
    last?.operations === previous.operations &&
    state.pending.length > state.sealed
  ) {
    const operations = coalesce(previous.operations, operation);

    if (operations) {
      return withPresent(
        {
          ...state,
          pending: [...state.pending.slice(0, -1), { id: last.id, operations }],
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
      pending: [...state.pending, { id: crypto.randomUUID(), operations }],
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
      {
        ...state,
        pending: [
          ...state.pending,
          { id: crypto.randomUUID(), operations: entry.inverse },
        ],
      },
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

/**
 * Applies operations the server has ordered beneath the pending changes, so
 * fields resolve to the last write in server order while local edits that
 * have not come back yet still show.
 */
function pull(state: EditorState, rows: OperationRow[]): EditorState {
  const fresh = rows.filter(({ seq }) => seq > state.seq);
  const last = fresh.at(-1);

  if (!last) {
    return state;
  }

  const confirmed = applyOperations(
    state.confirmed,
    fresh.map(({ operation }) => operation),
  ).document;
  const returned = new Set(fresh.map(({ changeId }) => changeId));
  const pending = state.pending.filter(({ id }) => !returned.has(id));

  return withPresent(
    {
      ...state,
      confirmed,
      seq: last.seq,
      pending,
      sealed: state.sealed - (state.pending.length - pending.length),
    },
    applyOperations(
      confirmed,
      pending.flatMap(({ operations }) => operations),
    ).document,
  );
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

    case "sync/seal":
      return { ...state, sealed: state.pending.length };

    case "sync/pull":
      return pull(state, action.rows);

    default:
      return change(state, action, options);
  }
}
