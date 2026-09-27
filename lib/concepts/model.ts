export const CURRENT_PROJECT_DOCUMENT_VERSION = 1 as const;

export const COMPONENT_TYPES = [
  "goal",
  "mechanism",
  "actor",
  "constraint",
  "assumption",
  "unknown",
  "evidence",
] as const;

export type ProjectDocumentVersion = typeof CURRENT_PROJECT_DOCUMENT_VERSION;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

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
  type: ComponentType | null;

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

export interface ComponentPosition {
  componentId: ComponentId;
  x: number;
  y: number;
}

export interface ConceptViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ConceptLayout {
  conceptId: ConceptId;
  positions: ComponentPosition[];
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
