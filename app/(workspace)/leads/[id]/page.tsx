import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Globe,
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  MonitorSmartphone,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Timer,
  Zap,
} from "lucide-react";
import { getWorkspace } from "@/lib/data/repository";
import { CompanyAvatar, formatDate } from "@/components/shared";
import {
  LeadNotes,
  LeadOrganization,
  LeadStatusControl,
  InteractionForm,
} from "@/components/leads/lead-actions";
import { AiOutreach } from "@/components/leads/ai-outreach";
import { getOpenRouterStatus } from "@/lib/ai/openrouter";
export const metadata = { title: "Detalhes do lead" };
export default async function LeadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, data] = await Promise.all([params, getWorkspace()]);
  const lead = data.leads.find((l) => l.id === id);
  if (!lead) notFound();
  const ai = getOpenRouterStatus();
  const timeline = data.interactions
    .filter((i) => i.lead_id === id)
    .sort((a, b) => b.happened_at.localeCompare(a.happened_at));
  const safeLink = (url: string | null) =>
    url && /^https?:\/\//.test(url) ? url : null;
  const contacts = [
    {
      icon: Phone,
      label: "Telefone",
      value: lead.phone,
      url: lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: lead.whatsapp ? "Conversar no WhatsApp" : null,
      url: lead.whatsapp
        ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`
        : null,
    },
    {
      icon: Mail,
      label: "Email",
      value: lead.email,
      url: lead.email ? `mailto:${lead.email}` : null,
    },
    {
      icon: Globe,
      label: "Website",
      value: lead.domain,
      url: safeLink(lead.website),
    },
    {
      icon: Camera,
      label: "Instagram",
      value: lead.instagram ? "Perfil da empresa" : null,
      url: safeLink(lead.instagram),
    },
    {
      icon: Globe,
      label: "Facebook",
      value: lead.facebook ? "Página da empresa" : null,
      url: safeLink(lead.facebook),
    },
    {
      icon: Globe,
      label: "LinkedIn",
      value: lead.linkedin ? "Página da empresa" : null,
      url: safeLink(lead.linkedin),
    },
  ];
  const analyzed = lead.analysis.mode !== "unavailable";
  const presence = [
    {
      label: "Website",
      icon: Globe,
      status: !lead.website
        ? "Não encontrado"
        : !analyzed
          ? "Não analisado"
          : lead.analysis.severe_issues > 0.5
            ? "Ruim"
            : "Bom",
    },
    {
      label: "SEO",
      icon: Search,
      status: !lead.website
        ? "Não encontrado"
        : !analyzed
          ? "Não analisado"
          : lead.analysis.seo_issues > 0.5
            ? "Atenção"
            : "Bom",
    },
    {
      label: "Mobile",
      icon: MonitorSmartphone,
      status: !lead.website
        ? "Não encontrado"
        : !analyzed
          ? "Não analisado"
          : lead.analysis.mobile_issues > 0.5
            ? "Ruim"
            : "Bom",
    },
    { label: "Performance", icon: Timer, status: lead.analysis.performance },
    {
      label: "Redes sociais",
      icon: Camera,
      status: lead.instagram ? "Bom" : "Não encontrado",
    },
    {
      label: "Reputação",
      icon: ShieldCheck,
      status:
        lead.google_rating === null
          ? "Não encontrado"
          : lead.google_rating >= 4.5
            ? "Excelente"
            : "Bom",
    },
  ];
  return (
    <>
      <Link
        href="/leads"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Todos os leads
      </Link>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <CompanyAvatar name={lead.company_name} large />
          <div>
            <p className="eyebrow mb-1">{lead.category}</p>
            <h1 className="page-heading">{lead.company_name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {lead.city}, {lead.state}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <LeadStatusControl lead={lead} />
          <InteractionForm leadId={lead.id} />
        </div>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="panel p-5">
            <h2 className="mb-4 text-sm font-medium">Conheça a empresa</h2>
            <p className="mb-5 text-xs leading-6 text-muted-foreground">
              {lead.description ||
                "Informações públicas disponíveis sobre esta empresa."}
            </p>
            <div className="mb-5 flex items-start gap-3 rounded-lg bg-muted/40 p-3">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-xs">
                  {lead.address} · {lead.neighborhood}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {lead.city}, {lead.state}
                  {lead.postal_code && ` · ${lead.postal_code}`}
                </p>
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {contacts.map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <c.icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] text-muted-foreground">
                      {c.label}
                    </p>
                    {c.value && c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 break-all text-xs hover:text-primary"
                      >
                        {c.value}
                        <ArrowUpRight className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="break-all text-xs">
                        {c.value || "Não encontrado"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t pt-4 text-[10px] text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {lead.opening_hours || "Horário de funcionamento não informado"}
            </div>
          </section>
          <section className="panel p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Presença digital</h2>
              <span className="text-[10px] text-muted-foreground">
                {lead.analysis.mode === "live"
                  ? "Análise verificada"
                  : "Análise técnica ainda não realizada"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {presence.map((p) => (
                <div
                  key={p.label}
                  className="rounded-xl border bg-background/35 p-4"
                >
                  <p.icon className="mb-4 size-5 text-muted-foreground" />
                  <p className="mb-2 text-xs font-medium">{p.label}</p>
                  <p
                    className={`flex items-center gap-1.5 text-[10px] ${["Excelente", "Bom"].includes(p.status) ? "text-success" : ["Ruim", "Atenção"].includes(p.status) ? "text-warning" : "text-muted-foreground"}`}
                  >
                    {["Excelente", "Bom"].includes(p.status) ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <CircleAlert className="size-3" />
                    )}
                    {p.status}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-lg border p-4">
              <Star className="size-6 text-warning" />
              <div>
                <span className="text-xl font-medium">
                  {lead.google_rating?.toFixed(1) || "—"}
                </span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  / 5
                </span>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {lead.review_count} avaliações · Reputação pública
                </p>
              </div>
            </div>
          </section>
          <AiOutreach leadId={lead.id} configured={ai.configured} />
          <LeadNotes key={lead.notes} lead={lead} />
          <section className="panel p-5">
            <h2 className="mb-5 text-sm font-medium">Histórico comercial</h2>
            <div className="ml-2 space-y-5 border-l pl-6">
              {timeline.map((item) => (
                <div key={item.id} className="relative">
                  <span className="absolute -left-[31px] top-1 flex size-3 items-center justify-center rounded-full bg-card">
                    <CircleDot className="size-3 text-primary" />
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium">{item.type}</span>
                    <time className="text-[10px] text-muted-foreground">
                      {formatDate(item.happened_at, true)}
                    </time>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {item.observation}
                  </p>
                  {item.result && (
                    <p className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-[11px]">
                      {item.result}
                    </p>
                  )}
                </div>
              ))}
              <div className="relative">
                <CircleDot className="absolute -left-[31px] top-1 size-3 text-muted-foreground" />
                <p className="text-xs font-medium">Lead encontrado</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDate(lead.created_at, true)} · {lead.source}
                </p>
              </div>
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="hero-pattern panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Opportunity Score</h2>
              <Zap className="size-4 text-primary" />
            </div>
            <div className="my-6 flex items-baseline justify-center gap-2">
              <span className="text-[64px] font-medium leading-none tracking-[-4px] text-primary">
                {lead.score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="primary-cta h-full rounded-full"
                style={{ width: `${lead.score}%` }}
              />
            </div>
            <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
              O que torna essa empresa uma oportunidade para você:
            </p>
            <div className="space-y-4">
              {lead.score_factors.map((f) => (
                <div key={f.key} className="flex items-start gap-2.5">
                  <span className="min-w-8 rounded-md bg-primary/10 px-1.5 py-1 text-center font-mono text-[10px] font-medium text-primary">
                    +{f.points}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium">{f.label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t pt-3 text-[10px] leading-relaxed text-muted-foreground">
              Pontuação calculada por critérios, limitada a 100. Dados não
              analisados não somam pontos técnicos.
            </p>
          </section>
          <LeadOrganization lead={lead} lists={data.lists} tags={data.tags} />
        </aside>
      </div>
    </>
  );
}
