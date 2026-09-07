import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
import type { Database } from "@/types/database";
export async function createClient() {
  const { url, key } = supabaseConfig();
  if (!url || !key)
    throw new Error(
      "Configure as credenciais públicas do Supabase no arquivo .env.",
    );
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Read-only Server Component; proxy refreshes cookies. */
        }
      },
    },
  });
}
