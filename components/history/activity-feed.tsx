"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, MessageSquare, Search } from "lucide-react";
import { EmptyState, formatDate } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  INTERACTION_TYPES,
  type Interaction,
  type SearchRecord,
} from "@/types/crm";
export function ActivityFeed({
  interactions,
  searches,
}: {
  interactions: (Interaction & { company_name: string })[];
  searches: SearchRecord[];
}) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const events = [
    ...interactions.map((i) => ({
      id: i.id,
      date: i.happened_at,
      type: i.type,
      title: i.company_name,
      description: i.observation,
      result: i.result,
      href: `/leads/${i.lead_id}`,
      search: false,
    })),
    ...searches.map((s) => ({
      id: s.id,
      date: s.created_at,
      type: "Busca",
      title: `${s.niche} em ${s.location}`,
      description:
        s.status === "failed"
          ? "A pesquisa não foi concluída."
          : `${s.result_count} novos leads salvos · ${s.provider}`,
      result: "",
      href: "/buscar",
      search: true,
    })),
  ]
    .filter(
      (e) =>
        (tab === "all" || (tab === "searches" ? e.search : !e.search)) &&
        (!type || e.type === type) &&
        `${e.title} ${e.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
        <div
          className="flex gap-1"
          role="tablist"
          aria-label="Filtrar atividade"
        >
          {[
            { id: "all", label: "Tudo" },
            { id: "contacts", label: "Interações" },
            { id: "searches", label: "Buscas" },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-xs ${tab === t.id ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            className="h-9 w-48 text-xs"
            placeholder="Buscar no histórico..."
            aria-label="Buscar no histórico"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Tipo de atividade"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="native-select"
          >
            <option value="">Todos os tipos</option>
            {[...INTERACTION_TYPES, "Sistema", "Busca"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {!events.length ? (
        <EmptyState
          title="Sua história está começando."
          description="Buscas, conversas e mudanças no pipeline aparecerão aqui."
        />
      ) : (
        <div className="divide-y">
          {events.map((e) => (
            <div key={e.id} className="flex gap-4 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/30 text-primary">
                {e.search ? (
                  <Search className="size-4" />
                ) : e.type === "Sistema" ? (
                  <Clock3 className="size-4" />
                ) : (
                  <MessageSquare className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={e.href}
                    className="text-xs font-medium hover:text-primary"
                  >
                    {e.title}
                  </Link>
                  <span className="rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {e.type}
                  </span>
                  <time className="text-[10px] text-muted-foreground sm:ml-auto">
                    {formatDate(e.date, true)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {e.description}
                </p>
                {e.result && <p className="mt-1 text-[11px]">{e.result}</p>}
              </div>
              <Link
                href={e.href}
                aria-label={`Abrir ${e.title}`}
                className="self-center text-muted-foreground"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
