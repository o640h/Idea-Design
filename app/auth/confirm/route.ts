import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchanges the token in a sign-in email link for a session cookie. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const url = request.nextUrl.clone();
  url.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  url.pathname = "/sign-in";
  url.searchParams.set("error", "link");
  return NextResponse.redirect(url);
}
