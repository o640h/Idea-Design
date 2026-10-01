import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type ConceptSummary,
  listConcepts,
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
      mainBranchId: crypto.randomUUID(),
    };

    await sendEntry(supabase, {
      kind: "concept",
      id: crypto.randomUUID(),
      conceptId: concept.id,
      workspaceId: workspace.id,
      branchId: concept.mainBranchId,
    });
    concepts.push(concept);
    live.push(concept);
  }

  const lastConceptId = (await cookies()).get("last_concept")?.value;
  const opened = live.find(({ id }) => id === lastConceptId) ?? live[0];

  return (
    <ConceptEditor
      workspace={workspace}
      email={data.claims.email}
      concepts={concepts}
      opened={{
        id: opened.id,
        editor: await loadEditor(supabase, opened, workspace.id),
      }}
    />
  );
}
