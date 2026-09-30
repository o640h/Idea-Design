export const CURRENT_PROJECT_DOCUMENT_VERSION = 1 as const;

/** Offered when tagging a component; users can also write their own tag. */
export const SUGGESTED_TAGS = [
  "goal",
  "principle",
  "mechanism",
  "actor",
  "constraint",
  "assumption",
  "evidence",
] as const;

export type ProjectDocumentVersion = typeof CURRENT_PROJECT_DOCUMENT_VERSION;

export type ProjectId = string;
export type ConceptId = string;
export type ComponentId = string;
export type RelationshipId = string;

export interface Project {
  id: ProjectId;
  title: string;
}

export interface Concept {
  id: ConceptId;
  projectId: ProjectId;
  title: string;
  description: string;
  components: ConceptComponent[];
  relationships: ConceptRelationship[];
}

export interface ConceptComponent {
  id: ComponentId;
  title: string;
  description: string;
  /** A lowercase label such as "goal". Null leaves the component untagged. */
  tag: string | null;

  /** Containment is a hierarchy and is not represented as a semantic edge. */
  parentId: ComponentId | null;
}

export interface ConceptRelationship {
  id: RelationshipId;
  sourceComponentId: ComponentId;
  targetComponentId: ComponentId;

  /** A semantic label such as "depends on". Null represents an unlabelled edge. */
  type: string | null;
}

export type ComponentTextField = "title" | "description";

export interface TextFormat {
  fontSize: number;
  fontWeight: 300 | 400 | 500;
  opacity: number;
  italic: boolean;
}

/** How a component is placed and styled; kept apart from its content. */
export interface ComponentLayout {
  componentId: ComponentId;
  x: number;
  y: number;
  formats: Record<ComponentTextField, TextFormat>;
}

export const DEFAULT_TEXT_FORMATS: ComponentLayout["formats"] = {
  title: { fontSize: 13, fontWeight: 300, opacity: 1, italic: false },
  description: { fontSize: 10, fontWeight: 300, opacity: 0.85, italic: false },
};

export interface ConceptViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ConceptLayout {
  conceptId: ConceptId;
  components: ComponentLayout[];
  viewport: ConceptViewport;
}

export interface ProjectDocumentV1 {
  schemaVersion: typeof CURRENT_PROJECT_DOCUMENT_VERSION;
  project: Project;
  concepts: Concept[];
  layouts: ConceptLayout[];
}

/** Add future document versions to this union after defining their migration. */
export type ProjectDocument = ProjectDocumentV1;

export function createComponent(id: ComponentId): ConceptComponent {
  return { id, title: "", description: "", tag: null, parentId: null };
}

export function normaliseTag(tag: string) {
  return tag.trim().toLowerCase();
}
