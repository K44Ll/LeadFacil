export const STATUSES = [
  "Novo",
  "Contatado",
  "Respondeu",
  "Interessado",
  "Reunião",
  "Fechado",
  "Descartado",
] as const;
export type LeadStatus = (typeof STATUSES)[number];
export const INTERACTION_TYPES = [
  "Ligação",
  "WhatsApp",
  "Email",
  "Reunião",
  "Nota",
  "Resposta",
  "Outro",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number] | "Sistema";
export type PresenceStatus =
  "Excelente" | "Bom" | "Atenção" | "Ruim" | "Não encontrado" | "Não analisado";
export interface WebsiteAnalysis {
  mode: "live" | "unavailable";
  checked_at: string | null;
  https: boolean | null;
  title: string | null;
  meta_description: string | null;
  viewport: boolean | null;
  severe_issues: number;
  seo_issues: number;
  mobile_issues: number;
  performance: PresenceStatus;
  has_cta: boolean | null;
  has_form: boolean | null;
  broken_links: number | null;
  reachable: boolean | null;
  response_status: number | null;
  responsive: boolean | null;
  content_bytes: number | null;
  page_count: number;
  has_whatsapp: boolean | null;
  has_social_links: boolean | null;
  extremely_simple: boolean | null;
  redirected_url: string | null;
  technical_issues: string[];
}
export interface EnrichedValue<T> {
  value: T;
  confidence: number;
  source: string;
}
export type ConfidenceField =
  | "phone"
  | "whatsapp"
  | "email"
  | "website"
  | "instagram"
  | "facebook"
  | "linkedin";
export type LeadConfidence = Partial<
  Record<ConfidenceField, EnrichedValue<string>>
>;
export interface ScoreFactor {
  key: string;
  label: string;
  description: string;
  points: number;
}
export interface Lead {
  id: string;
  user_id: string;
  company_name: string;
  category: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
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
  source: string;
  source_url: string | null;
  source_id: string;
  google_maps_url: string;
  sources: string[];
  confidence: LeadConfidence;
  enrichment_confidence: number;
  last_enriched_at: string | null;
  discovery_distance_m: number | null;
  status: LeadStatus;
  score: number;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_contacted_at: string | null;
  analysis: WebsiteAnalysis;
  score_factors: ScoreFactor[];
  tag_ids: string[];
  list_ids: string[];
}
export interface LeadList {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
}
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
}
export interface Interaction {
  id: string;
  user_id: string;
  lead_id: string;
  type: InteractionType;
  observation: string;
  result: string;
  happened_at: string;
  created_at: string;
}
export interface SearchRecord {
  id: string;
  user_id: string;
  niche: string;
  location: string;
  quantity: number;
  result_count: number;
  status: "completed" | "failed";
  provider: string;
  created_at: string;
}
export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}
export interface WorkspaceData {
  leads: Lead[];
  lists: LeadList[];
  tags: Tag[];
  interactions: Interaction[];
  searches: SearchRecord[];
  profile: Profile;
}
export interface SearchInput {
  niche: string;
  city: string;
  state: string;
  country: string;
  radius_km: number;
  quantity: number;
  no_website: boolean;
  has_phone: boolean;
  has_whatsapp: boolean;
  has_instagram: boolean;
  min_rating: number;
  min_reviews: number;
  min_score: number;
}
export type SearchPreview = Pick<
  Lead,
  | "company_name"
  | "category"
  | "address"
  | "city"
  | "state"
  | "phone"
  | "whatsapp"
  | "email"
  | "website"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "google_maps_url"
  | "enrichment_confidence"
  | "discovery_distance_m"
  | "google_rating"
  | "review_count"
  | "source_url"
  | "score"
>;
export type ActionResult =
  { ok: true; message: string } | { ok: false; message: string };
