import "server-only";
import type {
  ConfidenceField,
  EnrichedValue,
  Lead,
  LeadConfidence,
} from "@/types/crm";
import {
  comparableDomain,
  googleMapsSearchUrl,
} from "@/lib/leads/utils/normalize-url";
import { normalizeBrazilianPhone } from "@/lib/leads/utils/normalize-phone";
import { mapConcurrent } from "@/lib/leads/utils/queue";
import { WebsiteDiscoveryService } from "./website-discovery";
import { WebsiteScraper } from "./website-scraper";

const MEMORY_TTL = 7 * 24 * 60 * 60 * 1000;
const memoryCache = new Map<string, { expiresAt: number; lead: Lead }>();

function selectValue(
  current: EnrichedValue<string> | undefined,
  next: EnrichedValue<string> | undefined,
) {
  if (!next) return current;
  return !current || next.confidence > current.confidence ? next : current;
}
function aggregateConfidence(values: LeadConfidence) {
  const confirmed = Object.values(values).filter(
    (item): item is EnrichedValue<string> =>
      Boolean(item && item.confidence >= 0.7),
  );
  return confirmed.length
    ? confirmed.reduce((sum, item) => sum + item.confidence, 0) /
        confirmed.length
    : 0.5;
}
function seedConfidence(lead: Lead): LeadConfidence {
  const result = { ...lead.confidence };
  for (const key of [
    "phone",
    "whatsapp",
    "email",
    "website",
    "instagram",
    "facebook",
    "linkedin",
  ] as ConfidenceField[]) {
    const value = lead[key];
    if (value && !result[key])
      result[key] = { value, confidence: 0.92, source: lead.source };
  }
  return result;
}
function applyConfidence(lead: Lead, confidence: LeadConfidence) {
  for (const key of Object.keys(confidence) as ConfidenceField[]) {
    const item = confidence[key];
    if (item && item.confidence >= 0.7) lead[key] = item.value;
  }
  lead.domain = comparableDomain(lead.website);
  lead.confidence = confidence;
  lead.enrichment_confidence = aggregateConfidence(confidence);
}

export class LeadEnrichmentService {
  private readonly discovery = new WebsiteDiscoveryService();
  private readonly scraper = new WebsiteScraper();

  async enrich(lead: Lead, signal?: AbortSignal) {
    if (
      lead.last_enriched_at &&
      Date.now() - new Date(lead.last_enriched_at).getTime() < MEMORY_TTL
    )
      return lead;
    const cacheKey = `${lead.source}:${lead.source_id}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now())
      return structuredClone(cached.lead);
    const confidence = seedConfidence(lead);
    const input = {
      name: lead.company_name,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      phone: lead.phone,
    };
    if (!lead.website)
      confidence.website =
        (await this.discovery.discover(input, signal)) || undefined;
    applyConfidence(lead, confidence);
    if (lead.website) {
      const scraped = await this.scraper.scrape(lead.website, signal);
      lead.analysis = scraped.analysis;
      for (const key of ["phone", "whatsapp", "email"] as const)
        confidence[key] = selectValue(confidence[key], scraped.contacts[key]);
      for (const key of ["instagram", "facebook", "linkedin"] as const)
        confidence[key] = selectValue(
          confidence[key],
          scraped.contacts.socials[key],
        );
    }
    if (!confidence.instagram && !confidence.facebook && !confidence.linkedin) {
      const found = await this.discovery.discoverSocials(input, signal);
      for (const key of ["instagram", "facebook", "linkedin"] as const)
        confidence[key] = selectValue(confidence[key], found[key]);
    }
    applyConfidence(lead, confidence);
    lead.phone = lead.phone
      ? normalizeBrazilianPhone(lead.phone) || lead.phone
      : null;
    lead.whatsapp = lead.whatsapp
      ? normalizeBrazilianPhone(lead.whatsapp) || lead.whatsapp
      : null;
    lead.google_maps_url = googleMapsSearchUrl({
      name: lead.company_name,
      address: [lead.address, lead.city, lead.state].filter(Boolean).join(", "),
      latitude: lead.latitude,
      longitude: lead.longitude,
    });
    lead.sources = [
      ...new Set([
        ...lead.sources,
        ...Object.values(confidence)
          .map((item) => item?.source)
          .filter((value): value is string => Boolean(value)),
      ]),
    ];
    lead.last_enriched_at = new Date().toISOString();
    memoryCache.set(cacheKey, {
      expiresAt: Date.now() + MEMORY_TTL,
      lead: structuredClone(lead),
    });
    return lead;
  }
}

export async function enrichLeads(
  leads: Lead[],
  options: {
    signal?: AbortSignal;
    concurrency?: number;
    onLead?: (lead: Lead, completed: number) => void;
  } = {},
) {
  const service = new LeadEnrichmentService();
  let completed = 0;
  return mapConcurrent(leads, options.concurrency ?? 3, async (lead) => {
    let result = lead;
    try {
      result = await service.enrich(lead, options.signal);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      console.warn("[lead-enrichment] lead failed", {
        sourceId: lead.source_id,
        reason: error instanceof Error ? error.name : "Unknown",
      });
    }
    completed += 1;
    options.onLead?.(result, completed);
    return result;
  });
}
