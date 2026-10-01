import { redirect } from "next/navigation";
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

  return <ConceptEditor workspace={workspace} email={data.claims.email} />;
}
