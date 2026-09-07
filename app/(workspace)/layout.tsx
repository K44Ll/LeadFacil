import { getWorkspace } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/app-shell";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getWorkspace();
  const index = {
    leads: data.leads.map(({ id, company_name, city }) => ({
      id,
      company_name,
      city,
    })),
    lists: data.lists.map(({ id, name }) => ({ id, name })),
    tags: data.tags.map(({ id, name }) => ({ id, name })),
  };
  return (
    <AppShell
      profile={data.profile}
      index={index}
      leadCount={data.leads.length}
      hasOpenStreetMapData={data.leads.some(
        (lead) => lead.source === "OpenStreetMap",
      )}
    >
      {children}
    </AppShell>
  );
}
