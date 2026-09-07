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
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000;

type Geocode = { latitude: number; longitude: number };
const geocodeCache = new Map<string, { expiresAt: number; value: Geocode }>();
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
  return [
    ...new Set(
      validHttpsUrls([...(configured || []), ...DEFAULT_OVERPASS_URLS]),
    ),
  ];
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
  return alias ? NICHE_FILTERS[alias] : [`["name"~"${regexValue(niche)}",i]`];
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
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    return inGeocodeQueue(async () => {
      const queuedCache = geocodeCache.get(key);
      if (queuedCache && queuedCache.expiresAt > Date.now())
        return queuedCache.value;

      const baseUrl = nominatimUrl();
      if (!baseUrl)
        throw new Error("O endereço do serviço de localização é inválido.");
      const url = new URL(baseUrl);
      url.search = new URLSearchParams({
        q: location,
        format: "jsonv2",
        limit: "1",
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
      const value = {
        latitude: Number(parsed.data[0].lat),
        longitude: Number(parsed.data[0].lon),
      };
      if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude))
        throw new Error("A localização retornou limites inválidos.");
      geocodeCache.set(key, {
        value,
        expiresAt: Date.now() + GEOCODE_CACHE_TTL,
      });
      return value;
    }, signal);
  }

  async searchBusinesses(
    input: SearchInput,
    userId: string,
    signal?: AbortSignal,
  ) {
    const location = [input.city, input.state, input.country]
      .filter(Boolean)
      .join(", ");
    const center = await this.geocode(location, signal);
    const radiusMeters = input.radius_km * 1_000;
    const resultLimit = Math.min(Math.max(input.quantity * 5, 100), 500);
    const query = `[out:json][timeout:18];(${nicheFilters(input.niche)
      .map(
        (filter) =>
          `nwr${filter}(around:${radiusMeters},${center.latitude},${center.longitude});`,
      )
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
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
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
            mapOsmElement(
              element,
              userId,
              input.niche,
              location,
              input.country,
            ),
          )
          .filter((lead): lead is Lead => Boolean(lead))
          .map((lead) => ({
            ...lead,
            discovery_distance_m: Math.round(distanceMeters(center, lead)),
          }))
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

function distanceMeters(center: Geocode, lead: Lead) {
  if (lead.latitude === null || lead.longitude === null)
    return Number.MAX_SAFE_INTEGER;
  const rad = Math.PI / 180;
  const dLat = (lead.latitude - center.latitude) * rad;
  const dLon = (lead.longitude - center.longitude) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(center.latitude * rad) *
      Math.cos(lead.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
