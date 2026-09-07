"use server";
import { revalidatePath } from "next/cache";
import { mutationSchema } from "@/lib/validation";
import { mutateWorkspace } from "@/lib/data/repository";
import type { ActionResult } from "@/types/crm";
export async function updateWorkspace(input: unknown): Promise<ActionResult> {
  const parsed = mutationSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "Dados inválidos.",
    };
  try {
    await mutateWorkspace(parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, message: "Alterações salvas." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && !error.message.includes("NEXT_REDIRECT")
          ? error.message
          : "Sua sessão expirou. Entre novamente.",
    };
  }
}
