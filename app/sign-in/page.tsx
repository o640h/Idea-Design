import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignInForm from "./form";

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/");
  }

  const { error } = await searchParams;

  return <SignInForm linkFailed={error === "link"} />;
}
