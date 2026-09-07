import "server-only";
import * as cheerio from "cheerio";
import type { WebsiteAnalysis } from "@/types/crm";
import { unavailableAnalysis } from "@/lib/analyzers";
import { safeFetchText } from "@/lib/leads/utils/url-security";
import { retry } from "@/lib/leads/utils/queue";
import { extractContacts, type ExtractedContacts } from "./contact-extractor";

const CONTACT_PATHS = [
  "/contato",
  "/contact",
  "/sobre",
  "/about",
  "/fale-conosco",
];
const hostQueues = new Map<string, Promise<void>>();
const nextHostAccess = new Map<string, number>();

async function politeFetch(
  url: string,
  options: Parameters<typeof safeFetchText>[1],
  attempts = 1,
) {
  const host = new URL(url).hostname;
  const previous = hostQueues.get(host) || Promise.resolve();
  let release!: () => void;
  hostQueues.set(host, new Promise<void>((resolve) => { release = resolve; }));
  await previous;
  try {
    const delay = Math.max(0, (nextHostAccess.get(host) || 0) - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    return await retry(() => safeFetchText(url, options), attempts);
  } finally {
    nextHostAccess.set(host, Date.now() + 350);
    release();
  }
}

function emptyContacts(): ExtractedContacts {
  return { socials: {} };
}
function mergeContacts(target: ExtractedContacts, next: ExtractedContacts) {
  for (const key of ["phone", "whatsapp", "email"] as const) {
    if (
      next[key] &&
      (!target[key] || next[key]!.confidence > target[key]!.confidence)
    )
      target[key] = next[key];
  }
  for (const [network, value] of Object.entries(next.socials)) {
    const key = network as keyof typeof target.socials;
    if (
      value &&
      (!target.socials[key] ||
        value.confidence > target.socials[key]!.confidence)
    )
      target.socials[key] = value;
  }
}

export class WebsiteScraper {
  async scrape(website: string, signal?: AbortSignal) {
    const contacts = emptyContacts();
    const pages: Array<{ url: string; html: string; bytes: number }> = [];
    let homepage;
    try {
      homepage = await politeFetch(website, {
        signal,
        timeoutMs: 8_000,
        maxBytes: 1_000_000,
        maxRedirects: 3,
      }, 2);
    } catch {
      return {
        contacts,
        analysis: {
          ...unavailableAnalysis,
          mode: "live" as const,
          checked_at: new Date().toISOString(),
          reachable: false,
          severe_issues: 1,
          performance: "Ruim" as const,
          technical_issues: ["site_unreachable"],
        },
      };
    }
    if (
      homepage.status >= 200 &&
      homepage.status < 400 &&
      /html|xhtml/i.test(homepage.contentType)
    ) {
      pages.push({
        url: homepage.url,
        html: homepage.body,
        bytes: homepage.bytes,
      });
      mergeContacts(contacts, extractContacts(homepage.body, homepage.url));
    }
    const base = new URL(homepage.url);
    const $home = cheerio.load(homepage.body);
    const discovered = new Set<string>();
    $home("a[href]").each((_, element) => {
      try {
        const url = new URL($home(element).attr("href") || "", base);
        if (
          url.origin === base.origin &&
          CONTACT_PATHS.some((path) =>
            url.pathname.toLowerCase().includes(path.slice(1)),
          )
        ) {
          url.hash = "";
          discovered.add(url.toString());
        }
      } catch {
        /* malformed link */
      }
    });
    for (const path of CONTACT_PATHS)
      discovered.add(new URL(path, base).toString());
    for (const url of [...discovered].slice(0, 4)) {
      if (signal?.aborted) break;
      try {
        const page = await politeFetch(url, {
          signal,
          timeoutMs: 5_000,
          maxBytes: 700_000,
          maxRedirects: 2,
        });
        if (
          page.status < 200 ||
          page.status >= 400 ||
          !/html|xhtml/i.test(page.contentType)
        )
          continue;
        pages.push({ url: page.url, html: page.body, bytes: page.bytes });
        mergeContacts(contacts, extractContacts(page.body, page.url));
      } catch {
        /* one page must not fail the lead */
      }
    }
    const $ = cheerio.load(homepage.body);
    const textLength = $("body").text().replace(/\s+/g, " ").trim().length;
    const linkCount = $("a[href]").length;
    const hasViewport = $("meta[name='viewport']").length > 0;
    const hasForm = $("form").length > 0;
    const oldSignals =
      $("frameset,frame,object[type*='flash'],embed[type*='flash']").length >
        0 ||
      ($("table").length > 8 && !hasViewport) ||
      /microsoft frontpage/i.test(
        $("meta[name='generator']").attr("content") || "",
      );
    const extremelySimple = textLength < 400 && linkCount < 6;
    const issues: string[] = [];
    if (base.protocol !== "https:") issues.push("no_https");
    if (!hasViewport) issues.push("missing_viewport");
    if (!$("meta[name='description']").attr("content")?.trim())
      issues.push("missing_meta_description");
    if (!hasForm) issues.push("missing_form");
    if (!contacts.whatsapp) issues.push("missing_whatsapp");
    if (!Object.keys(contacts.socials).length)
      issues.push("missing_social_links");
    if (oldSignals) issues.push("legacy_technical_signals");
    if (extremelySimple) issues.push("extremely_simple_page");
    const severe =
      Number(homepage.status >= 400) ||
      Number(oldSignals) * 0.35 +
        Number(extremelySimple) * 0.35 +
        Number(base.protocol !== "https:") * 0.2;
    const seo =
      (Number(!$("title").text().trim()) +
        Number(!$("meta[name='description']").attr("content")?.trim())) /
      2;
    const mobile = hasViewport ? 0 : 1;
    const analysis: WebsiteAnalysis = {
      mode: "live",
      checked_at: new Date().toISOString(),
      https: base.protocol === "https:",
      title: $("title").text().trim().slice(0, 300) || null,
      meta_description:
        $("meta[name='description']").attr("content")?.trim().slice(0, 500) ||
        null,
      viewport: hasViewport,
      severe_issues: Math.min(1, severe),
      seo_issues: seo,
      mobile_issues: mobile,
      performance:
        homepage.status >= 400
          ? "Ruim"
          : issues.length >= 5
            ? "Atenção"
            : "Bom",
      has_cta: $("a,button")
        .toArray()
        .some((el) =>
          /contato|orçamento|agendar|whatsapp|fale/i.test($(el).text()),
        ),
      has_form: hasForm,
      broken_links: null,
      reachable: homepage.status < 500,
      response_status: homepage.status,
      responsive: hasViewport,
      content_bytes: pages.reduce((sum, page) => sum + page.bytes, 0),
      page_count: pages.length,
      has_whatsapp: Boolean(contacts.whatsapp),
      has_social_links: Boolean(Object.keys(contacts.socials).length),
      extremely_simple: extremelySimple,
      redirected_url: homepage.url !== website ? homepage.url : null,
      technical_issues: issues,
    };
    return { contacts, analysis };
  }
}
