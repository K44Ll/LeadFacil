import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const publicRoute =
    /^\/(login|cadastro|recuperar-senha|redefinir-senha|auth)(\/|$)/.test(
      pathname,
    );
  if (!isSupabaseConfigured()) {
    if (pathname.startsWith("/api/"))
      return NextResponse.json(
        { error: "Autenticação não configurada." },
        { status: 503 },
      );
    return publicRoute
      ? response
      : NextResponse.redirect(new URL("/login", request.url));
  }
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  if ((!data?.claims || error) && !publicRoute) {
    const target = pathname.startsWith("/api/")
      ? NextResponse.json(
          { error: "Sessão expirada. Entre novamente." },
          { status: 401 },
        )
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    return target;
  }
  // Do not redirect POSTs: password recovery and sign-out use Server Actions.
  if (
    data?.claims &&
    request.method === "GET" &&
    ["/login", "/cadastro"].includes(pathname)
  ) {
    const target = NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    return target;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
