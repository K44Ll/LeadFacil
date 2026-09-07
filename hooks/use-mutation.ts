"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateWorkspace } from "@/app/actions";
import type { Mutation } from "@/lib/validation";
export function useMutation() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function mutate(input: Mutation, onSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await updateWorkspace(input);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        router.refresh();
        onSuccess?.();
      } catch {
        toast.error("Não foi possível conectar. Tente novamente.");
      }
    });
  }
  return { pending, mutate };
}
