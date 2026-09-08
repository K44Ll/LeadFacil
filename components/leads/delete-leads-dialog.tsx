"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useMutation } from "@/hooks/use-mutation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lead } from "@/types/crm";

type DeleteTarget = Pick<Lead, "id" | "company_name">;

export function DeleteLeadsDialog({
  leads,
  open,
  onOpenChange,
  onDeleted,
}: {
  leads: DeleteTarget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const { pending, mutate } = useMutation();
  const count = leads.length;
  const title =
    count === 1 ? `Remover “${leads[0]?.company_name}”?` : `Remover ${count} leads?`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "O lead e todo o histórico relacionado serão excluídos permanentemente."
              : "Os leads selecionados e seus históricos serão excluídos permanentemente."}
          </DialogDescription>
        </DialogHeader>
        {count > 1 && (
          <div className="max-h-36 overflow-y-auto rounded-lg border bg-muted/25 p-3">
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {leads.slice(0, 8).map((lead) => (
                <li key={lead.id} className="truncate">
                  {lead.company_name}
                </li>
              ))}
              {count > 8 && <li>e mais {count - 8} leads…</li>}
            </ul>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !count}
            onClick={() =>
              mutate(
                { type: "delete_leads", ids: leads.map((lead) => lead.id) },
                () => {
                  onOpenChange(false);
                  onDeleted?.();
                },
              )
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {count === 1 ? "Excluir lead" : `Excluir ${count} leads`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteLeadButton({ lead }: { lead: DeleteTarget }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className="h-9 px-4 text-xs"
        onClick={() => setOpen(true)}
      >
        <Trash2 />
        Remover lead
      </Button>
      <DeleteLeadsDialog
        leads={[lead]}
        open={open}
        onOpenChange={setOpen}
        onDeleted={() => router.push("/leads")}
      />
    </>
  );
}
