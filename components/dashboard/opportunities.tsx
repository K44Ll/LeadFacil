import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  GlobeLock,
  Sparkles,
  Star,
} from "lucide-react";
import {
  CompanyAvatar,
  EmptyState,
  ScoreBadge,
  StatusBadge,
} from "@/components/shared";
import type { Lead } from "@/types/crm";
export function Opportunities({ leads }: { leads: Lead[] }) {
  const best = [...leads]
    .filter((l) => !["Fechado", "Descartado"].includes(l.status))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b p-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Melhores oportunidades
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Os leads certos para sua próxima conversa.
          </p>
        </div>
        <Link
          href="/leads?sort=score"
          className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground hover:text-primary"
        >
          Ver todos
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {!best.length ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-muted/25 text-[10px] font-normal text-muted-foreground">
              <tr>
                {[
                  "Empresa",
                  "Localização",
                  "Presença digital",
                  "Score",
                  "Status",
                  "",
                ].map((h, i) => (
                  <th key={i} scope="col" className="px-5 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {best.map((lead, i) => (
                <tr
                  key={lead.id}
                  className="border-t transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-3"
                    >
                      <CompanyAvatar name={lead.company_name} index={i} />
                      <span>
                        <span className="block font-medium">
                          {lead.company_name}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {lead.category}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-muted-foreground">
                    {lead.city}, {lead.state}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`flex items-center gap-1.5 text-[10px] ${lead.website ? "text-muted-foreground" : "text-warning"}`}
                    >
                      {lead.website ? (
                        <Globe className="size-3" />
                      ) : (
                        <GlobeLock className="size-3" />
                      )}
                      {lead.website ? "Site com oportunidades" : "Sem website"}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="size-2.5 text-warning" />
                      {lead.google_rating} · {lead.review_count} avaliações
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      aria-label={`Abrir ${lead.company_name}`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
