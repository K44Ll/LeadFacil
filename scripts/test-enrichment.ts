import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [
    { getLeadProvider },
    { WebsiteScraper },
    { WebsiteDiscoveryService },
    { enrichLeads },
    { assertSafePublicUrl },
  ] = await Promise.all([
    import("../lib/providers/factory"),
    import("../lib/leads/enrichment/website-scraper"),
    import("../lib/leads/enrichment/website-discovery"),
    import("../lib/leads/enrichment/enrichment"),
    import("../lib/leads/utils/url-security"),
  ]);
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
  let withWebsite = leads.find((lead) => lead.website);
  if (!withWebsite) {
    const discovery = new WebsiteDiscoveryService();
    for (const lead of leads.slice(0, 4)) {
      const website = await discovery.discover({
        name: lead.company_name,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        phone: lead.phone,
      });
      if (website) {
        withWebsite = { ...lead, website: website.value };
        break;
      }
    }
  }
  if (!withWebsite) {
    withWebsite = {
      ...leads[0],
      company_name: "Teresópolis Shopping",
      source_id: "public-site-test",
      website: "https://www.teresopolisshopping.com.br",
    };
  }
  const websiteUrl = withWebsite.website;
  if (!websiteUrl) throw new Error("O website público de teste está ausente.");
  const scraped = await new WebsiteScraper().scrape(websiteUrl);
  const blocked = await Promise.allSettled([
    assertSafePublicUrl("http://127.0.0.1/admin"),
    assertSafePublicUrl("http://169.254.169.254/latest/meta-data"),
  ]);
  const invalid = {
    ...leads[0],
    id: crypto.randomUUID(),
    source_id: "ssrf-test",
    website: "http://127.0.0.1/private",
    last_enriched_at: null,
  };
  const isolated = await enrichLeads([withWebsite, invalid], {
    concurrency: 2,
  });
  console.log({
    discovered: leads.length,
    testedPublicWebsite: new URL(websiteUrl).hostname,
    reachable: scraped.analysis.reachable,
    pages: scraped.analysis.page_count,
    phone: Boolean(scraped.contacts.phone),
    whatsapp: Boolean(scraped.contacts.whatsapp),
    email: Boolean(scraped.contacts.email),
    instagram: Boolean(scraped.contacts.socials.instagram),
    ssrfBlocked: blocked.every((result) => result.status === "rejected"),
    isolatedFailures: isolated.length === 2,
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha desconhecida.");
  process.exitCode = 1;
});
