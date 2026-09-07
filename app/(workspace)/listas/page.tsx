import { getWorkspace } from "@/lib/data/repository";
import { PageHeader } from "@/components/shared";
import { ListManager } from "@/components/lists/list-manager";
export const metadata = { title: "Listas" };
export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ nova?: string }>;
}) {
  const [data, params] = await Promise.all([getWorkspace(), searchParams]);
  const lists = data.lists.map((l) => {
    const leads = data.leads.filter((lead) => lead.list_ids.includes(l.id));
    return {
      ...l,
      count: leads.length,
      companies: leads.slice(0, 3).map((lead) => lead.company_name),
    };
  });
  return (
    <>
      <PageHeader
        eyebrow="Organize do seu jeito"
        title="Uma lista para cada possibilidade"
        description="Reúna oportunidades por nicho, região, prioridade ou próxima ação."
      />
      <ListManager
        key={params.nova || "lists"}
        lists={lists}
        openInitially={params.nova === "1"}
      />
    </>
  );
}
