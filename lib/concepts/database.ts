import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEditorState,
  type EditorState,
  editorReducer,
  type OperationRow,
} from "./editor";
import type { ConceptId, EditableConcept, WorkspaceId } from "./model";
import type { Operation } from "./operations";
import type { OutboxEntry } from "./outbox";

/** Snapshots are saved once a branch has this many operations since the last. */
export const SNAPSHOT_INTERVAL = 100;

const PAGE_SIZE = 1000;

export interface ConceptSummary {
  id: ConceptId;
  /** Main's title as last saved, shown until the concept is opened. */
  title: string;
  deletedAt: string | null;
  mainBranchId: string;
}

/** A write the server rejected; permanent ones will never succeed. */
export class SaveError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
  ) {
    super(message);
  }
}

function check({ error }: { error: { code: string; message: string } | null }) {
  // A duplicate means an earlier attempt already saved it.
  if (!error || error.code === "23505") {
    return;
  }

  // Invalid data, broken constraints and denied access fail the same way on
  // every retry; anything else, such as a dropped connection, may not.
  throw new SaveError(error.message, /^(22|23|42)/.test(error.code));
}

export function emptyConcept(
  id: ConceptId,
  workspaceId: WorkspaceId,
): EditableConcept {
  return {
    concept: {
      id,
      workspaceId,
      title: "",
      description: "",
      components: [],
      relationships: [],
    },
    componentLayouts: [],
  };
}

export async function listConcepts(
  supabase: SupabaseClient,
  workspaceId: WorkspaceId,
): Promise<ConceptSummary[]> {
  const { data, error } = await supabase
    .from("concepts")
    .select("id, title, deleted_at, branches!inner(id)")
    .eq("workspace_id", workspaceId)
    .eq("branches.main", true)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    deletedAt: row.deleted_at,
    mainBranchId: row.branches[0].id,
  }));
}

export async function fetchOperations(
  supabase: SupabaseClient,
  branchId: string,
  afterSeq: number,
): Promise<OperationRow[]> {
  const rows: OperationRow[] = [];
  let after = afterSeq;

  for (;;) {
    const { data, error } = await supabase
      .from("operations")
      .select("seq, change_id, operation")
      .eq("branch_id", branchId)
      .gt("seq", after)
      .order("seq")
      .limit(PAGE_SIZE);

    if (error) {
      throw error;
    }

    for (const row of data) {
      rows.push({
        seq: row.seq,
        changeId: row.change_id,
        operation: row.operation as Operation,
      });
    }

    if (data.length < PAGE_SIZE) {
      return rows;
    }

    after = data[data.length - 1].seq;
  }
}

export async function saveSnapshot(
  supabase: SupabaseClient,
  branchId: string,
  seq: number,
  document: EditableConcept,
) {
  check(
    await supabase
      .from("snapshots")
      .insert({ branch_id: branchId, seq, document }),
  );
}

/** Opens a branch from its latest snapshot plus the operations after it. */
export async function loadEditor(
  supabase: SupabaseClient,
  concept: ConceptSummary,
  workspaceId: WorkspaceId,
): Promise<EditorState> {
  const { data: snapshot, error } = await supabase
    .from("snapshots")
    .select("seq, document")
    .eq("branch_id", concept.mainBranchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const start: { seq: number; document: EditableConcept } = snapshot ?? {
    seq: 0,
    document: emptyConcept(concept.id, workspaceId),
  };
  const rows = await fetchOperations(supabase, concept.mainBranchId, start.seq);
  const editor = editorReducer(createEditorState(start.document, start.seq), {
    type: "sync/pull",
    rows,
  });

  // Snapshots only speed up opening, so failing to save one is not an error.
  if (rows.length >= SNAPSHOT_INTERVAL) {
    await saveSnapshot(
      supabase,
      concept.mainBranchId,
      editor.seq,
      editor.confirmed,
    ).catch((error) => console.warn("Snapshot not saved", error));
  }

  return editor;
}

export async function sendEntry(supabase: SupabaseClient, entry: OutboxEntry) {
  switch (entry.kind) {
    case "concept":
      check(
        await supabase
          .from("concepts")
          .insert({ id: entry.conceptId, workspace_id: entry.workspaceId }),
      );
      check(
        await supabase.from("branches").insert({
          id: entry.branchId,
          concept_id: entry.conceptId,
          title: "Main",
          main: true,
        }),
      );
      return;

    case "change":
      check(
        await supabase.from("operations").insert(
          entry.operations.map((operation, position) => ({
            branch_id: entry.branchId,
            change_id: entry.id,
            position,
            operation,
          })),
        ),
      );
      return;

    case "trash":
      check(
        await supabase
          .from("concepts")
          .update({ deleted_at: entry.deletedAt })
          .eq("id", entry.conceptId),
      );
      return;

    case "delete":
      check(await supabase.from("concepts").delete().eq("id", entry.conceptId));
      return;
  }
}
