import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { getLeadProvider } = await import("../lib/providers/factory");
  const provider = getLeadProvider();
  const leads = await provider.searchBusinesses(
    {
      niche: "Barbearias",
      city: "Teresópolis",
      state: "RJ",
      country: "Brasil",
      radius_km: 10,
      quantity: 10,
      no_website: false,
      has_phone: false,
      has_whatsapp: false,
      has_instagram: false,
      min_rating: 0,
      min_reviews: 0,
      min_score: 0,
    },
    "00000000-0000-4000-8000-000000000001",
  );

  console.log({
    provider: provider.name,
    results: leads.length,
    withPhone: leads.filter((lead) => lead.phone).length,
    withWebsite: leads.filter((lead) => lead.website).length,
    allFromOpenStreetMap: leads.every(
      (lead) => lead.source === "OpenStreetMap",
    ),
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha desconhecida.");
  process.exitCode = 1;
});
