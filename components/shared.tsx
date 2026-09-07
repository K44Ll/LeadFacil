import Link from "next/link";
import { ArrowUpRight, Radar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scoreTier, SCORE_LABELS } from "@/lib/scoring";
import type { LeadStatus } from "@/types/crm";
export function OpenStreetMapAttribution({
  className,
}: {
  className?: string;
}) {
  return (
    <a
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noopener noreferrer"
      className={cn("shrink-0 hover:text-foreground", className)}
    >
      © OpenStreetMap contributors
    </a>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5"
      aria-label="LeadFácil, início"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="size-5 fill-current" strokeWidth={1.5} />
      </span>
      {!compact && (
        <span className="sidebar-label text-xl font-semibold tracking-[-.7px]">
          leadfácil<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-heading">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function ScoreBadge({
  score,
  label = false,
}: {
  score: number;
  label?: boolean;
}) {
  const tier = scoreTier(score);
  return (
    <span
      className={cn("score-badge", `score-${tier}`)}
      title={`Opportunity Score: ${score}/100 · ${SCORE_LABELS[tier]}`}
    >
      <Zap className="size-3" />
      {score}
      {label && <span className="font-normal">· {SCORE_LABELS[tier]}</span>}
    </span>
  );
}
const statusClass: Record<LeadStatus, string> = {
  Novo: "new",
  Contatado: "contacted",
  Respondeu: "replied",
  Interessado: "interested",
  Reunião: "meeting",
  Fechado: "won",
  Descartado: "lost",
};
export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`status-badge status-${statusClass[status]}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
export function CompanyAvatar({
  name,
  index = 0,
  large = false,
}: {
  name: string;
  index?: number;
  large?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border text-xs font-semibold",
        large ? "size-16 rounded-2xl text-xl" : "size-9",
        [
          "border-primary/15 bg-primary/10 text-primary",
          "border-violet/15 bg-violet/10 text-violet",
          "border-warning/15 bg-warning/10 text-warning",
          "border-info/15 bg-info/10 text-info",
        ][index % 4],
      )}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function EmptyState({
  title = "Você ainda não possui leads.",
  description = "Sua próxima oportunidade começa com uma boa busca.",
  action = "Buscar meus primeiros leads",
  href = "/buscar",
}: {
  title?: string;
  description?: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-2xl border bg-muted/40 p-4 text-primary">
        <Radar className="size-7" />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <Button asChild className="mt-5">
        <Link href={href}>
          {action}
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
export function formatDate(date: string, withTime = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}
