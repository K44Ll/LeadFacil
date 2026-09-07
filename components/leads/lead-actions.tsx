"use client";
import { useState } from "react";
import {
  Check,
  FolderPlus,
  Loader2,
  Plus,
  Save,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { useMutation } from "@/hooks/use-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STATUSES,
  INTERACTION_TYPES,
  type Lead,
  type LeadList,
  type Tag,
  type LeadStatus,
} from "@/types/crm";
export function LeadStatusControl({ lead }: { lead: Lead }) {
  const { pending, mutate } = useMutation();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Status
      <select
        className="native-select"
        value={lead.status}
        disabled={pending}
        onChange={(e) =>
          mutate({
            type: "status",
            ids: [lead.id],
            status: e.target.value as LeadStatus,
          })
        }
      >
        {STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {pending && <Loader2 className="size-3 animate-spin" />}
    </label>
  );
}
export function LeadNotes({ lead }: { lead: Lead }) {
  const [notes, setNotes] = useState(lead.notes);
  const { pending, mutate } = useMutation();
  return (
    <section className="panel p-5">
      <h2 className="mb-1 text-sm font-medium">Suas anotaÃ§Ãµes</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Contexto que torna a prÃ³xima conversa melhor.
      </p>
      <label htmlFor="lead-notes" className="sr-only">
        AnotaÃ§Ãµes comerciais
      </label>
      <Textarea
        id="lead-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="O que vocÃª precisa lembrar sobre esta empresa?"
        className="min-h-32 text-xs"
        maxLength={10000}
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {notes.length.toLocaleString("pt-BR")} / 10.000
        </span>
        <Button
          className="text-xs"
          disabled={pending || notes === lead.notes}
          onClick={() => mutate({ type: "notes", id: lead.id, notes })}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Save />}Salvar
          notas
        </Button>
      </div>
    </section>
  );
}
export function InteractionForm({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [contactDate, setContactDate] = useState("");
  const { pending, mutate } = useMutation();
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          const now = new Date();
          setContactDate(
            new Date(now.getTime() - now.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16),
          );
        }
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button className="primary-cta h-9 px-4 text-xs">
          <Plus />
          Registrar interaÃ§Ã£o
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uma conversa, um passo adiante</DialogTitle>
          <DialogDescription>
            Registre o contato para manter o histÃ³rico sempre em dia.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const date = new Date(String(form.get("date")));
            if (!Number.isFinite(date.getTime())) return;
            mutate(
              {
                type: "interaction",
                lead_id: leadId,
                kind: String(
                  form.get("kind"),
                ) as (typeof INTERACTION_TYPES)[number],
                observation: String(form.get("observation")),
                result: String(form.get("result")),
                happened_at: date.toISOString(),
              },
              () => setOpen(false),
            );
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="field-label">Tipo de contato</span>
              <select name="kind" className="native-select w-full">
                {INTERACTION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Data e hora</span>
              <Input
                name="date"
                type="datetime-local"
                required
                defaultValue={contactDate}
              />
            </label>
          </div>
          <label className="block">
            <span className="field-label">O que aconteceu?</span>
            <Textarea
              name="observation"
              required
              minLength={2}
              maxLength={5000}
              placeholder="Conte um pouco sobre a conversa..."
            />
          </label>
          <label className="block">
            <span className="field-label">Resultado ou prÃ³ximo passo</span>
            <Input
              name="result"
              maxLength={500}
              placeholder="Ex.: Enviar proposta atÃ© sexta-feira"
            />
          </label>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}Salvar
            interaÃ§Ã£o
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function LeadOrganization({
  lead,
  lists,
  tags,
}: {
  lead: Lead;
  lists: LeadList[];
  tags: Tag[];
}) {
  const { pending, mutate } = useMutation();
  return (
    <section className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">OrganizaÃ§Ã£o</h2>
        <TagIcon className="size-4 text-muted-foreground" />
      </div>
      <p className="eyebrow mb-2">Tags</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {tags
          .filter((t) => lead.tag_ids.includes(t.id))
          .map((t) => (
            <button
              key={t.id}
              disabled={pending}
              aria-label={`Remover tag ${t.name}`}
              onClick={() =>
                mutate({
                  type: "tag_membership",
                  id: lead.id,
                  tag_id: t.id,
                  remove: true,
                })
              }
              className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-[10px]"
            >
              {t.name}
              <X className="size-2.5" />
            </button>
          ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" disabled={pending}>
              <Plus className="size-3" />
              Tag
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {tags
              .filter((t) => !lead.tag_ids.includes(t.id))
              .map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() =>
                    mutate({
                      type: "tag_membership",
                      id: lead.id,
                      tag_id: t.id,
                      remove: false,
                    })
                  }
                >
                  {t.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="eyebrow mb-2">Listas</p>
      <div className="space-y-2">
        {lists
          .filter((l) => lead.list_ids.includes(l.id))
          .map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs"
            >
              {l.name}
              <button
                disabled={pending}
                aria-label={`Remover da lista ${l.name}`}
                onClick={() =>
                  mutate({
                    type: "list_membership",
                    ids: [lead.id],
                    list_id: l.id,
                    remove: true,
                  })
                }
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[11px]"
              disabled={pending}
            >
              <FolderPlus />
              Adicionar a uma lista
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {lists
              .filter((l) => !lead.list_ids.includes(l.id))
              .map((l) => (
                <DropdownMenuItem
                  key={l.id}
                  onSelect={() =>
                    mutate({
                      type: "list_membership",
                      ids: [lead.id],
                      list_id: l.id,
                      remove: false,
                    })
                  }
                >
                  {l.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
