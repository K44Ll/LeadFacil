import { getWorkspace } from "@/lib/data/repository";
import { PageHeader } from "@/components/shared";
import { isLeadProviderConfigured } from "@/lib/providers/factory";
import { SearchForm } from "@/components/leads/search-form";
export const metadata = { title: "Buscar leads" };
export default async function SearchPage() {
  const data = await getWorkspace();
  return (
    <>
      <PageHeader
        eyebrow="Descubra. Conecte. Cresça."
        title="Encontre seu próximo cliente"
        description="Empresas com potencial. Oportunidades com propósito."
      />
      <SearchForm
        searches={data.searches}
        configured={isLeadProviderConfigured()}
      />
    </>
  );
}
