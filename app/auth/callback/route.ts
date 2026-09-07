import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next =
    request.nextUrl.searchParams.get("next") === "/redefinir-senha"
      ? "/redefinir-senha"
      : "/";
  if (code) {
    try {
      const client = await createClient();
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        await ensureProfile(client, data.user);
        return NextResponse.redirect(new URL(next, request.url));
      }
    } catch {
      /* Show an actionable expired-link message. */
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
