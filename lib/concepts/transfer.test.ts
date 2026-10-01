import { expect, test } from "vitest";
import { createEditorState, editorReducer } from "./editor";
import {
  createComponent,
  createComponentLayout,
  type EditableConcept,
} from "./model";
import { applyOperations } from "./operations";
import {
  exportConcept,
  ImportError,
  importOperations,
  parseConceptExport,
} from "./transfer";

function emptyConcept(id: string): EditableConcept {
  return {
    concept: {
      id,
      workspaceId: "workspace",
      title: "",
      description: "",
      components: [],
      relationships: [],
    },
    componentLayouts: [],
  };
}

const original = applyOperations(emptyConcept("original"), [
  { type: "concept/update", field: "title", value: "Studio Booking" },
  {
    type: "component/create",
    component: { ...createComponent("child"), title: "Calendar" },
    layout: createComponentLayout("child", { x: 40, y: 120 }),
  },
  {
    type: "component/create",
    component: { ...createComponent("parent"), title: "Booking" },
    layout: createComponentLayout("parent", { x: 0, y: 0 }),
  },
  { type: "component/nest", id: "child", parentId: "parent" },
  { type: "component/tag", id: "parent", tag: "mechanism" },
  { type: "component/resize", id: "parent", width: 320, height: 90 },
  {
    type: "relationship/link",
    relationship: {
      id: "r",
      sourceComponentId: "child",
      targetComponentId: "parent",
      type: "depends on",
    },
  },
]).document;

test("importing an export preserves component IDs, relationships and layouts", () => {
  const file = JSON.stringify(exportConcept(original));
  const imported = editorReducer(createEditorState(emptyConcept("copy")), {
    type: "change",
    operations: importOperations(parseConceptExport(file)),
  });

  expect(imported.present).toEqual({
    ...original,
    concept: { ...original.concept, id: "copy" },
  });
  expect(imported.pending).toHaveLength(1);
  expect(imported.undoStack).toHaveLength(1);
});

test("files that are damaged or from a newer version are refused", () => {
  const exported = exportConcept(original);
  const files = {
    notJson: "{",
    newer: JSON.stringify({ ...exported, version: 2 }),
    danglingConnection: JSON.stringify({
      ...exported,
      concept: {
        ...exported.concept,
        relationships: [
          { ...exported.concept.relationships[0], targetComponentId: "gone" },
        ],
      },
    }),
  };

  expect(() => parseConceptExport(files.notJson)).toThrow(ImportError);
  expect(() => parseConceptExport(files.newer)).toThrow(/newer version/);
  expect(() => parseConceptExport(files.danglingConnection)).toThrow(
    /component that is not in the file/,
  );
});
