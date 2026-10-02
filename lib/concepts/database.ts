import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEditorState,
  type EditorState,
  editorReducer,
  type OperationRow,
} from "./editor";
import type { ConceptId, EditableConcept, WorkspaceId } from "./model";
import { applyOperations, type Operation } from "./operations";
import type { OutboxEntry } from "./outbox";

/** Snapshots are saved once a branch has this many operations since the last. */
export const SNAPSHOT_INTERVAL = 100;

const PAGE_SIZE = 1000;

export interface BranchSummary {
  id: string;
  title: string;
  main: boolean;
  archivedAt: string | null;
  /** The revision of its parent the branch started from; null for Main. */
  sourceRevisionId: string | null;
}

export interface ConceptSummary {
  id: ConceptId;
  /** Main's title as last saved, shown until the concept is opened. */
  title: string;
  deletedAt: string | null;
  /** Main first, then in the order they were made. */
  branches: BranchSummary[];
}

export interface Revision {
  id: string;
  branchId: string;
  kind: "branch" | "checkpoint";
  /** A checkpoint's name; null for a branch point. */
  title: string | null;
  createdAt: string;
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
    .select(
      "id, title, deleted_at, branches(id, title, main, archived_at, source_revision_id)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at")
    .order("main", { referencedTable: "branches", ascending: false })
    .order("created_at", { referencedTable: "branches" });

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    deletedAt: row.deleted_at,
    branches: row.branches.map((branch) => ({
      id: branch.id,
      title: branch.title,
      main: branch.main,
      archivedAt: branch.archived_at,
      sourceRevisionId: branch.source_revision_id,
    })),
  }));
}

export async function listRevisions(
  supabase: SupabaseClient,
  conceptId: ConceptId,
): Promise<Revision[]> {
  const { data, error } = await supabase
    .from("revisions")
    .select(
      "id, branch_id, kind, title, created_at, branches!revisions_branch_id_fkey!inner(concept_id)",
    )
    .eq("branches.concept_id", conceptId)
    .order("created_at");

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    kind: row.kind,
    title: row.title,
    createdAt: row.created_at,
  }));
}

export async function fetchOperations(
  supabase: SupabaseClient,
  branchId: string,
  afterSeq: number,
  upToSeq = Number.MAX_SAFE_INTEGER,
): Promise<OperationRow[]> {
  const rows: OperationRow[] = [];
  let after = afterSeq;

  for (;;) {
    const { data, error } = await supabase
      .from("operations")
      .select("seq, change_id, operation")
      .eq("branch_id", branchId)
      .gt("seq", after)
      .lte("seq", upToSeq)
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

interface BranchOwner {
  conceptId: ConceptId;
  workspaceId: WorkspaceId;
}

/**
 * Where replaying a branch up to `upToSeq` begins: its latest snapshot by
 * then, or else its parent's document at the source revision, since a
 * branch's log holds only the operations made after it diverged.
 */
async function replayStart(
  supabase: SupabaseClient,
  branchId: string,
  owner: BranchOwner,
  upToSeq = Number.MAX_SAFE_INTEGER,
): Promise<{ seq: number; document: EditableConcept }> {
  const { data: snapshot, error } = await supabase
    .from("snapshots")
    .select("seq, document")
    .eq("branch_id", branchId)
    .lte("seq", upToSeq)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (snapshot) {
    return snapshot;
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("source:revisions!branches_source_revision_id_fkey(branch_id, seq)")
    .eq("id", branchId)
    .single<{ source: { branch_id: string; seq: number } | null }>();

  if (branchError) {
    throw branchError;
  }

  return {
    seq: 0,
    document: branch.source
      ? await documentAt(
          supabase,
          branch.source.branch_id,
          owner,
          branch.source.seq,
        )
      : emptyConcept(owner.conceptId, owner.workspaceId),
  };
}

async function documentAt(
  supabase: SupabaseClient,
  branchId: string,
  owner: BranchOwner,
  seq: number,
) {
  const start = await replayStart(supabase, branchId, owner, seq);
  const rows = await fetchOperations(supabase, branchId, start.seq, seq);
  return applyOperations(
    start.document,
    rows.map(({ operation }) => operation),
  ).document;
}

/** The concept as it was at a saved revision, to start a branch from. */
export async function revisionDocument(
  supabase: SupabaseClient,
  revisionId: string,
  owner: BranchOwner,
) {
  const { data, error } = await supabase
    .from("revisions")
    .select("branch_id, seq")
    .eq("id", revisionId)
    .single();

  if (error) {
    throw error;
  }

  return documentAt(supabase, data.branch_id, owner, data.seq);
}

/** Opens a branch from its latest snapshot plus the operations after it. */
export async function loadEditor(
  supabase: SupabaseClient,
  branchId: string,
  owner: BranchOwner,
): Promise<EditorState> {
  const start = await replayStart(supabase, branchId, owner);
  const rows = await fetchOperations(supabase, branchId, start.seq);
  const editor = editorReducer(createEditorState(start.document, start.seq), {
    type: "sync/pull",
    rows,
  });

  // Snapshots only speed up opening, so failing to save one is not an error.
  if (rows.length >= SNAPSHOT_INTERVAL) {
    await saveSnapshot(supabase, branchId, editor.seq, editor.confirmed).catch(
      (error) => console.warn("Snapshot not saved", error),
    );
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

    case "revision":
      check(
        await supabase.from("revisions").insert({
          id: entry.revisionId,
          branch_id: entry.branchId,
          kind: entry.revisionKind,
          title: entry.title,
        }),
      );
      return;

    case "branch":
      check(
        await supabase.from("branches").insert({
          id: entry.branchId,
          concept_id: entry.conceptId,
          title: entry.title,
          source_revision_id: entry.sourceRevisionId,
        }),
      );
      return;

    case "rename-branch":
      check(
        await supabase
          .from("branches")
          .update({ title: entry.title })
          .eq("id", entry.branchId),
      );
      return;

    case "archive-branch":
      check(
        await supabase
          .from("branches")
          .update({ archived_at: entry.archivedAt })
          .eq("id", entry.branchId),
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
