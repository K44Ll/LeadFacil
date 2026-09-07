import "server-only";

import type { Lead, SearchInput } from "@/types/crm";
import type { LeadProvider } from "./index";
import {
  mapOsmElement,
  nominatimResponseSchema,
  overpassResponseSchema,
} from "./openstreetmap-schema";

const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_OVERPASS_URLS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000;

type Bounds = [south: number, north: number, west: number, east: number];
const geocodeCache = new Map<string, { expiresAt: number; bounds: Bounds }>();
let geocodeQueue: Promise<void> = Promise.resolve();
let nextGeocodeAt = 0;

const NICHE_FILTERS: Record<string, string[]> = {
  barbearia: ['["shop"="hairdresser"]'],
  barbearias: ['["shop"="hairdresser"]'],
  restaurante: ['["amenity"="restaurant"]'],
  restaurantes: ['["amenity"="restaurant"]'],
  dentista: ['["amenity"="dentist"]'],
  dentistas: ['["amenity"="dentist"]'],
  clinica: ['["amenity"="clinic"]', '["amenity"="doctors"]'],
  clinicas: ['["amenity"="clinic"]', '["amenity"="doctors"]'],
  academia: ['["leisure"="fitness_centre"]'],
  academias: ['["leisure"="fitness_centre"]'],
  oficina: ['["shop"="car_repair"]'],
  oficinas: ['["shop"="car_repair"]'],
  advogado: ['["office"="lawyer"]'],
  advogados: ['["office"="lawyer"]'],
  "salao de beleza": ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  "saloes de beleza": ['["shop"="hairdresser"]', '["shop"="beauty"]'],
  escola: ['["amenity"="school"]'],
  escolas: ['["amenity"="school"]'],
  imobiliaria: ['["office"="estate_agent"]'],
  imobiliarias: ['["office"="estate_agent"]'],
  refrigeracao: ['["craft"="hvac"]'],
};

function normalize(text: string) {
  return text
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function regexValue(text: string) {
  return text.replace(/[\\".^$|?*+()[\]{}]/g, "\\$&");
}

function validHttpsUrls(values: string[]) {
  return values.filter((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  });
}

function endpointList() {
  const configured = process.env.OSM_OVERPASS_URLS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return validHttpsUrls(configured?.length ? configured : DEFAULT_OVERPASS_URLS);
}

function nominatimUrl() {
  const configured = process.env.OSM_NOMINATIM_URL?.trim();
  return validHttpsUrls(configured ? [configured] : [DEFAULT_NOMINATIM_URL])[0];
}

function combinedSignal(parent: AbortSignal | undefined, timeout: number) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  return parent ? AbortSignal.any([parent, timeoutSignal]) : timeoutSignal;
}

function wait(milliseconds: number, signal?: AbortSignal) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("Busca cancelada."));
      },
      { once: true },
    );
  });
}

async function inGeocodeQueue<T>(task: () => Promise<T>, signal?: AbortSignal) {
  const previous = geocodeQueue;
  let release!: () => void;
  geocodeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    await wait(Math.max(0, nextGeocodeAt - Date.now()), signal);
    return await task();
  } finally {
    nextGeocodeAt = Date.now() + 1_050;
    release();
  }
}

function nicheFilters(niche: string) {
  const normalized = normalize(niche);
  const exact = NICHE_FILTERS[normalized];
  if (exact) return exact;
  const alias = Object.keys(NICHE_FILTERS).find((key) =>
    normalized.includes(key),
  );
  return alias
    ? NICHE_FILTERS[alias]
    : [`["name"~"${regexValue(niche)}",i]`];
}

function matchesFilters(lead: Lead, input: SearchInput) {
  if (input.no_website && lead.website) return false;
  if (input.has_phone && !lead.phone) return false;
  if (input.has_whatsapp && !lead.whatsapp) return false;
  if (input.has_instagram && !lead.instagram) return false;
  if (
    input.min_rating > 0 &&
    (lead.google_rating === null || lead.google_rating < input.min_rating)
  )
    return false;
  if (lead.review_count < input.min_reviews) return false;
  return true;
}

export class OpenStreetMapProvider implements LeadProvider {
  readonly name = "OpenStreetMap";
  readonly mode = "live" as const;
  readonly persistence = "allowed" as const;

  constructor(private readonly contactEmail: string) {}

  private get headers() {
    return {
      "User-Agent": `LeadFacil/1.0 (+contact: ${this.contactEmail})`,
      "Accept-Language": "pt-BR,pt;q=0.9",
    };
  }

  private async geocode(location: string, signal?: AbortSignal) {
    const key = normalize(location);
    const cached = geocodeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.bounds;

    return inGeocodeQueue(async () => {
      const queuedCache = geocodeCache.get(key);
      if (queuedCache && queuedCache.expiresAt > Date.now())
        return queuedCache.bounds;

      const baseUrl = nominatimUrl();
      if (!baseUrl)
        throw new Error("O endereço do serviço de localização é inválido.");
      const url = new URL(baseUrl);
      url.search = new URLSearchParams({
        q: location,
        format: "jsonv2",
        limit: "1",
        countrycodes: "br",
        email: this.contactEmail,
      }).toString();
      const startedAt = Date.now();
      let response: Response;
      try {
        response = await fetch(url, {
          headers: this.headers,
          cache: "no-store",
          signal: combinedSignal(signal, 10_000),
        });
      } catch {
        if (signal?.aborted) throw new Error("Busca cancelada.");
        throw new Error("Não foi possível localizar a região informada.");
      }
      console.info("[openstreetmap] geocode", {
        status: response.status,
        durationMs: Date.now() - startedAt,
        cached: false,
      });
      if (!response.ok)
        throw new Error(
          "O serviço de localização do OpenStreetMap está indisponível.",
        );
      const parsed = nominatimResponseSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (!parsed.success || !parsed.data[0])
        throw new Error("Localização não encontrada no OpenStreetMap.");
      const bounds = parsed.data[0].boundingbox.map(Number) as Bounds;
      if (!bounds.every(Number.isFinite))
        throw new Error("A localização retornou limites inválidos.");
      geocodeCache.set(key, {
        bounds,
        expiresAt: Date.now() + GEOCODE_CACHE_TTL,
      });
      return bounds;
    }, signal);
  }

  async searchBusinesses(
    input: SearchInput,
    userId: string,
    signal?: AbortSignal,
  ) {
    const [south, north, west, east] = await this.geocode(
      input.location,
      signal,
    );
    const bbox = `${south},${west},${north},${east}`;
    const resultLimit = Math.min(Math.max(input.quantity * 5, 100), 500);
    const query = `[out:json][timeout:18];(${nicheFilters(input.niche)
      .map((filter) => `nwr${filter}(${bbox});`)
      .join("")});out center ${resultLimit};`;
    const endpoints = endpointList();
    if (!endpoints.length)
      throw new Error("Nenhum servidor de busca do OpenStreetMap é válido.");

    for (const endpoint of endpoints) {
      const startedAt = Date.now();
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...this.headers,
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: new URLSearchParams({ data: query }),
          cache: "no-store",
          signal: combinedSignal(signal, 20_000),
        });
        console.info("[openstreetmap] overpass", {
          host: new URL(endpoint).hostname,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
        if (!response.ok) continue;
        const parsed = overpassResponseSchema.safeParse(
          await response.json().catch(() => null),
        );
        if (!parsed.success) continue;
        return parsed.data.elements
          .map((element) =>
            mapOsmElement(element, userId, input.niche, input.location),
          )
          .filter((lead): lead is Lead => Boolean(lead))
          .filter((lead) => matchesFilters(lead, input))
          .slice(0, input.quantity);
      } catch (error) {
        if (signal?.aborted) throw new Error("Busca cancelada.");
        console.warn("[openstreetmap] overpass unavailable", {
          host: new URL(endpoint).hostname,
          durationMs: Date.now() - startedAt,
          reason: error instanceof Error ? error.name : "Unknown error",
        });
      }
    }

    throw new Error(
      "Os servidores públicos do OpenStreetMap estão ocupados. Tente novamente em alguns instantes.",
    );
  }
}
