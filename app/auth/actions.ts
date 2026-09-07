"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export interface AuthState {
  error?: string;
  success?: string;
}
const emailSchema = z.email("Informe um email válido.");
export async function authenticate(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const mode = String(form.get("mode"));
  if (!isSupabaseConfigured())
    return {
      error:
        "O serviço de autenticação está indisponível. Tente novamente mais tarde.",
    };
  if (!["login", "signup", "recover", "reset"].includes(mode))
    return { error: "Operação inválida." };
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const name = String(form.get("name") || "");
  if (mode !== "reset" && !emailSchema.safeParse(email).success)
    return { error: "Informe um email válido." };
  if (mode !== "recover" && (password.length < 8 || password.length > 128))
    return { error: "Use uma senha entre 8 e 128 caracteres." };
  if (mode === "signup" && (name.trim().length < 2 || name.length > 80))
    return { error: "Informe seu nome, entre 2 e 80 caracteres." };
  let success = false;
  try {
    const client = await createClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (mode === "recover") {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
      });
      if (error)
        return {
          error:
            "Não foi possível solicitar a recuperação. Aguarde um momento e tente novamente.",
        };
      return {
        success:
          "Se houver uma conta com este email, você receberá um link para redefinir sua senha.",
      };
    }
    if (mode === "reset") {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user)
        return {
          error: "O link expirou. Solicite um novo email de recuperação.",
        };
      const { error } = await client.auth.updateUser({ password });
      if (error)
        return {
          error:
            "Não foi possível atualizar a senha. Tente uma senha diferente.",
        };
      success = true;
    }
    if (mode === "signup") {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (error)
        return {
          error:
            "Não foi possível criar a conta. Verifique os dados ou tente novamente mais tarde.",
        };
      if (!data.session)
        return {
          success:
            "Confira seu email para confirmar o cadastro e entrar no seu workspace.",
        };
      if (data.user) await ensureProfile(client, data.user);
      success = true;
    }
    if (mode === "login") {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        return {
          error:
            "Não foi possível entrar. Confira seu email e senha e tente novamente.",
        };
      if (data.user) await ensureProfile(client, data.user);
      success = true;
    }
  } catch {
    return {
      error: "Falha ao conectar. Verifique sua conexão e tente novamente.",
    };
  }
  if (success) redirect("/");
  return {};
}
export async function logout() {
  if (isSupabaseConfigured()) {
    const client = await createClient();
    await client.auth.signOut();
  }
  redirect("/login");
}
