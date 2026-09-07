import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
export async function ensureProfile(
  client: SupabaseClient<Database>,
  user: User,
) {
  const metadataName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim().slice(0, 80)
      : "";
  const name = metadataName.length >= 2 ? metadataName : "Meu perfil";
  const { error } = await client
    .from("profiles")
    .upsert(
      { id: user.id, name },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error)
    throw new Error(
      "Não foi possível preparar seu perfil. Tente entrar novamente.",
    );
}
