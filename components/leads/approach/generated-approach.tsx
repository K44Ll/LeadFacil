"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GeneratedApproach({
  value,
  model,
  onChange,
  onRegenerate,
  onConfigure,
}: {
  value: string;
  model: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  onConfigure: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Abordagem copiada.");
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      toast.error("Não foi possível copiar a abordagem.");
    }
  }

  return (
    <section aria-live="polite">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-primary">
              Sua abordagem está pronta
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {editing ? "Ajuste livremente antes de copiar." : `Gerada com ${model}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? <Check /> : <Pencil />}
            {editing ? "Concluir" : "Editar"}
          </Button>
        </div>
        {editing ? (
          <Textarea
            aria-label="Editar abordagem gerada"
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, 1_600))}
            className="min-h-44 bg-background text-sm leading-6"
            maxLength={1_600}
            autoFocus
          />
        ) : (
          <p className="whitespace-pre-wrap rounded-lg bg-background/70 p-4 text-sm leading-6">
            {value}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="primary-cta flex-1" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copiado" : "Copiar mensagem"}
          </Button>
          <Button type="button" variant="outline" onClick={onRegenerate}>
            <RefreshCw />
            Gerar novamente
          </Button>
          <Button type="button" variant="ghost" onClick={onConfigure}>
            <SlidersHorizontal />
            Mudar abordagem
          </Button>
        </div>
      </div>
    </section>
  );
}
