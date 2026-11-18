import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback for email-confirmation links and OAuth (PKCE). Exchanges the
 * `code` for a session cookie, then redirects into the app.
 */
/** Only same-site, non-protocol-relative paths — never an off-site redirect. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/dashboard";
  // Reject "//host" and "/\host" which browsers resolve as absolute URLs.
  if (next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
