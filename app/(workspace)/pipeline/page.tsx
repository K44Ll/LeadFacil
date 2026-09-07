import { getWorkspace } from "@/lib/data/repository";
import { PageHeader } from "@/components/shared";
import { Kanban } from "@/components/pipeline/kanban";
export const metadata = { title: "Pipeline" };
export default async function PipelinePage() {
  const data = await getWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="Relacionamentos que avançam"
        title="Do primeiro oi ao projeto fechado"
        description="Acompanhe cada oportunidade, em cada etapa da conversa."
      />
      <Kanban leads={data.leads} tags={data.tags} />
    </>
  );
}
