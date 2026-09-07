import type { Lead } from "@/types/crm";
export function dashboardData(leads: Lead[], days: number, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const previous = new Date(start.getTime() - days * 86400000);
  const current = leads.filter((l) => new Date(l.created_at) >= start);
  const before = leads.filter(
    (l) => new Date(l.created_at) >= previous && new Date(l.created_at) < start,
  );
  const groups = Math.min(days, 15);
  const groupDays = Math.ceil(days / groups);
  const chart = Array.from({ length: Math.ceil(days / groupDays) }, (_, i) => {
    const from = new Date(start.getTime() + i * groupDays * 86400000);
    const to = new Date(
      Math.min(
        start.getTime() + (i + 1) * groupDays * 86400000,
        now.getTime() + 1,
      ),
    );
    return {
      date: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }).format(from),
      leads: leads.filter(
        (l) => new Date(l.created_at) >= from && new Date(l.created_at) < to,
      ).length,
      previous: leads.filter(
        (l) =>
          new Date(l.created_at).getTime() >=
            from.getTime() - days * 86400000 &&
          new Date(l.created_at).getTime() < to.getTime() - days * 86400000,
      ).length,
    };
  });
  return { current, before, chart };
}
export function changeLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "Novo no período" : "Sem variação";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")}%`;
}
