"use client";
import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace error", error);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <CircleAlert className="size-10 text-warning" />
      <h1 className="text-xl font-semibold">
        Não foi possível carregar o workspace
      </h1>
      <p className="text-sm text-muted-foreground">
        A conexão pode ter sido interrompida. Tente novamente. Se persistir,
        confira a configuração do Supabase e as migrations.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
