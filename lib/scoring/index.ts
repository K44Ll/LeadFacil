import type { Lead, ScoreFactor, WebsiteAnalysis } from "@/types/crm";

export const SCORE_WEIGHTS = {
  no_website: {
    points: 25,
    label: "Sem website",
    description: "A empresa ainda não possui um website próprio.",
  },
  website_issues: {
    points: 20,
    label: "Problemas no website",
    description:
      "Gravidade dos problemas técnicos identificados (proporcional).",
  },
  reviews: {
    points: 10,
    label: "Mais de 100 avaliações",
    description:
      "Volume de avaliações indica uma base de clientes estabelecida.",
  },
  reviews_bonus: {
    points: 10,
    label: "Mais de 300 avaliações",
    description: "Bônus por uma reputação pública consolidada.",
  },
  rating: {
    points: 10,
    label: "Avaliação a partir de 4,5",
    description:
      "Clientes satisfeitos sugerem potencial para ampliar a presença digital.",
  },
  phone: {
    points: 5,
    label: "Telefone disponível",
    description: "Há um canal telefônico para contato comercial.",
  },
  whatsapp: {
    points: 5,
    label: "WhatsApp disponível",
    description: "Há um canal de WhatsApp informado pela fonte.",
  },
  instagram: {
    points: 5,
    label: "Instagram encontrado",
    description: "A empresa tem presença em redes sociais.",
  },
  active: {
    points: 5,
    label: "Empresa ativa",
    description: "A fonte informa que a empresa está em operação.",
  },
  seo: {
    points: 10,
    label: "Oportunidades de SEO",
    description:
      "Problemas de SEO básico, proporcionais à gravidade observada.",
  },
  mobile: {
    points: 10,
    label: "Experiência mobile",
    description: "Problemas de experiência em dispositivos móveis.",
  },
} as const;
type ScoreInput = Pick<
  Lead,
  | "website"
  | "review_count"
  | "google_rating"
  | "phone"
  | "whatsapp"
  | "instagram"
  | "is_active"
> & { analysis?: WebsiteAnalysis };
export function calculateOpportunityScore(lead: ScoreInput) {
  const factors: ScoreFactor[] = [];
  function add(key: keyof typeof SCORE_WEIGHTS, multiplier = 1) {
    const weight = SCORE_WEIGHTS[key];
    const points = Math.round(
      weight.points *
        Math.min(1, Math.max(0, Number.isFinite(multiplier) ? multiplier : 0)),
    );
    if (points > 0)
      factors.push({
        key,
        label: weight.label,
        description: weight.description,
        points,
      });
  }
  if (!lead.website) add("no_website");
  if (lead.review_count > 100) add("reviews");
  if (lead.review_count > 300) add("reviews_bonus");
  if ((lead.google_rating ?? 0) >= 4.5) add("rating");
  if (lead.phone) add("phone");
  if (lead.whatsapp) add("whatsapp");
  if (lead.instagram) add("instagram");
  if (lead.is_active) add("active");
  if (lead.website && lead.analysis && lead.analysis.mode !== "unavailable") {
    add("website_issues", lead.analysis.severe_issues);
    add("seo", lead.analysis.seo_issues);
    add("mobile", lead.analysis.mobile_issues);
  }
  return {
    score: Math.min(
      100,
      factors.reduce((sum, f) => sum + f.points, 0),
    ),
    factors,
  };
}
export function scoreTier(score: number) {
  return score >= 85
    ? "excellent"
    : score >= 70
      ? "high"
      : score >= 40
        ? "medium"
        : "low";
}
export const SCORE_LABELS = {
  excellent: "Excelente",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};
