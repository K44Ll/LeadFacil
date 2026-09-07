import Link from "next/link";
import { Plus } from "lucide-react";
import { getWorkspace } from "@/lib/data/repository";
import { PageHeader } from "@/components/shared";
import { LeadsTable, type LeadFilters } from "@/components/leads/leads-table";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Leads" };
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadFilters>;
}) {
  const [data, initial] = await Promise.all([getWorkspace(), searchParams]);
  return (
    <>
      <PageHeader
        eyebrow="Sua rede de possibilidades"
        title="Seus próximos clientes"
        description={`${data.leads.length} leads. Muitas oportunidades para fazer a diferença.`}
      >
        <Button asChild className="primary-cta h-9 px-4 text-xs">
          <Link href="/buscar">
            <Plus className="size-4" />
            Buscar leads
          </Link>
        </Button>
      </PageHeader>
      <LeadsTable
        key={JSON.stringify(initial)}
        leads={data.leads}
        lists={data.lists}
        tags={data.tags}
        initial={initial}
      />
    </>
  );
}
