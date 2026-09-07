"use client";

import { useState } from "react";
import { Bot, Check, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OutreachChannel } from "@/lib/ai/schemas";

export function AiOutreach({
  leadId,
  configured,
}: {
  leadId: string;
  configured: boolean;
}) {
  const [channel, setChannel] = useState<OutreachChannel>("whatsapp");
  const [result, setResult] = useState("");
  const [model, setModel] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setPending(true);
    setCopied(false);
    try {
      const response = await fetch("/api/ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, channel }),
      });
      const body = (await response.json()) as {
        text?: string;
        model?: string;
        error?: string;
      };
      if (!response.ok || !body.text) {
        throw new Error(body.error || "Não foi possível gerar a abordagem.");
      }
      setResult(body.text);
      setModel(body.model || "");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a abordagem.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success("Abordagem copiada.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar a abordagem.");
    }
  }

  return (
    <section className="hero-pattern panel overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4 text-primary" /> Assistente de abordagem
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Crie uma primeira mensagem enviando os dados deste lead ao modelo
            configurado.
          </p>
        </div>
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-40 flex-1">
          <span className="field-label">Canal</span>
          <select
            className="native-select w-full"
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value as OutreachChannel);
              setResult("");
            }}
            disabled={pending || !configured}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="ligacao">Ligação</option>
          </select>
        </label>
        <Button onClick={generate} disabled={pending || !configured}>
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {result ? "Gerar novamente" : "Gerar abordagem"}
        </Button>
      </div>

      {!configured && (
        <p className="mt-4 rounded-lg border border-dashed p-3 text-[11px] leading-5 text-muted-foreground">
          Configure <code>OPENROUTER_API_KEY</code> e{" "}
          <code>OPENROUTER_MODEL</code> no arquivo <code>.env</code> para
          habilitar.
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border bg-background/55 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[10px] text-muted-foreground">
              Gerado por {model}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copy}
              aria-label="Copiar abordagem"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-xs leading-6">{result}</p>
        </div>
      )}
    </section>
  );
}
