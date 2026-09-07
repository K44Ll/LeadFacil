import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    (type === "signup" || type === "recovery" || type === "email")
  ) {
    try {
      const client = await createClient();
      const { data, error } = await client.auth.verifyOtp({ token_hash, type });
      if (!error && data.user) {
        await ensureProfile(client, data.user);
        return NextResponse.redirect(
          new URL(type === "recovery" ? "/redefinir-senha" : "/", request.url),
        );
      }
    } catch {
      /* Invalid configuration or expired token. */
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
