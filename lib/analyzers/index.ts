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
};
export class UnconfiguredWebsiteAnalyzer implements WebsiteAnalyzer {
  readonly name = "Análise não configurada";
  async analyze(): Promise<WebsiteAnalysis> {
    return { ...unavailableAnalysis };
  }
}
