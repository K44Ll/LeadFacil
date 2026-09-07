import {
  Bot,
  Database,
  Globe,
  Mail,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { getWorkspace } from "@/lib/data/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SCORE_WEIGHTS } from "@/lib/scoring";
import { getOpenRouterStatus } from "@/lib/ai/openrouter";
import { isLeadProviderConfigured } from "@/lib/providers/factory";
import { PageHeader } from "@/components/shared";
import {
  AppearanceSettings,
  ProfileSettings,
  TagsSettings,
} from "@/components/settings/settings-controls";
export const metadata = { title: "Configurações" };
export default async function SettingsPage() {
  const data = await getWorkspace();
  const openRouter = getOpenRouterStatus();
  return (
    <>
      <PageHeader
        eyebrow="Ajustado para você"
        title="Um workspace com a sua cara"
        description="Seu perfil, suas preferências e as conexões que fazem tudo acontecer."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[190px_1fr]">
        <nav
          aria-label="Seções das configurações"
          className="flex gap-1 overflow-auto xl:sticky xl:top-24 xl:flex-col"
        >
          {[
            { label: "Perfil", href: "perfil" },
            { label: "Aparência", href: "aparencia" },
            { label: "Lead scoring", href: "scoring" },
            { label: "Tags", href: "tags" },
            { label: "Integrações", href: "integracoes" },
          ].map((s, i) => (
            <a
              key={s.href}
              href={`#${s.href}`}
              className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-xs transition-colors hover:bg-muted ${i === 0 ? "bg-accent text-primary" : "text-muted-foreground"}`}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="max-w-4xl space-y-6">
          <div id="perfil" className="scroll-mt-24">
            <ProfileSettings profile={data.profile} />
          </div>
          <AppearanceSettings />
          <section id="scoring" className="panel scroll-mt-24 overflow-hidden">
            <div className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal className="size-4 text-primary" />O que faz
                uma boa oportunidade?
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Critérios transparentes. Pontuação determinística entre 0 e 100.
                Estes são os pesos atuais do seu Opportunity Score.
              </p>
            </div>
            <div className="divide-y border-t">
              {Object.entries(SCORE_WEIGHTS).map(([key, factor]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-5 px-5 py-3 sm:px-6"
                >
                  <div>
                    <h3 className="text-xs">{factor.label}</h3>
                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                      {factor.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1.5 font-mono text-xs text-primary">
                    {["website_issues", "seo", "mobile"].includes(key)
                      ? "até "
                      : ""}
                    +{factor.points}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t bg-muted/20 px-6 py-4 text-[10px] leading-5 text-muted-foreground">
              Critérios técnicos dependem de análise disponível. A edição dos
              pesos pela interface estará disponível em uma próxima versão.
            </p>
          </section>
          <div id="tags" className="scroll-mt-24">
            <TagsSettings tags={data.tags} />
          </div>
          <section id="integracoes" className="panel scroll-mt-24 p-5 sm:p-6">
            <h2 className="text-sm font-medium">
              Conexões que ampliam suas possibilidades
            </h2>
            <p className="mb-5 mt-1 text-xs text-muted-foreground">
              Acompanhe a disponibilidade das integrações do seu workspace.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  name: "Supabase",
                  icon: Database,
                  connected: isSupabaseConfigured(),
                  description: "Autenticação e dados privados do seu CRM.",
                },
                {
                  name: "OpenStreetMap",
                  icon: Globe,
                  connected: isLeadProviderConfigured(),
                  description:
                    "Busca aberta de empresas locais via Nominatim e Overpass.",
                },
                {
                  name: "Enriquecimento web",
                  icon: Globe,
                  connected: isLeadProviderConfigured(),
                  description:
                    "Descoberta de sites, contatos e análise técnica de páginas públicas.",
                },
                {
                  name: "OpenRouter",
                  icon: Bot,
                  connected: openRouter.configured,
                  description: openRouter.model
                    ? `Abordagens comerciais com ${openRouter.model}.`
                    : "IA para criar abordagens comerciais personalizadas.",
                },
                {
                  name: "Email",
                  icon: Mail,
                  connected: false,
                  description: "Conecte conversas ao seu histórico comercial.",
                },
                {
                  name: "WhatsApp",
                  icon: MessageCircle,
                  connected: false,
                  description:
                    "Registre conversas manualmente no histórico do lead.",
                },
              ].map((integration) => (
                <div key={integration.name} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <integration.icon className="size-5 text-muted-foreground" />
                    <h3 className="text-xs font-medium">{integration.name}</h3>
                  </div>
                  <p className="min-h-10 text-[11px] leading-5 text-muted-foreground">
                    {integration.description}
                  </p>
                  <p
                    className={`mt-3 flex items-center gap-1.5 text-[10px] ${integration.connected ? "text-success" : "text-muted-foreground"}`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${integration.connected ? "bg-success" : "bg-muted-foreground"}`}
                    />
                    {integration.connected ? "Conectado" : "Não configurado"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              Credenciais são mantidas no servidor. As integrações externas
              nunca usam chaves administrativas no navegador.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
