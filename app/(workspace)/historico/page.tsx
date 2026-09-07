import { getWorkspace } from "@/lib/data/repository";
import { PageHeader } from "@/components/shared";
import { ActivityFeed } from "@/components/history/activity-feed";
export const metadata = { title: "Histórico" };
export default async function HistoryPage() {
  const data = await getWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="Cada conexão tem uma história"
        title="O caminho até aqui"
        description="Suas buscas, conversas e próximos passos, em ordem."
      />
      <ActivityFeed
        interactions={data.interactions.map((i) => ({
          ...i,
          company_name:
            data.leads.find((l) => l.id === i.lead_id)?.company_name ||
            "Empresa",
        }))}
        searches={data.searches}
      />
    </>
  );
}
