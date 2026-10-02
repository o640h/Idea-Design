import { expect, test } from "vitest";
import { componentChanges, connectedToChanges } from "./diff";
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

function link(id: string, source: string, target: string): Operation {
  return {
    type: "relationship/link",
    relationship: {
      id,
      sourceComponentId: source,
      targetComponentId: target,
      type: null,
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
