"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Compass,
  ExternalLink,
  Camera,
  Globe2,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { searchSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { SearchPreview, SearchRecord } from "@/types/crm";
import { formatDate, ScoreBadge } from "@/components/shared";

const steps = [
  "Buscando estabelecimentos",
  "Descobrindo websites e contatos",
  "Validando dados públicos",
  "Analisando oportunidades",
  "Salvando no LeadFácil",
];
const niches = [
  "Barbearias",
  "Restaurantes",
  "Dentistas",
  "Clínicas",
  "Academias",
  "Oficinas",
  "Advogados",
  "Salões de beleza",
  "Escolas",
  "Imobiliárias",
  "Refrigeração",
];
const filters = [
  ["all", "Todos"],
  ["best", "Melhores oportunidades"],
  ["no-site", "Sem site"],
  ["site", "Com site"],
  ["whatsapp", "Com WhatsApp"],
  ["instagram", "Com Instagram"],
  ["phone", "Com telefone"],
  ["email", "Com e-mail"],
  ["confidence", "Alta confiança"],
] as const;

type SearchResult = {
  count: number;
  matched: number;
  provider: string;
  ephemeral: boolean;
};
function leadKey(lead: SearchPreview) {
  return `${lead.company_name}-${lead.google_maps_url}`;
}
function contactCount(lead: SearchPreview) {
  return [
    lead.phone,
    lead.whatsapp,
    lead.email,
    lead.website,
    lead.instagram,
    lead.facebook,
    lead.linkedin,
  ].filter(Boolean).length;
}

export function SearchForm({
  searches,
  configured,
}: {
  searches: SearchRecord[];
  configured: boolean;
}) {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [quantity, setQuantity] = useState(25);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [leads, setLeads] = useState<SearchPreview[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [quickFilter, setQuickFilter] = useState("all");
  const [order, setOrder] = useState("score");

  const visibleLeads = useMemo(
    () =>
      [...leads]
        .filter((lead) => {
          if (quickFilter === "best") return lead.score >= 70;
          if (quickFilter === "no-site") return !lead.website;
          if (quickFilter === "site") return Boolean(lead.website);
          if (quickFilter === "whatsapp") return Boolean(lead.whatsapp);
          if (quickFilter === "instagram") return Boolean(lead.instagram);
          if (quickFilter === "phone") return Boolean(lead.phone);
          if (quickFilter === "email") return Boolean(lead.email);
          if (quickFilter === "confidence")
            return lead.enrichment_confidence >= 0.9;
          return true;
        })
        .sort((a, b) => {
          if (order === "name")
            return a.company_name.localeCompare(b.company_name, "pt-BR");
          if (order === "distance")
            return (
              (a.discovery_distance_m ?? Infinity) -
              (b.discovery_distance_m ?? Infinity)
            );
          if (order === "contacts") return contactCount(b) - contactCount(a);
          return b.score - a.score;
        }),
    [leads, order, quickFilter],
  );

  function upsertLead(incoming: SearchPreview) {
    setLeads((current) => {
      const index = current.findIndex(
        (lead) => leadKey(lead) === leadKey(incoming),
      );
      if (index < 0) return [...current, incoming];
      const next = [...current];
      next[index] = incoming;
      return next;
    });
  }

  async function search(form: HTMLFormElement) {
    const fields = new FormData(form);
    const parsed = searchSchema.safeParse({
      niche,
      city: fields.get("city"),
      state: fields.get("state"),
      country: fields.get("country"),
      radius_km: fields.get("radius_km"),
      quantity,
      no_website: !!checks.no_website,
      has_phone: !!checks.has_phone,
      has_whatsapp: !!checks.has_whatsapp,
      has_instagram: !!checks.has_instagram,
      min_rating: fields.get("min_rating"),
      min_reviews: fields.get("min_reviews"),
      min_score: fields.get("min_score"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setLeads([]);
    setProgress({ completed: 0, total: 0 });
    setStep(0);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.status === 401) {
        router.replace("/login?error=session");
        return;
      }
      if (!response.ok)
        throw new Error(
          (await response.json()).error || "A busca não pôde ser iniciada.",
        );
      if (!response.body) throw new Error("A conexão não retornou dados.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = false;
      const processEvent = (line: string) => {
        if (!line) return;
        const event = JSON.parse(line);
        if (event.type === "step") setStep(Number(event.step));
        if (event.type === "progress")
          setProgress({
            completed: Number(event.completed) || 0,
            total: Number(event.total) || 0,
          });
        if (event.type === "lead" && event.lead)
          upsertLead(event.lead as SearchPreview);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "complete") {
          setResult({
            count: Number(event.count),
            matched: Number(event.matched),
            provider: String(event.provider || ""),
            ephemeral: event.ephemeral === true,
          });
          if (Array.isArray(event.results)) setLeads(event.results);
          setStep(5);
          complete = true;
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processEvent(line);
      }
      processEvent(buffer);
      if (!complete)
        throw new Error(
          "A conexão foi interrompida antes de concluir a busca.",
        );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha na conexão. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <div>
        {!configured && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <h2 className="text-xs font-medium">
                Conecte a fonte gratuita para começar
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Configure o e-mail técnico do OpenStreetMap. Nenhuma chave paga
                é necessária.
              </p>
              <Link
                href="/configuracoes#integracoes"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
              >
                Ver integrações <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        )}
        <form
          className="panel overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault();
            void search(event.currentTarget);
          }}
        >
          <div className="flex items-center gap-3 border-b p-5">
            <span className="rounded-lg border bg-primary/5 p-2 text-primary">
              <Compass className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-medium">
                Defina sua próxima oportunidade
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Descoberta e enriquecimento automático com fontes públicas.
              </p>
            </div>
          </div>
          <fieldset
            disabled={busy || !configured}
            className="space-y-6 p-5 sm:p-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="field-label">Categoria</span>
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    className="h-10 pl-10 text-xs"
                    list="niches"
                    value={niche}
                    onChange={(event) => setNiche(event.target.value)}
                    placeholder="Ex.: Barbearias"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                  <datalist id="niches">
                    {niches.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </datalist>
                </div>
              </label>
              <label>
                <span className="field-label">Cidade</span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    name="city"
                    className="h-10 pl-10 text-xs"
                    defaultValue="Teresópolis"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className="field-label">Estado</span>
                <Input
                  name="state"
                  defaultValue="RJ"
                  required
                  minLength={2}
                  maxLength={80}
                  className="h-10 text-xs"
                />
              </label>
              <label>
                <span className="field-label">País</span>
                <Input
                  name="country"
                  defaultValue="Brasil"
                  required
                  minLength={2}
                  maxLength={80}
                  className="h-10 text-xs"
                />
              </label>
              <label>
                <span className="field-label">Raio</span>
                <select
                  name="radius_km"
                  defaultValue="10"
                  className="native-select h-10 w-full"
                >
                  {[2, 5, 10, 20, 30, 50].map((radius) => (
                    <option key={radius} value={radius}>
                      {radius} km
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <span className="field-label">Quantidade máxima</span>
              <div className="grid grid-cols-4 gap-3">
                {[10, 25, 50, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={quantity === value}
                    onClick={() => setQuantity(value)}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${quantity === value ? "border-primary/50 bg-primary/5" : "bg-background/30 hover:bg-muted/30"}`}
                  >
                    <span className="block text-lg font-medium tabular-nums">
                      {value}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      leads
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t pt-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-medium">
                <SlidersHorizontal className="size-3.5" />
                Filtros após o enriquecimento{" "}
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  Opcional
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["no_website", "Sem website"],
                  ["has_phone", "Com telefone"],
                  ["has_whatsapp", "Com WhatsApp"],
                  ["has_instagram", "Com Instagram"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-[11px]"
                  >
                    <Checkbox
                      checked={!!checks[key]}
                      onCheckedChange={(value) =>
                        setChecks({ ...checks, [key]: value === true })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <label>
                  <span className="field-label text-[10px]">Nota mínima</span>
                  <select name="min_rating" className="native-select w-full">
                    <option value="0">Qualquer</option>
                    {[3, 3.5, 4, 4.5, 5].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label text-[10px]">
                    Avaliações mínimas
                  </span>
                  <Input
                    name="min_reviews"
                    type="number"
                    min={0}
                    max={100000}
                    defaultValue={0}
                    className="h-9 text-xs"
                  />
                </label>
                <label>
                  <span className="field-label text-[10px]">Score mínimo</span>
                  <Input
                    name="min_score"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={0}
                    className="h-9 text-xs"
                  />
                </label>
              </div>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="primary-cta h-11 w-full cursor-pointer text-xs"
            >
              {busy ? <Loader2 className="animate-spin" /> : <Search />}
              {busy ? "Descobrindo e enriquecendo..." : "Buscar leads"}
              {!busy && <ArrowRight className="ml-auto" />}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3" />
              Somente fontes e páginas públicas. Falhas individuais são
              isoladas.
            </p>
          </fieldset>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4"
          >
            <CircleAlert className="size-4 shrink-0 text-destructive" />
            <div>
              <p className="text-xs font-medium text-destructive">
                Não foi possível concluir
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        {(busy || result || leads.length > 0) && (
          <section className="panel mt-5 p-5" role="status" aria-live="polite">
            <div className="mb-5 flex items-center gap-3">
              {result ? (
                <CheckCircle2 className="size-6 text-primary" />
              ) : (
                <Radar className="size-6 animate-pulse text-primary" />
              )}
              <div>
                <h3 className="text-sm font-medium">
                  {result
                    ? `${result.matched} empresas processadas`
                    : leads.length
                      ? `${leads.length} estabelecimentos encontrados`
                      : "Buscando estabelecimentos..."}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {result
                    ? `${result.count} novos leads; duplicados foram enriquecidos sem perder o pipeline.`
                    : progress.total
                      ? `${progress.completed} / ${progress.total} enriquecidos`
                      : "Os resultados aparecem progressivamente."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((label, index) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 text-[11px] ${step >= index ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {step > index ? (
                    <Check className="size-3.5 text-primary" />
                  ) : step === index ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <span className="size-3.5 rounded-full border" />
                  )}
                  {label}
                  {index === 1 && progress.total > 0
                    ? ` · ${progress.completed}/${progress.total}`
                    : ""}
                </div>
              ))}
            </div>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="primary-cta h-full transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.max(4, ((step + 1) / 6) * 100)}%` }}
              />
            </div>
            {leads.length > 0 && (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-5">
                  {filters.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuickFilter(value)}
                      aria-pressed={quickFilter === value}
                      className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-[10px] transition-colors ${quickFilter === value ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                  <select
                    value={order}
                    onChange={(event) => setOrder(event.target.value)}
                    aria-label="Ordenar resultados"
                    className="native-select ml-auto h-8 text-[10px]"
                  >
                    <option value="score">Opportunity Score</option>
                    <option value="name">Nome</option>
                    <option value="distance">Distância</option>
                    <option value="contacts">Contatos encontrados</option>
                  </select>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visibleLeads.map((lead) => (
                    <article
                      key={leadKey(lead)}
                      className="rounded-xl border bg-background/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-xs font-medium">
                            {lead.company_name}
                          </h4>
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            {lead.category} · {lead.city}, {lead.state}
                            {lead.discovery_distance_m !== null
                              ? ` · ${(lead.discovery_distance_m / 1000).toFixed(1)} km`
                              : ""}
                          </p>
                        </div>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <p className="mt-3 line-clamp-2 text-[10px] leading-5 text-muted-foreground">
                        {lead.address || "Endereço não informado"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.whatsapp && (
                          <span className="flex items-center gap-1 text-success">
                            <MessageCircle className="size-3" />
                            WhatsApp
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" />
                            E-mail
                          </span>
                        )}
                        {lead.instagram && (
                          <span className="flex items-center gap-1">
                            <Camera className="size-3" />
                            Instagram
                          </span>
                        )}
                        <span className={lead.website ? "" : "text-warning"}>
                          <Globe2 className="mr-1 inline size-3" />
                          {lead.website
                            ? "Site encontrado"
                            : "Nenhum site encontrado"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 border-t pt-3">
                        {lead.whatsapp && (
                          <a
                            href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-success"
                          >
                            WhatsApp <ExternalLink className="size-3" />
                          </a>
                        )}
                        {lead.instagram && (
                          <a
                            href={lead.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary"
                          >
                            Instagram <ExternalLink className="size-3" />
                          </a>
                        )}
                        <a
                          href={lead.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary"
                        >
                          Google Maps <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
            {result && !result.ephemeral && (
              <Button asChild className="mt-5 w-full">
                <Link href="/leads?sort=recent">
                  Explorar leads no CRM <ArrowRight />
                </Link>
              </Button>
            )}
          </section>
        )}
      </div>
      <aside className="space-y-5">
        <section className="hero-pattern panel p-6">
          <span className="mb-5 inline-flex rounded-xl border border-primary/20 bg-primary/5 p-3 text-primary">
            <Zap className="size-6" />
          </span>
          <p className="eyebrow text-primary">Opportunity Score</p>
          <h2 className="mb-3 mt-2 text-xl font-medium tracking-tight">
            Melhores oportunidades primeiro.
          </h2>
          <p className="text-xs leading-6 text-muted-foreground">
            Sinais técnicos verificáveis e canais públicos de contato compõem
            uma pontuação explicável de 0 a 100.
          </p>
        </section>
        <section className="panel p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-medium">
            <History className="size-3.5 text-muted-foreground" />
            Últimas explorações
          </h3>
          {searches.slice(0, 4).map((item) => (
            <div key={item.id} className="border-t py-3 first:border-0">
              <div className="flex justify-between text-xs">
                <span>{item.niche}</span>
                <span className="text-primary">{item.result_count}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {item.location} · {formatDate(item.created_at)}
              </p>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}
