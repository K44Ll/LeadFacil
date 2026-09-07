"use client";
import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
} from "lucide-react";
import { STATUSES, type Lead, type LeadStatus, type Tag } from "@/types/crm";
import { useMutation } from "@/hooks/use-mutation";
import {
  CompanyAvatar,
  EmptyState,
  ScoreBadge,
  StatusBadge,
  formatDate,
} from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function Kanban({ leads, tags }: { leads: Lead[]; tags: Tag[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const { pending, mutate } = useMutation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const filtered = leads.filter((l) =>
    `${l.company_name} ${l.city} ${l.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function move(id: string, status: LeadStatus) {
    mutate({ type: "status", ids: [id], status });
  }
  function onEnd(event: DragEndEvent) {
    setActive(null);
    const status = event.over?.id as LeadStatus;
    if (
      status &&
      STATUSES.includes(status) &&
      leads.find((l) => l.id === event.active.id)?.status !== status
    )
      move(String(event.active.id), status);
  }
  const activeLead = leads.find((l) => l.id === active);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no pipeline..."
            aria-label="Buscar no pipeline"
            className="h-9 pl-9 text-xs"
          />
        </div>
        <p
          role="status"
          className="flex items-center gap-2 text-[11px] text-muted-foreground"
        >
          {pending ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Salvando nova etapa...
            </>
          ) : (
            <>Arraste um card ou use o menu para mudar de etapa.</>
          )}
        </p>
      </div>
      {!leads.length ? (
        <div className="panel">
          <EmptyState
            title="Seu pipeline está vazio."
            description="Leads adicionados aparecerão aqui. Cada conversa é um novo passo."
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActive(String(e.active.id))}
          onDragEnd={onEnd}
          onDragCancel={() => setActive(null)}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Pressione espaço para arrastar. Use as setas para mover e espaço para soltar. Também é possível mudar a etapa pelo menu do card.",
            },
          }}
        >
          <div className="flex min-h-[65vh] gap-4 overflow-x-auto pb-5">
            {STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                count={filtered.filter((l) => l.status === status).length}
              >
                {filtered
                  .filter((l) => l.status === status)
                  .sort((a, b) => b.score - a.score)
                  .map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      tags={tags}
                      pending={pending}
                      move={move}
                    />
                  ))}
              </Column>
            ))}
          </div>
          <DragOverlay>
            {activeLead ? (
              <div className="w-[240px] rotate-2 rounded-xl border border-primary bg-card p-4 shadow-xl">
                <p className="mb-3 text-sm font-medium">
                  {activeLead.company_name}
                </p>
                <ScoreBadge score={activeLead.score} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  );
}
function Column({
  status,
  count,
  children,
}: {
  status: LeadStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`flex w-[255px] shrink-0 flex-col rounded-xl border p-3 transition-colors ${isOver ? "border-primary/50 bg-primary/5" : "border-transparent bg-muted/20"}`}
      aria-label={`Etapa ${status}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-[10px] text-muted-foreground">{count}</span>
        </div>
        <Link
          href="/buscar"
          aria-label={`Adicionar lead em ${status}`}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-3.5" />
        </Link>
      </div>
      <div className="space-y-3">{children}</div>
      {!count && (
        <div className="mt-2 rounded-lg border border-dashed p-7 text-center text-[11px] leading-5 text-muted-foreground">
          Arraste uma oportunidade
          <br />
          para esta etapa.
        </div>
      )}
    </section>
  );
}
function KanbanCard({
  lead,
  tags,
  pending,
  move,
}: {
  lead: Lead;
  tags: Tag[];
  pending: boolean;
  move: (id: string, status: LeadStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id, disabled: pending });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : 1,
      }}
      className="panel p-3.5"
    >
      <div className="mb-3 flex items-center gap-2">
        <CompanyAvatar name={lead.company_name} />
        <span className="ml-auto">
          <ScoreBadge score={lead.score} />
        </span>
        <button
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${lead.company_name}`}
          className="touch-none text-muted-foreground"
        >
          <GripVertical className="size-3.5" />
        </button>
      </div>
      <Link
        href={`/leads/${lead.id}`}
        className="block text-xs font-medium hover:text-primary"
      >
        {lead.company_name}
      </Link>
      <p className="mt-1 text-[10px] text-muted-foreground">{lead.category}</p>
      <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="size-3" />
        {lead.city}, {lead.state}
      </p>
      <div className="mb-3 mt-3 flex flex-wrap gap-1">
        {tags
          .filter((t) => lead.tag_ids.includes(t.id))
          .slice(0, 2)
          .map((t) => (
            <span
              key={t.id}
              className="rounded border bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
            >
              {t.name}
            </span>
          ))}
      </div>
      <div className="flex items-center justify-between border-t pt-2">
        <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
          {lead.phone && <Phone className="size-2.5" />}
          {lead.last_contacted_at
            ? `Contato em ${formatDate(lead.last_contacted_at)}`
            : "Ainda sem contato"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={pending}
              aria-label={`Mover ${lead.company_name}`}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mover para</DropdownMenuLabel>
            {STATUSES.filter((s) => s !== lead.status).map((status) => (
              <DropdownMenuItem
                key={status}
                onSelect={() => move(lead.id, status)}
              >
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
