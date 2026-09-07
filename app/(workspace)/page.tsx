import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Crosshair,
  Plus,
  Radar,
  Sparkles,
} from "lucide-react";
import { getWorkspace } from "@/lib/data/repository";
import { dashboardData } from "@/lib/dashboard";
import { Metrics } from "@/components/dashboard/metrics";
import { LeadsChart } from "@/components/dashboard/leads-chart";
import { Opportunities } from "@/components/dashboard/opportunities";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { STATUSES } from "@/types/crm";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ period }, data] = await Promise.all([searchParams, getWorkspace()]);
  const days = [7, 30, 90].includes(Number(period)) ? Number(period) : 30;
  const { current, before, chart } = dashboardData(data.leads, days);
  const noSite = data.leads.filter((l) => !l.website).length;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Seu próximo cliente começa aqui</p>
          <h1 className="page-heading">
            Olá, {data.profile.name.split(" ")[0]}{" "}
            <span className="font-normal text-muted-foreground">/</span>{" "}
            <span className="font-normal">Vamos crescer?</span>
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Uma visão clara das suas oportunidades. Um passo à frente nos seus
            negócios.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-3 text-xs" asChild>
            <Link href="#desempenho">
              <CalendarDays className="size-3.5" />
              Últimos {days} dias
              <ChevronDown className="size-3" />
            </Link>
          </Button>
          <Button className="primary-cta h-9 px-4 text-xs" asChild>
            <Link href="/buscar">
              <Plus className="size-4" />
              Buscar leads
            </Link>
          </Button>
        </div>
      </div>
      <Metrics
        leads={data.leads}
        current={current}
        before={before}
        chart={chart}
      />
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="panel min-w-0 p-5" id="desempenho">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">
                Suas oportunidades, em movimento
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leads encontrados ao longo do tempo
              </p>
            </div>
            <div
              className="flex rounded-lg border bg-background p-0.5"
              aria-label="Período do dashboard"
            >
              {[7, 30, 90].map((value) => (
                <Link
                  key={value}
                  href={`/?period=${value}`}
                  scroll={false}
                  aria-current={value === days ? "true" : undefined}
                  className={`rounded-md px-2.5 py-1 text-[10px] transition-colors ${value === days ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {value} dias
                </Link>
              ))}
            </div>
          </div>
          <div className="mb-2 mt-5 flex items-baseline gap-2">
            <span className="text-[28px] font-medium tracking-[-1px]">
              {current.length}
            </span>
            <span className="text-[11px] text-muted-foreground">
              leads no período
            </span>
            <div className="ml-auto hidden items-center gap-4 text-[10px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-chart-1" />
                Atual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-chart-2" />
                Anterior
              </span>
            </div>
          </div>
          <LeadsChart data={chart} />
        </section>
        <section className="panel p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-medium">Seu pipeline</h2>
            <Link
              href="/pipeline"
              aria-label="Abrir pipeline"
              className="text-muted-foreground hover:text-primary"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cada etapa, uma nova possibilidade.
          </p>
          <div
            className="mt-5 flex h-2 gap-1 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            {STATUSES.map((status, i) => (
              <span
                key={status}
                style={{
                  flex: Math.max(
                    1,
                    data.leads.filter((l) => l.status === status).length,
                  ),
                  background: `var(--chart-${(i % 5) + 1})`,
                }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {STATUSES.map((status) => (
              <Link
                href={`/leads?status=${encodeURIComponent(status)}`}
                key={status}
                className="flex items-center justify-between rounded-lg py-1 hover:bg-muted/50"
              >
                <StatusBadge status={status} />
                <span className="pr-1 text-xs tabular-nums">
                  {data.leads.filter((l) => l.status === status).length}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/pipeline"
            className="mt-3 flex items-center justify-center gap-2 border-t pt-3 text-[11px] text-muted-foreground hover:text-primary"
          >
            Gerenciar pipeline
            <ArrowRight className="size-3" />
          </Link>
        </section>
      </div>
      <div className="hero-pattern relative my-5 flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-xl border px-6 py-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 dot-pattern opacity-15" />
        <div className="relative flex items-center gap-4">
          <span className="hidden rounded-xl border border-primary/15 bg-primary/5 p-3 text-primary sm:block">
            <Radar className="size-7" strokeWidth={1.3} />
          </span>
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium text-primary">
              <Sparkles className="size-3" />
              MENOS PESQUISA. MAIS POSSIBILIDADES.
            </p>
            <h2 className="text-[17px] font-medium tracking-tight">
              O próximo grande projeto pode estar na sua cidade.
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Encontre empresas que precisam do que você faz de melhor.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="relative h-9 gap-2 border-primary/20 bg-card/70 px-4 text-xs"
          asChild
        >
          <Link href="/buscar">
            Explorar oportunidades
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid items-start gap-5 2xl:grid-cols-[1fr_280px]">
        <Opportunities leads={data.leads} />
        <section className="panel hidden p-5 2xl:block">
          <Crosshair className="mb-4 size-5 text-primary" />
          <p className="eyebrow">Um bom ponto de partida</p>
          <h3 className="my-3 text-2xl font-medium tracking-tight">
            {noSite} empresas.
            <br />
            Um site faz a diferença.
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Esses leads ainda não têm um website. Uma oportunidade para oferecer
            presença digital de verdade.
          </p>
          <Link
            href="/leads?website=no"
            className="mt-5 flex items-center gap-2 text-xs text-primary"
          >
            Ver leads sem site
            <ArrowRight className="size-3.5" />
          </Link>
        </section>
      </div>
    </>
  );
}
