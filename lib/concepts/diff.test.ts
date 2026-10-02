import { expect, test } from "vitest";
import {
  compareConcepts,
  componentChanges,
  connectedToChanges,
  takeVersion,
} from "./diff";
import { createEditorState, editorReducer } from "./editor";
import {
  createComponent,
  createComponentLayout,
  type EditableConcept,
} from "./model";
import { applyOperations, type Operation } from "./operations";

const empty: EditableConcept = {
  concept: {
    id: "concept",
    workspaceId: "workspace",
    title: "",
    description: "",
    components: [],
    relationships: [],
  },
  componentLayouts: [],
};

function create(id: string, title: string): Operation {
  return {
    type: "component/create",
    component: { ...createComponent(id), title },
    layout: createComponentLayout(id, { x: 0, y: 0 }),
  };
}

function link(
  id: string,
  source: string,
  target: string,
  type: string | null = null,
): Operation {
  return {
    type: "relationship/link",
    relationship: {
      id,
      sourceComponentId: source,
      targetComponentId: target,
      type,
    },
  };
}

// Pricing is linked to Revenue and Hosting; Goal stands apart.
const base = applyOperations(empty, [
  create("pricing", "Subscription"),
  create("revenue", "Recurring revenue"),
  create("hosting", "Hosted sync"),
  create("goal", "Make ideas manipulable"),
  link("r1", "pricing", "revenue"),
  link("r2", "hosting", "pricing"),
]).document;

function explore(operations: Operation[]) {
  const present = applyOperations(base, operations).document;
  const changes = componentChanges(base, present);
  return { changes, connected: connectedToChanges(base, present, changes) };
}

test("a substitution flags the components connected to it", () => {
  const { changes, connected } = explore([
    {
      type: "component/update",
      id: "pricing",
      field: "title",
      value: "One-time",
    },
    { type: "component/move", id: "goal", position: { x: 50, y: 50 } },
  ]);

  expect(changes.edited).toEqual(new Set(["pricing"]));
  expect(changes.added.size + changes.removed.size).toBe(0);
  expect(connected).toEqual(new Set(["revenue", "hosting"]));
});

test("removing a component flags what it was connected to", () => {
  const { changes, connected } = explore([
    { type: "component/delete", id: "pricing" },
  ]);

  expect(changes.removed).toEqual(new Set(["pricing"]));
  expect(connected).toEqual(new Set(["revenue", "hosting"]));
});

test("an added constraint flags what it constrains, and editing clears it", () => {
  const constrain = [
    create("limit", "No subscription"),
    link("r3", "limit", "pricing"),
  ];

  expect(explore(constrain).connected).toEqual(new Set(["pricing"]));

  const { changes, connected } = explore([
    ...constrain,
    {
      type: "component/update",
      id: "pricing",
      field: "title",
      value: "One-time",
    },
  ]);
  expect(changes.edited).toEqual(new Set(["pricing"]));
  expect(connected).toEqual(new Set(["revenue", "hosting"]));
});

test("a change flags what depends on it, not what it depends on", () => {
  const layered = applyOperations(empty, [
    create("app", "Mobile app"),
    create("api", "Sync API"),
    create("db", "Postgres"),
    link("d1", "app", "api", "depends on"),
    link("d2", "api", "db", "depends on"),
  ]).document;
  const present = applyOperations(layered, [
    {
      type: "component/update",
      id: "api",
      field: "title",
      value: "Sync API v2",
    },
  ]).document;

  expect(
    connectedToChanges(layered, present, componentChanges(layered, present)),
  ).toEqual(new Set(["app"]));
});

function statuses(before: EditableConcept, after: EditableConcept) {
  const { components, relationships } = compareConcepts(before, after);
  return Object.fromEntries(
    [...components, ...relationships].map((difference) => [
      difference.id,
      difference.status === "changed"
        ? difference.fields.join(",")
        : difference.status,
    ]),
  );
}

test("branches compare by ID after renaming, moving and removing", () => {
  const branch = applyOperations(base, [
    {
      type: "component/update",
      id: "pricing",
      field: "title",
      value: "Per seat",
    },
    { type: "component/move", id: "goal", position: { x: 300, y: 300 } },
    { type: "component/nest", id: "revenue", parentId: "goal" },
    { type: "component/delete", id: "hosting" },
    { type: "relationship/update", id: "r1", field: "type", value: "funds" },
    create("presence", "Real-time presence"),
  ]).document;

  expect(statuses(base, branch)).toEqual({
    pricing: "title",
    goal: "unchanged",
    revenue: "parentId",
    hosting: "removed",
    presence: "added",
    r1: "type",
    r2: "removed",
  });
});

test("editing one branch leaves its parent and siblings unchanged", () => {
  const parent = createEditorState(base);
  const sibling = createEditorState(parent.present);
  const edited = editorReducer(createEditorState(parent.present), {
    type: "component/delete",
    id: "pricing",
  });

  expect(statuses(base, edited.present).pricing).toBe("removed");

  for (const untouched of [parent, sibling]) {
    expect(new Set(Object.values(statuses(base, untouched.present)))).toEqual(
      new Set(["unchanged"]),
    );
  }
});

test("taking a version makes the component match, and undoing restores it", () => {
  const branch = applyOperations(base, [
    {
      type: "component/update",
      id: "pricing",
      field: "title",
      value: "Per seat",
    },
    { type: "component/tag", id: "pricing", tag: "mechanism" },
    { type: "component/delete", id: "revenue" },
    { type: "component/delete", id: "hosting" },
  ]).document;

  const changed = applyOperations(branch, takeVersion(base, branch, "pricing"));
  expect(statuses(base, changed.document).pricing).toBe("unchanged");

  // Revenue comes back linked to Pricing, but not to Hosting, which is gone.
  const restored = applyOperations(
    branch,
    takeVersion(base, branch, "revenue"),
  );
  const result = statuses(base, restored.document);
  expect([result.revenue, result.r1, result.r2]).toEqual([
    "unchanged",
    "unchanged",
    "removed",
  ]);

  expect(applyOperations(restored.document, restored.inverse).document).toEqual(
    branch,
  );
  expect(takeVersion(branch, base, "goal")).toEqual([]);
});
