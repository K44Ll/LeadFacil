import * as cheerio from "cheerio";
import type { EnrichedValue } from "@/types/crm";
import { normalizeBrazilianPhone } from "@/lib/leads/utils/normalize-phone";
import { identifySocialUrl, type SocialNetwork } from "./social-patterns";

export interface ExtractedContacts {
  phone?: EnrichedValue<string>;
  whatsapp?: EnrichedValue<string>;
  email?: EnrichedValue<string>;
  socials: Partial<Record<SocialNetwork, EnrichedValue<string>>>;
}

const EMAIL_RE = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const PHONE_RE = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[\s.-]?\d{4}/g;
const BAD_EMAIL =
  /(?:example\.(?:com|org)|noreply|no-reply|sentry|webpack|wixpress|cloudflare|@2x\.)/i;
const EMAIL_PRIORITY = /^(contato|comercial|vendas|atendimento|hello)@/i;

function bestEmail(values: string[]) {
  return [...new Set(values.map((value) => value.toLowerCase()))]
    .filter((value) => value.length <= 320 && !BAD_EMAIL.test(value))
    .sort(
      (a, b) => Number(EMAIL_PRIORITY.test(b)) - Number(EMAIL_PRIORITY.test(a)),
    )[0];
}

export function extractContacts(
  html: string,
  sourceUrl: string,
): ExtractedContacts {
  const $ = cheerio.load(html);
  $("script,style,noscript,template,svg").remove();
  const text = $.root().text().replace(/\s+/g, " ");
  const phones: Array<{ value: string; confidence: number }> = [];
  const whatsapp: Array<{ value: string; confidence: number }> = [];
  const emails: string[] = [];
  const socials: ExtractedContacts["socials"] = {};

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href) return;
    if (/^tel:/i.test(href)) {
      const value = normalizeBrazilianPhone(decodeURIComponent(href.slice(4)));
      if (value) phones.push({ value, confidence: 0.98 });
      return;
    }
    if (/^mailto:/i.test(href)) {
      emails.push(decodeURIComponent(href.slice(7)).split("?")[0]);
      return;
    }
    let absolute: string;
    try {
      absolute = new URL(href, sourceUrl).toString();
    } catch {
      return;
    }
    const waMatch = absolute.match(/(?:wa\.me\/|phone=)(\+?\d{10,15})/i);
    if (
      /\b(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)\b/i.test(absolute) &&
      waMatch
    ) {
      const value = normalizeBrazilianPhone(waMatch[1]);
      if (value) whatsapp.push({ value, confidence: 0.99 });
    }
    const social = identifySocialUrl(absolute);
    if (social) {
      const confidence =
        social.network === "linkedin" &&
        !new URL(social.url).pathname.startsWith("/company/")
          ? 0.82
          : 0.97;
      const current = socials[social.network];
      if (!current || confidence > current.confidence)
        socials[social.network] = {
          value: social.url,
          confidence,
          source: "website",
        };
    }
  });

  for (const match of text.match(PHONE_RE) ?? []) {
    const value = normalizeBrazilianPhone(match);
    if (value) phones.push({ value, confidence: 0.84 });
  }
  emails.push(...(text.match(EMAIL_RE) ?? []));
  const email = bestEmail(emails);
  const bestPhone = phones.sort((a, b) => b.confidence - a.confidence)[0];
  const bestWhatsapp = whatsapp.sort((a, b) => b.confidence - a.confidence)[0];
  return {
    phone: bestPhone && { ...bestPhone, source: "website" },
    whatsapp: bestWhatsapp && { ...bestWhatsapp, source: "website" },
    email: email
      ? {
          value: email,
          confidence: EMAIL_PRIORITY.test(email) ? 0.97 : 0.9,
          source: "website",
        }
      : undefined,
    socials,
  };
}
