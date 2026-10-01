import { expect, test } from "vitest";
import {
  type ChangeOptions,
  createEditorState,
  type EditorAction,
  type EditorState,
  editorReducer,
} from "./editor";
import {
  createComponent,
  createComponentLayout,
  type EditableConcept,
} from "./model";
import { applyOperations } from "./operations";

const opening: EditableConcept = {
  concept: {
    id: "concept",
    workspaceId: "workspace",
    title: "Opening Title",
    description: "",
    components: [],
    relationships: [],
  },
  componentLayouts: [],
};

function edit(
  steps: (EditorAction | [EditorAction, ChangeOptions])[],
  state = createEditorState(opening),
): EditorState {
  return steps.reduce(
    (current, step) =>
      Array.isArray(step)
        ? editorReducer(current, ...step)
        : editorReducer(current, step),
    state,
  );
}

function create(id: string, title: string): EditorAction {
  return {
    type: "component/create",
    component: { ...createComponent(id), title },
    layout: createComponentLayout(id, { x: 0, y: 0 }),
  };
}

function titles(state: EditorState) {
  return state.present.concept.components.map(({ title }) => title);
}

function operations(state: EditorState) {
  return state.pending.map((change) => change.operations);
}

test("replaying the log from the opening snapshot rebuilds the concept", () => {
  const state = edit([
    create("a", "Goal"),
    create("b", "Mechanism"),
    {
      type: "relationship/link",
      relationship: {
        id: "r",
        sourceComponentId: "a",
        targetComponentId: "b",
        type: null,
      },
    },
    { type: "relationship/update", id: "r", field: "type", value: "enables" },
    { type: "component/tag", id: "a", tag: "goal" },
    { type: "component/move", id: "b", position: { x: 40, y: 80 } },
    { type: "component/resize", id: "b", width: 280, height: 120 },
    {
      type: "component/format",
      id: "a",
      field: "title",
      changes: { fontSize: 20 },
    },
    { type: "concept/update", field: "title", value: "Renamed" },
    { type: "component/delete", id: "a" },
    { type: "history/undo" },
    { type: "history/redo" },
    { type: "history/undo" },
  ]);

  expect(applyOperations(opening, operations(state).flat()).document).toEqual(
    state.present,
  );
});

test("undo and redo append inverse changes instead of removing entries", () => {
  const edited = edit([
    create("a", "Draft"),
    { type: "component/update", id: "a", field: "title", value: "Final" },
  ]);
  const undone = edit([{ type: "history/undo" }], edited);
  const redone = edit([{ type: "history/redo" }], undone);

  expect(titles(undone)).toEqual(["Draft"]);
  expect(undone.pending).toHaveLength(3);
  expect(undone.pending.slice(0, 2)).toEqual(edited.pending);
  expect(titles(redone)).toEqual(["Final"]);
  expect(redone.pending).toHaveLength(4);
});

test("undoing a delete restores the component, its connections and children", () => {
  const before = edit([
    create("parent", "Parent"),
    create("child", "Child"),
    { type: "component/nest", id: "child", parentId: "parent" },
    {
      type: "relationship/link",
      relationship: {
        id: "r",
        sourceComponentId: "child",
        targetComponentId: "parent",
        type: "depends on",
      },
    },
  ]);
  const deleted = edit([{ type: "component/delete", id: "parent" }], before);
  const restored = edit([{ type: "history/undo" }], deleted);

  expect(deleted.present.concept.relationships).toEqual([]);
  expect(deleted.present.concept.components).toEqual([
    expect.objectContaining({ id: "child", parentId: null }),
  ]);
  expect(restored.present.concept.relationships).toEqual(
    before.present.concept.relationships,
  );
  expect(restored.present.concept.components).toEqual(
    expect.arrayContaining(before.present.concept.components),
  );
});

test("text typed during one focus becomes one operation and one undo step", () => {
  const typed = edit([
    create("a", "H"),
    [
      { type: "component/update", id: "a", field: "title", value: "Hel" },
      { continuing: true },
    ],
    [
      { type: "component/update", id: "a", field: "title", value: "Hello" },
      { continuing: true },
    ],
  ]);

  expect(operations(typed)).toEqual([[create("a", "Hello")]]);
  expect(
    edit([{ type: "history/undo" }], typed).present.concept.components,
  ).toEqual([]);

  const refocused = edit(
    [
      [
        { type: "component/update", id: "a", field: "title", value: "Hi" },
        { continuing: false },
      ],
      { type: "history/undo" },
    ],
    typed,
  );

  expect(titles(refocused)).toEqual(["Hello"]);
});

test("sealed changes take no more typing, so a sent change never grows", () => {
  const sealed = edit([
    create("a", "Hel"),
    { type: "sync/seal" },
    [
      { type: "component/update", id: "a", field: "title", value: "Hello" },
      { continuing: true },
    ],
  ]);

  expect(operations(sealed)).toEqual([
    [create("a", "Hel")],
    [{ type: "component/update", id: "a", field: "title", value: "Hello" }],
  ]);
});

test("pulled operations apply beneath pending edits in server order", () => {
  const local = edit([
    create("a", "Goal"),
    { type: "sync/seal" },
    { type: "component/update", id: "a", field: "title", value: "Mine" },
  ]);
  const [sent] = local.pending;
  const pulled = edit(
    [
      {
        type: "sync/pull",
        rows: [
          { seq: 1, changeId: sent.id, operation: sent.operations[0] },
          {
            seq: 2,
            changeId: "other-tab",
            operation: {
              type: "component/update",
              id: "a",
              field: "title",
              value: "Theirs",
            },
          },
          {
            seq: 3,
            changeId: "other-tab-2",
            operation: { type: "component/tag", id: "a", tag: "goal" },
          },
        ],
      },
    ],
    local,
  );

  expect(pulled.seq).toBe(3);
  expect(pulled.pending).toEqual(local.pending.slice(1));
  expect(pulled.sealed).toBe(0);
  expect(pulled.confirmed.concept.components).toEqual([
    expect.objectContaining({ title: "Theirs", tag: "goal" }),
  ]);
  expect(pulled.present.concept.components).toEqual([
    expect.objectContaining({ title: "Mine", tag: "goal" }),
  ]);
  expect(edit([{ type: "sync/pull", rows: [] }], pulled)).toBe(pulled);
});
