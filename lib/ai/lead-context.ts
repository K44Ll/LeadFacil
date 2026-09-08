import type { WebsiteAnalysis } from "@/types/crm";

const MAX_FACT_LENGTH = 500;

type LeadSource = {
  company_name: string;
  category: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  domain: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  google_rating: number | null;
  review_count: number;
  opening_hours: string | null;
  notes: string;
  analysis: WebsiteAnalysis;
};

export type OutreachLeadContext = {
  name: string;
  category?: string;
  description?: string;
  location?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  openingHours?: string;
  publicReputation?: string;
  userNotes?: string;
  verifiedDigitalSignals?: string[];
};

function clean(value: string | null | undefined, max = MAX_FACT_LENGTH) {
  const result = value?.replace(/\s+/g, " ").trim().slice(0, max);
  return result || undefined;
}

export function createOutreachLeadContext(
  lead: LeadSource,
): OutreachLeadContext {
  const location = [
    clean(lead.address, 240),
    clean(lead.neighborhood, 100),
    clean(lead.city, 100),
    clean(lead.state, 80),
    clean(lead.country, 80),
  ]
    .filter(Boolean)
    .join(" · ");
  const verifiedDigitalSignals: string[] = [];
  const website = clean(lead.website, 300) || clean(lead.domain, 300);

  if (!website) verifiedDigitalSignals.push("Website não encontrado");
  if (lead.analysis.mode === "live") {
    if (lead.analysis.responsive === false)
      verifiedDigitalSignals.push("Site não responsivo na análise técnica");
    if (lead.analysis.has_form === false)
      verifiedDigitalSignals.push("Nenhum formulário detectado no site");
    if (lead.analysis.has_cta === false)
      verifiedDigitalSignals.push("Nenhum CTA detectado no site");
    if (lead.analysis.performance !== "Não analisado")
      verifiedDigitalSignals.push(
        `Performance técnica classificada como ${lead.analysis.performance}`,
      );
    for (const issue of lead.analysis.technical_issues.slice(0, 4)) {
      const cleaned = clean(issue, 180);
      if (cleaned) verifiedDigitalSignals.push(cleaned);
    }
  }

  return {
    name: clean(lead.company_name, 160) || "Empresa",
    category: clean(lead.category, 120),
    description: clean(lead.description),
    location: location || undefined,
    website,
    instagram: clean(lead.instagram, 300),
    facebook: clean(lead.facebook, 300),
    linkedin: clean(lead.linkedin, 300),
    phone: clean(lead.phone, 80),
    whatsapp: clean(lead.whatsapp, 80),
    email: clean(lead.email, 180),
    openingHours: clean(lead.opening_hours, 300),
    publicReputation:
      lead.google_rating === null
        ? undefined
        : `${lead.google_rating.toFixed(1)} de 5 em ${Math.max(0, lead.review_count)} avaliações públicas`,
    userNotes: clean(lead.notes, 1_000),
    verifiedDigitalSignals: verifiedDigitalSignals.length
      ? [...new Set(verifiedDigitalSignals)].slice(0, 8)
      : undefined,
  };
}
