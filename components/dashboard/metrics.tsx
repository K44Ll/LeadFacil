import {
  ArrowUpRight,
  Building2,
  CircleHelp,
  MessageSquare,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { changeLabel } from "@/lib/dashboard";
import type { Lead } from "@/types/crm";
export function Metrics({
  leads,
  current,
  before,
  chart,
}: {
  leads: Lead[];
  current: Lead[];
  before: Lead[];
  chart: { leads: number; previous: number }[];
}) {
  const count = (items: Lead[], status: string) =>
    items.filter((l) => l.status === status).length;
  const avg = (items: Lead[]) =>
    items.length
      ? Math.round(items.reduce((sum, l) => sum + l.score, 0) / items.length)
      : 0;
  const conversion = (items: Lead[]) =>
    items.length ? (count(items, "Fechado") / items.length) * 100 : 0;
  const metrics = [
    {
      label: "Total de leads",
      value: leads.length,
      now: current.length,
      previous: before.length,
      icon: Building2,
      hint: "Total do workspace. Variação das novas entradas por período.",
    },
    {
      label: "Novos leads",
      value: current.length,
      now: current.length,
      previous: before.length,
      icon: UserPlus,
      hint: "Empresas encontradas no período selecionado.",
    },
    {
      label: "Leads contatados",
      value: count(current, "Contatado"),
      now: count(current, "Contatado"),
      previous: count(before, "Contatado"),
      icon: MessageSquare,
      hint: "Status atual dos leads encontrados em cada período.",
    },
    {
      label: "Leads interessados",
      value: count(current, "Interessado"),
      now: count(current, "Interessado"),
      previous: count(before, "Interessado"),
      icon: Target,
      hint: "Status atual dos leads encontrados em cada período.",
    },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className="panel relative overflow-hidden p-4 lg:p-5"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs">{metric.label}</span>
              <metric.icon className="size-4" strokeWidth={1.5} />
            </div>
            <div className="my-4 flex items-center justify-between">
              <p className="text-[32px] font-medium leading-none tracking-[-1.5px] tabular-nums">
                {metric.value.toLocaleString("pt-BR")}
              </p>
              <svg
                width="77"
                height="34"
                viewBox="0 0 77 34"
                className={i === 0 ? "text-primary" : "text-chart-2"}
                aria-hidden="true"
              >
                <path
                  d={
                    chart.length
                      ? chart
                          .map(
                            (point, j) =>
                              `${j === 0 ? "M" : "L"}${(j / (chart.length - 1 || 1)) * 77},${30 - (point.leads / Math.max(...chart.map((p) => p.leads), 1)) * 24}`,
                          )
                          .join(" ")
                      : "M0,28 L77,28"
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span
                className={
                  metric.now >= metric.previous
                    ? "text-success"
                    : "text-warning"
                }
              >
                <ArrowUpRight className="mr-0.5 inline size-3" />
                {changeLabel(metric.now, metric.previous)}
              </span>
              <span className="text-muted-foreground">
                vs. período anterior
              </span>
              <Tooltip>
                <TooltipTrigger aria-label={`Sobre ${metric.label}`}>
                  <CircleHelp className="size-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  {metric.hint}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
      <div className="panel mt-4 grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          {
            label: "Clientes fechados",
            value: count(current, "Fechado"),
            icon: Trophy,
            change: changeLabel(
              count(current, "Fechado"),
              count(before, "Fechado"),
            ),
          },
          {
            label: "Taxa de conversão",
            value: `${conversion(current).toFixed(1).replace(".", ",")}%`,
            icon: TrendingUp,
            change: changeLabel(conversion(current), conversion(before)),
          },
          {
            label: "Opportunity Score médio",
            value: `${avg(current)}`,
            icon: Zap,
            change: changeLabel(avg(current), avg(before)),
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="flex items-center gap-3 px-5 py-3.5"
          >
            <metric.icon className="size-4 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              {metric.label}
            </span>
            <span className="ml-auto text-base font-medium tabular-nums">
              {metric.value}
            </span>
            <span
              className="text-[10px] text-muted-foreground"
              title="Comparação entre os leads encontrados em cada período"
            >
              {metric.change}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
