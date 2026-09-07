import "server-only";
import * as cheerio from "cheerio";
import type { EnrichedValue, LeadConfidence } from "@/types/crm";
import {
  comparableDomain,
  normalizeHttpUrl,
} from "@/lib/leads/utils/normalize-url";
import { safeFetchText } from "@/lib/leads/utils/url-security";
import { retry } from "@/lib/leads/utils/queue";
import { identifySocialUrl } from "./social-patterns";

interface DiscoveryInput {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
}
interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}
const cache = new Map<string, { expiresAt: number; results: SearchResult[] }>();
let searchQueue: Promise<void> = Promise.resolve();
let nextSearchAt = 0;
const DIRECTORY_HOSTS =
  /(?:google\.|bing\.|duckduckgo\.|yelp\.|tripadvisor\.|guiamais\.|telelistas\.|solutudo\.|econodata\.|cnpj\.biz|instagram\.|facebook\.|linkedin\.|youtube\.|tiktok\.)/i;

function normalizedTokens(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(
      (token) => token.length > 2 && !["ltda", "me", "eireli"].includes(token),
    );
}

async function throttled<T>(task: () => Promise<T>, signal?: AbortSignal) {
  const previous = searchQueue;
  let release!: () => void;
  searchQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const delay = Math.max(0, nextSearchAt - Date.now());
    if (delay)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("Busca cancelada."));
          },
          { once: true },
        );
      });
    return await task();
  } finally {
    nextSearchAt = Date.now() + 850;
    release();
  }
}

function unwrapDuckDuckGo(value: string) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const target = url.searchParams.get("uddg");
  return normalizeHttpUrl(target ? decodeURIComponent(target) : normalized);
}

async function webSearch(query: string, signal?: AbortSignal) {
  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  return throttled(async () => {
    const response = await retry(
      () =>
        safeFetchText(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          { signal, timeoutMs: 8_000, maxBytes: 700_000 },
        ),
      2,
    );
    if (response.status !== 200) return [];
    const $ = cheerio.load(response.body);
    const results: SearchResult[] = [];
    $(".result")
      .slice(0, 8)
      .each((_, element) => {
        const anchor = $(element).find(".result__a").first();
        const url = unwrapDuckDuckGo(anchor.attr("href") || "");
        if (!url) return;
        results.push({
          url,
          title: anchor.text().trim(),
          snippet: $(element).find(".result__snippet").text().trim(),
        });
      });
    cache.set(key, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, results });
    return results;
  }, signal).catch(() => []);
}

function identityConfidence(input: DiscoveryInput, result: SearchResult) {
  const haystack = normalizedTokens(
    `${result.title} ${result.snippet} ${comparableDomain(result.url) || ""}`,
  );
  const nameTokens = normalizedTokens(input.name);
  const nameMatch = nameTokens.length
    ? nameTokens.filter((token) => haystack.includes(token)).length /
      nameTokens.length
    : 0;
  let score = nameMatch * 0.62;
  if (
    normalizedTokens(input.city || "").some((token) => haystack.includes(token))
  )
    score += 0.18;
  if (
    normalizedTokens(input.address || "").some((token) =>
      haystack.includes(token),
    )
  )
    score += 0.12;
  if (
    input.phone &&
    result.snippet
      .replace(/\D/g, "")
      .includes(input.phone.replace(/\D/g, "").slice(-8))
  )
    score += 0.2;
  return Math.min(1, score);
}

export class WebsiteDiscoveryService {
  async discover(
    input: DiscoveryInput,
    signal?: AbortSignal,
  ): Promise<EnrichedValue<string> | null> {
    const query = `"${input.name}" "${[input.city, input.state].filter(Boolean).join(" ")}"`;
    const results = await webSearch(query, signal);
    const candidates = results
      .filter(({ url }) => !DIRECTORY_HOSTS.test(new URL(url).hostname))
      .map((result) => ({
        result,
        confidence: identityConfidence(input, result),
      }))
      .sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    if (!best || best.confidence < 0.7) return null;
    return {
      value: best.result.url,
      confidence: best.confidence,
      source: "web-search",
    };
  }

  async discoverSocials(
    input: DiscoveryInput,
    signal?: AbortSignal,
  ): Promise<LeadConfidence> {
    const query = `"${input.name}" "${input.city || ""}" Instagram Facebook LinkedIn`;
    const results = await webSearch(query, signal);
    const found: LeadConfidence = {};
    for (const result of results) {
      const social = identifySocialUrl(result.url);
      if (
        !social ||
        !["instagram", "facebook", "linkedin"].includes(social.network)
      )
        continue;
      const confidence = identityConfidence(input, result);
      if (confidence < 0.7) continue;
      const key = social.network as "instagram" | "facebook" | "linkedin";
      if (!found[key] || confidence > found[key]!.confidence)
        found[key] = { value: social.url, confidence, source: "web-search" };
    }
    return found;
  }
}
