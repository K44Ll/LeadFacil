"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Compass,
  History,
  Loader2,
  MapPin,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { searchSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { SearchRecord } from "@/types/crm";
import type { SearchPreview } from "@/types/crm";
import { formatDate, ScoreBadge } from "@/components/shared";
const steps = [
  "Procurando empresas",
  "Coletando dados públicos",
  "Organizando os websites informados",
  "Organizando a presença digital",
  "Calculando Opportunity Score",
  "Salvando resultados",
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
  const [result, setResult] = useState<{
    count: number;
    matched: number;
    ephemeral: boolean;
    provider: string;
    results: SearchPreview[];
  } | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  async function search(form: HTMLFormElement) {
    const fields = new FormData(form);
    const parsed = searchSchema.safeParse({
      niche,
      location: fields.get("location"),
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
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "A busca não pôde ser iniciada.");
      }
      if (!response.body) throw new Error("A conexão não retornou dados.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let complete = false;
      const processEvent = (line: string) => {
        if (!line) return;
        const event = JSON.parse(line);
        if (event.type === "step") setStep(event.step);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "complete") {
          setResult({
            count: event.count,
            matched: event.matched,
            ephemeral: event.ephemeral === true,
            provider: String(event.provider || ""),
            results: Array.isArray(event.results) ? event.results : [],
          });
          setStep(6);
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
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
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
                Conecte uma fonte para começar
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Nenhuma fonte de empresas está habilitada. Seus resultados
                aparecerão aqui após conectar uma integração real.
              </p>
              <Link
                href="/configuracoes#integracoes"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
              >
                Ver integrações
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        )}
        <form
          className="panel overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            void search(e.currentTarget);
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
                Você escolhe o perfil. A gente organiza as possibilidades.
              </p>
            </div>
          </div>
          <fieldset
            disabled={busy || !configured}
            className="space-y-6 p-5 sm:p-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="field-label">
                  Qual nicho você quer explorar?
                </span>
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    className="h-10 pl-10 text-xs"
                    list="niches"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="Ex.: Clínicas odontológicas"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                  <datalist id="niches">
                    {niches.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </datalist>
                </div>
              </label>
              <label>
                <span className="field-label">Onde vamos procurar?</span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    name="location"
                    className="h-10 pl-10 text-xs"
                    placeholder="Cidade, Estado"
                    defaultValue="Teresópolis, RJ"
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </div>
              </label>
            </div>
            <div>
              <p className="mb-2.5 text-[10px] text-muted-foreground">
                Algumas ideias para começar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {niches.slice(0, 6).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNiche(n)}
                    className={`rounded-full border px-2.5 py-1.5 text-[10px] transition-colors ${niche === n ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted/20 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">
                Quantos leads você quer encontrar?
              </span>
              <div className="grid grid-cols-4 gap-3">
                {[10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={quantity === q}
                    onClick={() => setQuantity(q)}
                    className={`relative rounded-xl border p-3 text-left transition-all ${quantity === q ? "border-primary/50 bg-primary/5" : "bg-background/30 hover:bg-muted/30"}`}
                  >
                    <span className="block text-lg font-medium tabular-nums">
                      {q}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      leads
                    </span>
                    {quantity === q && (
                      <CheckCircle2 className="absolute right-2 top-3 size-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t pt-5">
              <h3 className="mb-4 flex items-center gap-2 text-xs font-medium">
                <SlidersHorizontal className="size-3.5" />
                Encontre o perfil ideal
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  Opcional
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "no_website", label: "Apenas sem website" },
                  { key: "has_phone", label: "Com telefone" },
                  { key: "has_whatsapp", label: "Com WhatsApp" },
                  { key: "has_instagram", label: "Com Instagram" },
                ].map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2 text-[11px]"
                  >
                    <Checkbox
                      checked={!!checks[c.key]}
                      onCheckedChange={(value) =>
                        setChecks({ ...checks, [c.key]: value === true })
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label>
                  <span className="field-label text-[10px] text-muted-foreground">
                    Nota mínima
                  </span>
                  <select name="min_rating" className="native-select w-full">
                    <option value="0">Qualquer nota</option>
                    {[3, 3.5, 4, 4.5, 5].map((n) => (
                      <option key={n} value={n}>
                        {n.toFixed(1)} estrelas
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label text-[10px] text-muted-foreground">
                    Mínimo de avaliações
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
                  <span className="field-label text-[10px] text-muted-foreground">
                    Opportunity Score mínimo
                  </span>
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
              className="primary-cta h-11 w-full text-xs"
            >
              {busy ? <Loader2 className="animate-spin" /> : <Search />}
              {busy
                ? "Encontrando suas próximas oportunidades..."
                : "Buscar Leads"}
              {!busy && <ArrowRight className="ml-auto" />}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3" />
              Busca na fonte configurada. Resultados sujeitos à disponibilidade.
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
              <button
                className="mt-2 text-xs underline"
                onClick={() => setError("")}
              >
                Revisar e tentar novamente
              </button>
            </div>
          </div>
        )}
        {(busy || result) && (
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
                    ? result.ephemeral
                      ? `${result.matched} empresas encontradas`
                      : `${result.count} novos leads no seu workspace`
                    : "Abrindo caminho para novas conexões"}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {result
                    ? result.ephemeral
                      ? `Resultados ao vivo de ${result.provider}. Esta visualização não é armazenada no CRM.`
                      : `${result.matched} resultados encontrados. ${result.matched - result.count} já estavam salvos.`
                    : "Acompanhe cada etapa da pesquisa."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((label, i) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 text-[11px] ${step >= i ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {step > i ? (
                    <Check className="size-3.5 text-primary" />
                  ) : step === i ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <span className="size-3.5 rounded-full border" />
                  )}
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="primary-cta h-full transition-all duration-500"
                style={{ width: `${((step + 1) / 7) * 100}%` }}
              />
            </div>
            {result?.results.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {result.results.map((lead) => (
                  <article
                    key={`${lead.company_name}-${lead.source_url}`}
                    className="rounded-xl border bg-background/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-medium">
                          {lead.company_name}
                        </h4>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          {lead.category} · {lead.city || lead.state}
                        </p>
                      </div>
                      <ScoreBadge score={lead.score} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-[10px] leading-5 text-muted-foreground">
                      {lead.address || "Endereço não informado"}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>
                        {lead.google_rating?.toFixed(1) || "—"} ★ ·{" "}
                        {lead.review_count} avaliações
                      </span>
                      {lead.phone && <span>{lead.phone}</span>}
                    </div>
                    {lead.source_url && (
                      <a
                        href={lead.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[11px] text-primary"
                      >
                        Ver no OpenStreetMap <ArrowRight className="size-3" />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            ) : null}
            {result && !result.ephemeral && (
              <Button asChild className="mt-5 w-full">
                <Link href="/leads?sort=recent">
                  {result.count
                    ? "Explorar meus novos leads"
                    : "Ver todos os leads"}
                  <ArrowRight />
                </Link>
              </Button>
            )}
          </section>
        )}
      </div>
      <aside className="space-y-5">
        <section className="hero-pattern panel relative overflow-hidden p-6">
          <div className="absolute right-0 top-0 size-32 dot-pattern opacity-10" />
          <span className="mb-5 inline-flex rounded-xl border border-primary/20 bg-primary/5 p-3 text-primary">
            <Zap className="size-6" />
          </span>
          <p className="eyebrow text-primary">Opportunity Score</p>
          <h2 className="mb-3 mt-2 text-xl font-medium tracking-tight">
            Menos achismo.
            <br />
            Mais oportunidades.
          </h2>
          <p className="text-xs leading-6 text-muted-foreground">
            Cada empresa recebe uma pontuação de 0 a 100 com base no seu
            potencial para contratar serviços digitais.
          </p>
          <div className="mt-5 space-y-3 border-t pt-5">
            {[
              { label: "Não possui website", points: "+25" },
              { label: "Problemas no website", points: "até +20" },
              { label: "Reputação consolidada", points: "até +30" },
              { label: "SEO e experiência mobile", points: "até +20" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono text-primary">{row.points}</span>
              </div>
            ))}
          </div>
          <Link
            href="/configuracoes#scoring"
            className="mt-5 flex items-center gap-1 text-[11px] text-primary"
          >
            Entenda os critérios
            <ArrowRight className="size-3" />
          </Link>
        </section>
        <section className="panel p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-medium">
            <History className="size-3.5 text-muted-foreground" />
            Últimas explorações
          </h3>
          {searches.slice(0, 4).map((s) => (
            <div key={s.id} className="border-t py-3 first:border-0">
              <div className="flex justify-between text-xs">
                <span>{s.niche}</span>
                <span className="text-primary">{s.result_count}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {s.location} · {formatDate(s.created_at)}
              </p>
            </div>
          ))}
          {!searches.length && (
            <p className="text-xs leading-5 text-muted-foreground">
              Sua primeira busca aparecerá aqui. Que tal começar pelo seu
              bairro?
            </p>
          )}
        </section>
        <div className="flex gap-2.5 px-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">Uma dica:</span>{" "}
            comece por um nicho que você conhece. Entender o negócio faz toda a
            diferença na abordagem.
          </p>
        </div>
      </aside>
    </div>
  );
}
