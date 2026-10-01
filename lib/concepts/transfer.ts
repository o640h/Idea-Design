import { z } from "zod";
import type { EditableConcept } from "./model";
import type { Operation } from "./operations";

const FORMAT = "idea-design/concept";
const VERSION = 1;

/** A file that cannot be imported, with a message for the person importing it. */
export class ImportError extends Error {}

const id = z.string().min(1);

const textFormat = z.object({
  fontSize: z.number().positive(),
  fontWeight: z.literal([300, 400, 500]),
  opacity: z.number().min(0).max(1),
  italic: z.boolean(),
});

const conceptExport = z
  .object({
    format: z.literal(FORMAT),
    version: z.literal(VERSION),
    concept: z.object({
      title: z.string(),
      description: z.string(),
      components: z.array(
        z.object({
          id,
          title: z.string(),
          description: z.string(),
          tag: z.string().nullable(),
          parentId: id.nullable(),
        }),
      ),
      relationships: z.array(
        z.object({
          id,
          sourceComponentId: id,
          targetComponentId: id,
          type: z.string().nullable(),
        }),
      ),
    }),
    componentLayouts: z.array(
      z.object({
        componentId: id,
        x: z.number(),
        y: z.number(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        formats: z.object({ title: textFormat, description: textFormat }),
      }),
    ),
  })
  .superRefine(({ concept, componentLayouts }, context) => {
    const componentIds = new Set(concept.components.map(({ id }) => id));
    const layoutIds = componentLayouts.map(({ componentId }) => componentId);
    const problems = [
      componentIds.size !== concept.components.length &&
        "Two components share an ID.",
      new Set(concept.relationships.map(({ id }) => id)).size !==
        concept.relationships.length && "Two connections share an ID.",
      (layoutIds.length !== componentIds.size ||
        !layoutIds.every((layoutId) => componentIds.has(layoutId))) &&
        "Each component needs exactly one layout.",
      !concept.relationships.every(
        ({ sourceComponentId, targetComponentId }) =>
          componentIds.has(sourceComponentId) &&
          componentIds.has(targetComponentId),
      ) && "A connection points to a component that is not in the file.",
      !concept.components.every(
        ({ parentId }) => parentId === null || componentIds.has(parentId),
      ) && "A component is nested in one that is not in the file.",
    ];

    for (const message of problems) {
      if (message) {
        context.addIssue({ code: "custom", message });
      }
    }
  });

export type ConceptExport = z.infer<typeof conceptExport>;

export function exportConcept({
  concept,
  componentLayouts,
}: EditableConcept): ConceptExport {
  return {
    format: FORMAT,
    version: VERSION,
    concept: {
      title: concept.title,
      description: concept.description,
      components: concept.components,
      relationships: concept.relationships,
    },
    componentLayouts,
  };
}

/** Reads an exported file, or explains why it cannot be imported. */
export function parseConceptExport(text: string): ConceptExport {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("This file is not valid JSON.");
  }

  const header = z
    .object({ format: z.literal(FORMAT), version: z.number() })
    .safeParse(data);

  if (!header.success) {
    throw new ImportError("This file is not an Idea Design concept.");
  }

  if (header.data.version > VERSION) {
    throw new ImportError(
      "This concept was exported by a newer version of Idea Design.",
    );
  }

  const result = conceptExport.safeParse(data);

  if (!result.success) {
    const [issue] = result.error.issues;
    const where = issue.path.length ? ` (${issue.path.join(".")})` : "";
    throw new ImportError(
      `This concept file is damaged: ${issue.message}${where}`,
    );
  }

  return result.data;
}

/** The operations that rebuild an exported concept, keeping its IDs. */
export function importOperations({
  concept,
  componentLayouts,
}: ConceptExport): Operation[] {
  const layouts = new Map(
    componentLayouts.map((layout) => [layout.componentId, layout]),
  );
  const operations: Operation[] = [];

  for (const field of ["title", "description"] as const) {
    if (concept[field]) {
      operations.push({ type: "concept/update", field, value: concept[field] });
    }
  }

  // Nesting waits until every component exists, as a parent may come later.
  for (const component of concept.components) {
    const layout = layouts.get(component.id);

    if (layout) {
      operations.push({
        type: "component/create",
        component: { ...component, parentId: null },
        layout,
      });
    }
  }

  for (const { id, parentId } of concept.components) {
    if (parentId) {
      operations.push({ type: "component/nest", id, parentId });
    }
  }

  for (const relationship of concept.relationships) {
    operations.push({ type: "relationship/link", relationship });
  }

  return operations;
}
