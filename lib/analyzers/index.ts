import type { WebsiteAnalysis } from "@/types/crm";
import { z } from "zod";
export const websiteAnalysisSchema = z.object({
  mode: z.enum(["live", "unavailable"]),
  checked_at: z.string().nullable(),
  https: z.boolean().nullable(),
  title: z.string().nullable(),
  meta_description: z.string().nullable(),
  viewport: z.boolean().nullable(),
  severe_issues: z.number().min(0).max(1),
  seo_issues: z.number().min(0).max(1),
  mobile_issues: z.number().min(0).max(1),
  performance: z.enum([
    "Excelente",
    "Bom",
    "Atenção",
    "Ruim",
    "Não encontrado",
    "Não analisado",
  ]),
  has_cta: z.boolean().nullable(),
  has_form: z.boolean().nullable(),
  broken_links: z.number().nonnegative().nullable(),
  reachable: z.boolean().nullable().default(null),
  response_status: z.number().int().nullable().default(null),
  responsive: z.boolean().nullable().default(null),
  content_bytes: z.number().int().nonnegative().nullable().default(null),
  page_count: z.number().int().nonnegative().default(0),
  has_whatsapp: z.boolean().nullable().default(null),
  has_social_links: z.boolean().nullable().default(null),
  extremely_simple: z.boolean().nullable().default(null),
  redirected_url: z.string().nullable().default(null),
  technical_issues: z.array(z.string()).default([]),
});
export interface WebsiteAnalyzer {
  readonly name: string;
  analyze(website: string | null): Promise<WebsiteAnalysis>;
}
export const unavailableAnalysis: WebsiteAnalysis = {
  mode: "unavailable",
  checked_at: null,
  https: null,
  title: null,
  meta_description: null,
  viewport: null,
  severe_issues: 0,
  seo_issues: 0,
  mobile_issues: 0,
  performance: "Não analisado",
  has_cta: null,
  has_form: null,
  broken_links: null,
  reachable: null,
  response_status: null,
  responsive: null,
  content_bytes: null,
  page_count: 0,
  has_whatsapp: null,
  has_social_links: null,
  extremely_simple: null,
  redirected_url: null,
  technical_issues: [],
};
export class UnconfiguredWebsiteAnalyzer implements WebsiteAnalyzer {
  readonly name = "Análise não configurada";
  async analyze(): Promise<WebsiteAnalysis> {
    return { ...unavailableAnalysis };
  }
}
