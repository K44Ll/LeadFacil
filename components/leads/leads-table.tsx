"use client";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderPlus,
  Globe,
  GlobeLock,
  ListFilter,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useMutation } from "@/hooks/use-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteLeadsDialog } from "@/components/leads/delete-leads-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CompanyAvatar,
  EmptyState,
  ScoreBadge,
  StatusBadge,
  formatDate,
} from "@/components/shared";
import {
  STATUSES,
  type Lead,
  type LeadList,
  type LeadStatus,
  type Tag,
} from "@/types/crm";
export interface LeadFilters {
  q?: string;
  status?: string;
  tag?: string;
  website?: string;
  sort?: string;
}
function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
export function LeadsTable({
  leads,
  lists,
  tags,
  initial = {},
  listId,
}: {
  leads: Lead[];
  lists: LeadList[];
  tags: Tag[];
  initial?: LeadFilters;
  listId?: string;
}) {
  const [query, setQuery] = useState(initial.q || "");
  const deferred = useDeferredValue(query);
  const [status, setStatus] = useState(initial.status || "");
  const [tag, setTag] = useState(initial.tag || "");
  const [website, setWebsite] = useState(initial.website || "");
  const [sort, setSort] = useState(initial.sort || "recent");
  const [direction, setDirection] = useState(-1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [filters, setFilters] = useState(false);
  const { pending, mutate } = useMutation();
  const filtered = leads
    .filter(
      (l) =>
        (!listId || l.list_ids.includes(listId)) &&
        (!status || l.status === status) &&
        (!tag || l.tag_ids.includes(tag)) &&
        (!website || (website === "no" ? !l.website : !!l.website)) &&
        `${l.company_name} ${l.category} ${l.city} ${l.state}`
          .toLocaleLowerCase("pt-BR")
          .includes(deferred.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) => {
      if (sort === "score") return (a.score - b.score) * direction;
      if (sort === "name")
        return (
          a.company_name.localeCompare(b.company_name, "pt-BR") * direction
        );
      if (sort === "rating")
        return ((a.google_rating || 0) - (b.google_rating || 0)) * direction;
      return a.created_at.localeCompare(b.created_at) * direction;
    });
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, maxPage);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const checked =
    visible.length > 0 && visible.every((l) => selected.includes(l.id));
  const activeSelected = selected.filter((id) =>
    filtered.some((l) => l.id === id),
  );
  const deleteTargets = leads.filter((lead) => deleteIds.includes(lead.id));
  function toggle(id: string) {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }
  function order(key: string) {
    setSort(key);
    setDirection(sort === key ? -direction : key === "name" ? 1 : -1);
  }
  function exportCsv() {
    const rows = activeSelected.length
      ? filtered.filter((l) => activeSelected.includes(l.id))
      : filtered;
    const headings = [
      "Empresa",
      "Nicho",
      "Cidade",
      "Estado",
      "Score",
      "Avaliação",
      "Reviews",
      "Telefone",
      "Email",
      "Website",
      "Status",
      "Fonte",
    ];
    const csv =
      "\uFEFF" +
      [
        headings,
        ...rows.map((l) => [
          l.company_name,
          l.category,
          l.city,
          l.state,
          l.score,
          l.google_rating,
          l.review_count,
          l.phone,
          l.email,
          l.website,
          l.status,
          l.source,
        ]),
      ]
        .map((row) => row.map(csvCell).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "leadfacil-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="relative min-w-48 flex-1 sm:max-w-80">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Buscar leads na tabela"
            placeholder="Buscar empresa, nicho ou cidade..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="h-9 pl-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setFilters(!filters)}
            className="h-9 text-xs"
            aria-expanded={filters}
          >
            <ListFilter className="size-3.5" />
            Filtros
            {(status || tag || website) && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </Button>
          <select
            aria-label="Ordenar leads"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setDirection(-1);
            }}
            className="native-select hidden sm:block"
          >
            <option value="recent">Mais recentes</option>
            <option value="score">Maior score</option>
            <option value="name">Empresa</option>
            <option value="rating">Avaliação</option>
          </select>
          <Button
            variant="outline"
            className="h-9 text-xs"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>
      {filters && (
        <div className="flex flex-wrap items-end gap-3 border-b bg-muted/20 p-4">
          <label className="text-xs">
            <span className="mb-1.5 block text-muted-foreground">Status</span>
            <select
              className="native-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1.5 block text-muted-foreground">Website</span>
            <select
              className="native-select"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="no">Sem website</option>
              <option value="yes">Com website</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1.5 block text-muted-foreground">Tags</span>
            <select
              className="native-select"
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="ghost"
            className="h-9 text-xs"
            onClick={() => {
              setStatus("");
              setWebsite("");
              setTag("");
              setQuery("");
            }}
          >
            Limpar filtros
            <X className="size-3" />
          </Button>
        </div>
      )}
      {activeSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-primary/5 px-4 py-3">
          <span className="text-xs text-primary">
            {activeSelected.length} selecionado(s)
          </span>
          <select
            aria-label="Alterar status dos selecionados"
            className="native-select"
            disabled={pending}
            value=""
            onChange={(e) =>
              mutate(
                {
                  type: "status",
                  ids: activeSelected,
                  status: e.target.value as LeadStatus,
                },
                () => setSelected([]),
              )
            }
          >
            <option value="" disabled>
              Alterar status
            </option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-xs" disabled={pending}>
                <FolderPlus className="size-3" />
                Adicionar à lista
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {lists.length ? (
                lists.map((l) => (
                  <DropdownMenuItem
                    key={l.id}
                    onSelect={() =>
                      mutate(
                        {
                          type: "list_membership",
                          ids: activeSelected,
                          list_id: l.id,
                          remove: false,
                        },
                        () => setSelected([]),
                      )
                    }
                  >
                    {l.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/listas?nova=1">Criar primeira lista</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {listId && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                mutate(
                  {
                    type: "list_membership",
                    ids: activeSelected,
                    list_id: listId,
                    remove: true,
                  },
                  () => setSelected([]),
                )
              }
            >
              Remover desta lista
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => setDeleteIds(activeSelected)}
          >
            <Trash2 />
            Remover
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setSelected([])}
            aria-label="Desmarcar seleção"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
      {!filtered.length ? (
        <EmptyState
          title={
            leads.length ? "Nenhum lead corresponde à sua busca." : undefined
          }
          description={
            leads.length
              ? "Experimente outros termos ou remova os filtros para ampliar os resultados."
              : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1080px] text-left text-xs">
              <thead className="bg-muted/20 text-[10px] text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      aria-label="Selecionar leads desta página"
                      checked={
                        checked
                          ? true
                          : visible.some((l) => selected.includes(l.id))
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={() =>
                        setSelected((ids) =>
                          checked
                            ? ids.filter(
                                (id) => !visible.some((l) => l.id === id),
                              )
                            : [
                                ...new Set([
                                  ...ids,
                                  ...visible.map((l) => l.id),
                                ]),
                              ],
                        )
                      }
                    />
                  </th>
                  <th className="px-4 font-normal">
                    <button
                      onClick={() => order("name")}
                      className="flex items-center gap-1"
                    >
                      Empresa
                      <ArrowDownUp className="size-2.5" />
                    </button>
                  </th>
                  {["Nicho", "Localização"].map((h) => (
                    <th key={h} className="px-4 font-normal">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 font-normal">
                    <button
                      onClick={() => order("score")}
                      className="flex items-center gap-1"
                    >
                      Score
                      <ArrowDownUp className="size-2.5" />
                    </button>
                  </th>
                  <th className="px-4 font-normal">Avaliação</th>
                  <th className="px-4 font-normal">Reviews</th>
                  <th className="px-4 font-normal">Website</th>
                  <th className="px-4 font-normal">Contato</th>
                  <th className="px-4 font-normal">Status</th>
                  <th className="whitespace-nowrap px-4 font-normal">
                    Encontrado em
                  </th>
                  <th className="px-4">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className="lead-row border-t transition-colors hover:bg-muted/30 data-[selected=true]:bg-accent/25"
                    data-selected={selected.includes(lead.id)}
                  >
                    <td>
                      <Checkbox
                        aria-label={`Selecionar ${lead.company_name}`}
                        checked={selected.includes(lead.id)}
                        onCheckedChange={() => toggle(lead.id)}
                      />
                    </td>
                    <td>
                      <Link
                        className="flex min-w-40 items-center gap-2.5"
                        href={`/leads/${lead.id}`}
                      >
                        <CompanyAvatar name={lead.company_name} index={i} />
                        <span className="font-medium">{lead.company_name}</span>
                      </Link>
                    </td>
                    <td className="text-[11px] text-muted-foreground">
                      {lead.category}
                    </td>
                    <td className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {lead.city}
                      <span className="mt-1 block text-[10px]">
                        {lead.state}
                      </span>
                    </td>
                    <td>
                      <ScoreBadge score={lead.score} />
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Star className="size-3 text-warning" />
                        {lead.google_rating?.toFixed(1) || "—"}
                      </span>
                    </td>
                    <td className="text-muted-foreground">
                      {lead.review_count}
                    </td>
                    <td>
                      <span
                        className={`flex items-center gap-1.5 whitespace-nowrap text-[10px] ${lead.website ? "text-muted-foreground" : "text-warning"}`}
                      >
                        {lead.website ? (
                          <Globe className="size-3" />
                        ) : (
                          <GlobeLock className="size-3" />
                        )}
                        {lead.website ? "Com site" : "Sem site"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex gap-2 text-muted-foreground"
                        aria-label={`Contatos de ${lead.company_name}`}
                      >
                        {lead.phone && <Phone className="size-3.5" />}
                        {lead.email && <Mail className="size-3.5" />}
                        {!lead.phone && !lead.email && "—"}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </td>
                    <td>
                      <LeadMenu
                        lead={lead}
                        pending={pending}
                        onDelete={() => setDeleteIds([lead.id])}
                        setStatus={(status) =>
                          mutate({ type: "status", ids: [lead.id], status })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {visible.map((lead, i) => (
              <div key={lead.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    aria-label={`Selecionar ${lead.company_name}`}
                    checked={selected.includes(lead.id)}
                    onCheckedChange={() => toggle(lead.id)}
                  />
                  <CompanyAvatar name={lead.company_name} index={i} />
                  <Link className="min-w-0 flex-1" href={`/leads/${lead.id}`}>
                    <p className="truncate text-sm font-medium">
                      {lead.company_name}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {lead.category} · {lead.city}
                    </p>
                  </Link>
                  <ScoreBadge score={lead.score} />
                </div>
                <div className="mt-3 flex items-center justify-between pl-7">
                  <StatusBadge status={lead.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {lead.website ? "Com website" : "Sem website"}
                  </span>
                  <LeadMenu
                    lead={lead}
                    pending={pending}
                    onDelete={() => setDeleteIds([lead.id])}
                    setStatus={(status) =>
                      mutate({ type: "status", ids: [lead.id], status })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[10px] text-muted-foreground">
        <span>
          {filtered.length
            ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}`
            : "0"}{" "}
          de {filtered.length} leads
        </span>
        <div className="flex items-center gap-3">
          <select
            aria-label="Leads por página"
            className="native-select h-7 text-[10px]"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
          <span>
            {currentPage} / {maxPage}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-3" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={currentPage >= maxPage}
            onClick={() => setPage(currentPage + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
      <DeleteLeadsDialog
        leads={deleteTargets}
        open={deleteTargets.length > 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteIds([]);
        }}
        onDeleted={() => {
          setSelected((ids) => ids.filter((id) => !deleteIds.includes(id)));
          setDeleteIds([]);
        }}
      />
    </section>
  );
}
function LeadMenu({
  lead,
  pending,
  onDelete,
  setStatus,
}: {
  lead: Lead;
  pending: boolean;
  onDelete: () => void;
  setStatus: (status: LeadStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Ações de ${lead.company_name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/leads/${lead.id}`}>
            <ArrowUpRight />
            Abrir detalhes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mover para</DropdownMenuLabel>
        {STATUSES.map((status) => (
          <DropdownMenuItem key={status} onSelect={() => setStatus(status)}>
            {status}
            {lead.status === status && (
              <Check className="ml-auto size-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={onDelete}
        >
          <Trash2 />
          Remover lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
