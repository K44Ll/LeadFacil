import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWorkspace } from "@/lib/data/repository";
import { PageHeader } from "@/components/shared";
import { LeadsTable } from "@/components/leads/leads-table";
export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, { id }] = await Promise.all([getWorkspace(), params]);
  const list = data.lists.find((l) => l.id === id);
  if (!list) notFound();
  return (
    <>
      <Link
        href="/listas"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft className="size-3" />
        Todas as listas
      </Link>
      <PageHeader
        eyebrow="Sua seleção de oportunidades"
        title={list.name}
        description={
          list.description || "Uma lista com leads escolhidos por você."
        }
      />
      <LeadsTable
        leads={data.leads}
        lists={data.lists}
        tags={data.tags}
        listId={id}
      />
    </>
  );
}
