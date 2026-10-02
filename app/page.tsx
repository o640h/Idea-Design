import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type ConceptSummary,
  listConcepts,
  listRevisions,
  loadEditor,
  sendEntry,
} from "@/lib/concepts/database";
import type { Workspace } from "@/lib/concepts/model";
import { createClient } from "@/lib/supabase/server";
import ConceptEditor from "./concept/editor";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/sign-in");
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, title")
    .eq("personal", true)
    .single<Workspace>();

  if (error) {
    throw error;
  }

  const concepts = await listConcepts(supabase, workspace.id);
  const live = concepts.filter(({ deletedAt }) => !deletedAt);

  // The editor always has a concept open, so an empty workspace gets one.
  if (!live.length) {
    const concept: ConceptSummary = {
      id: crypto.randomUUID(),
      title: "",
      deletedAt: null,
      branches: [
        {
          id: crypto.randomUUID(),
          title: "Main",
          main: true,
          archivedAt: null,
          sourceRevisionId: null,
        },
      ],
    };

    await sendEntry(supabase, {
      kind: "concept",
      id: crypto.randomUUID(),
      conceptId: concept.id,
      workspaceId: workspace.id,
      branchId: concept.branches[0].id,
    });
    concepts.push(concept);
    live.push(concept);
  }

  const cookieStore = await cookies();
  const lastConceptId = cookieStore.get("last_concept")?.value;
  const lastBranchId = cookieStore.get("last_branch")?.value;
  const opened = live.find(({ id }) => id === lastConceptId) ?? live[0];
  const branch =
    opened.branches.find(({ id }) => id === lastBranchId) ?? opened.branches[0];
  const owner = { conceptId: opened.id, workspaceId: workspace.id };

  return (
    <ConceptEditor
      workspace={workspace}
      email={data.claims.email}
      concepts={concepts}
      opened={{
        id: opened.id,
        branchId: branch.id,
        editor: await loadEditor(supabase, branch.id, owner),
        revisions: await listRevisions(supabase, opened.id),
      }}
    />
  );
}
