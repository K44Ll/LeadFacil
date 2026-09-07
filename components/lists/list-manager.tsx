"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Folder,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import { CompanyAvatar, EmptyState, formatDate } from "@/components/shared";
import { useMutation } from "@/hooks/use-mutation";
import type { LeadList } from "@/types/crm";
export function ListManager({
  lists,
  openInitially = false,
}: {
  lists: (LeadList & { count: number; companies: string[] })[];
  openInitially?: boolean;
}) {
  const [open, setOpen] = useState(openInitially);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<LeadList | null>(null);
  const { pending, mutate } = useMutation();
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Buscar listas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
            placeholder="Encontre uma lista..."
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="primary-cta h-9 px-4 text-xs">
              <Plus />
              Nova lista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Um lugar para suas oportunidades</DialogTitle>
              <DialogDescription>
                Crie uma lista para organizar leads do seu jeito.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                mutate(
                  {
                    type: "create_list",
                    name: String(form.get("name")),
                    description: String(form.get("description")),
                  },
                  () => setOpen(false),
                );
              }}
            >
              <label className="block">
                <span className="field-label">Nome da lista</span>
                <Input
                  name="name"
                  placeholder="Ex.: Prospectar esta semana"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label className="block">
                <span className="field-label">Descrição</span>
                <Textarea
                  name="description"
                  placeholder="Qual é o objetivo desta lista?"
                  maxLength={300}
                />
              </label>
              <Button className="w-full" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Plus />}Criar
                lista
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {lists
          .filter((l) => l.name.toLowerCase().includes(query.toLowerCase()))
          .map((list, i) => (
            <article
              key={list.id}
              className="panel group p-5 transition-colors hover:border-primary/30"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-xl border bg-primary/5 p-3 text-primary">
                  <Folder className="size-5" strokeWidth={1.5} />
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ações da lista ${list.name}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setDeleting(list)}
                      className="text-destructive"
                    >
                      <Trash2 />
                      Excluir lista
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Link href={`/listas/${list.id}`} className="block">
                <h2 className="flex items-center justify-between text-base font-medium">
                  {list.name}
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </h2>
                <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
                  {list.description ||
                    "Suas oportunidades, organizadas em um só lugar."}
                </p>
                <div className="mt-5 flex items-center justify-between border-t pt-4">
                  <div className="flex -space-x-1">
                    {list.companies.slice(0, 3).map((name, n) => (
                      <CompanyAvatar key={n} name={name} index={i + n} />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {list.count} leads
                  </span>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Criada em {formatDate(list.created_at)}
                </p>
              </Link>
            </article>
          ))}
      </div>
      {!lists.length && (
        <div className="panel">
          <EmptyState
            title="Espaço para suas melhores ideias."
            description="Crie sua primeira lista pelo botão Nova lista e adicione leads pela tabela."
            href="/listas?nova=1"
            action="Criar minha primeira lista"
          />
        </div>
      )}
      {lists.length > 0 &&
        !lists.some((l) =>
          l.name.toLowerCase().includes(query.toLowerCase()),
        ) && (
          <p className="panel p-10 text-center text-sm text-muted-foreground">
            Nenhuma lista encontrada com esse nome.
          </p>
        )}
      <Dialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              A lista será excluída. Seus leads continuarão disponíveis no CRM.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (deleting)
                  mutate({ type: "delete_list", id: deleting.id }, () =>
                    setDeleting(null),
                  );
              }}
            >
              Excluir lista
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
