import { randomUUID } from "node:crypto";
import { z } from "zod";
import { unavailableAnalysis } from "@/lib/analyzers";
import type { Lead } from "@/types/crm";
import { googleMapsSearchUrl } from "@/lib/leads/utils/normalize-url";

export const nominatimResponseSchema = z.array(
  z.object({
    boundingbox: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    display_name: z.string(),
    lat: z.string(),
    lon: z.string(),
  }),
);

export const overpassResponseSchema = z.object({
  elements: z.array(
    z.object({
      type: z.enum(["node", "way", "relation"]),
      id: z.number().int(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: z.object({ lat: z.number(), lon: z.number() }).optional(),
      tags: z.record(z.string(), z.string()).default({}),
    }),
  ),
});

export type OsmElement = z.infer<
  typeof overpassResponseSchema
>["elements"][number];

function clean(value: string | undefined, max = 500) {
  return value?.trim().slice(0, max) || "";
}

function webUrl(value: string | undefined) {
  const text = clean(value, 2000);
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function socialUrl(value: string | undefined, network: string) {
  const text = clean(value, 500);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return webUrl(text);
  return webUrl(`${network}.com/${text.replace(/^@/, "")}`);
}

export function mapOsmElement(
  element: OsmElement,
  userId: string,
  niche: string,
  location: string,
  country = "Brasil",
): Lead | null {
  const tags = element.tags;
  const name = clean(tags.name || tags["name:pt"] || tags.brand, 250);
  if (!name) return null;
  const now = new Date().toISOString();
  const [fallbackCity = "", fallbackState = ""] = location
    .split(",")
    .map((part) => part.trim());
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;
  const street = clean(tags["addr:street"]);
  const number = clean(tags["addr:housenumber"], 40);
  const city =
    clean(tags["addr:city"] || tags["addr:municipality"]) || fallbackCity;
  const state = clean(tags["addr:state"], 80) || fallbackState;
  const website = webUrl(tags["contact:website"] || tags.website || tags.url);
  const category = clean(
    tags["amenity"] || tags.shop || tags.office || tags.craft,
    120,
  ).replaceAll("_", " ");

  const address = [street, number].filter(Boolean).join(", ");
  return {
    id: randomUUID(),
    user_id: userId,
    company_name: name,
    category: category || niche,
    description: clean(tags.description, 2000),
    address,
    neighborhood: clean(tags["addr:suburb"] || tags["addr:district"], 120),
    city,
    state,
    country: clean(tags["addr:country"], 80) || country,
    postal_code: clean(tags["addr:postcode"], 30) || null,
    latitude,
    longitude,
    phone: clean(tags["contact:phone"] || tags.phone, 100) || null,
    whatsapp: clean(tags["contact:whatsapp"] || tags.whatsapp, 100) || null,
    email: clean(tags["contact:email"] || tags.email, 320) || null,
    website,
    domain: website ? new URL(website).hostname.replace(/^www\./, "") : null,
    instagram: socialUrl(
      tags["contact:instagram"] || tags.instagram,
      "instagram",
    ),
    facebook: socialUrl(tags["contact:facebook"] || tags.facebook, "facebook"),
    linkedin: socialUrl(tags["contact:linkedin"] || tags.linkedin, "linkedin"),
    google_rating: null,
    review_count: 0,
    opening_hours: clean(tags.opening_hours, 1000) || null,
    source: "OpenStreetMap",
    source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    source_id: `${element.type}/${element.id}`,
    google_maps_url: googleMapsSearchUrl({
      name,
      address: [address, city, state].filter(Boolean).join(", "),
      latitude,
      longitude,
    }),
    sources: ["OpenStreetMap"],
    confidence: {},
    enrichment_confidence: 0.9,
    last_enriched_at: null,
    discovery_distance_m: null,
    status: "Novo",
    score: 0,
    notes: "",
    is_active: !Object.keys(tags).some(
      (key) =>
        key === "disused" ||
        key === "abandoned" ||
        key.startsWith("disused:") ||
        key.startsWith("abandoned:"),
    ),
    created_at: now,
    updated_at: now,
    last_contacted_at: null,
    analysis: { ...unavailableAnalysis },
    score_factors: [],
    tag_ids: [],
    list_ids: [],
  };
}
