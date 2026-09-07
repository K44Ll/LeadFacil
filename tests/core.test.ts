import test from "node:test";
import assert from "node:assert/strict";
import { calculateOpportunityScore } from "../lib/scoring";
import { unavailableAnalysis } from "../lib/analyzers";
import { searchSchema, mutationSchema } from "../lib/validation";
import {
  mapOsmElement,
  overpassResponseSchema,
} from "../lib/providers/openstreetmap-schema";
import { extractContacts } from "../lib/leads/enrichment/contact-extractor";
import { normalizeBrazilianPhone } from "../lib/leads/utils/normalize-phone";
import { deduplicateLeads } from "../lib/leads/utils/deduplication";
const empty = {
  website: null,
  review_count: 0,
  google_rating: null,
  phone: null,
  whatsapp: null,
  instagram: null,
  email: null,
  is_active: false,
};
test("score is deterministic and factors exactly explain the result", () => {
  const input = {
    ...empty,
    review_count: 301,
    google_rating: 4.5,
    phone: "available",
    whatsapp: "available",
    instagram: "available",
    is_active: true,
  };
  const a = calculateOpportunityScore(input),
    b = calculateOpportunityScore(input);
  assert.deepEqual(a, b);
  assert.equal(a.score, 93);
  assert.equal(
    a.factors.reduce((n, f) => n + f.points, 0),
    a.score,
  );
});
test("review thresholds apply only above 100 and 300", () => {
  assert.equal(
    calculateOpportunityScore({ ...empty, review_count: 100 }).score,
    40,
  );
  assert.equal(
    calculateOpportunityScore({ ...empty, review_count: 101 }).score,
    45,
  );
  assert.equal(
    calculateOpportunityScore({ ...empty, review_count: 300 }).score,
    45,
  );
  assert.equal(
    calculateOpportunityScore({ ...empty, review_count: 301 }).score,
    50,
  );
});
test("unavailable analysis never contributes technical points", () => {
  const result = calculateOpportunityScore({
    ...empty,
    website: "https://example.com",
    analysis: {
      ...unavailableAnalysis,
      severe_issues: 1,
      mobile_issues: 1,
      seo_issues: 1,
    },
  });
  assert.equal(result.score, 0);
  assert.equal(result.factors.length, 0);
});
test("malformed and unbounded severity cannot produce invalid scores", () => {
  const result = calculateOpportunityScore({
    ...empty,
    website: "https://example.com",
    analysis: {
      ...unavailableAnalysis,
      mode: "live",
      severe_issues: 20,
      mobile_issues: -20,
      seo_issues: NaN,
    },
  });
  assert.equal(result.score, 30);
  assert.ok(result.score >= 0 && result.score <= 100);
});
test("website absent does not add fictional SEO or mobile findings", () => {
  const result = calculateOpportunityScore({
    ...empty,
    analysis: {
      ...unavailableAnalysis,
      mode: "live",
      severe_issues: 1,
      mobile_issues: 1,
      seo_issues: 1,
    },
  });
  assert.equal(result.score, 40);
});

test("extracts and normalizes public phone, WhatsApp, email and social profiles", () => {
  const result = extractContacts(
    `
    <html><body>
      <a href="tel:(21) 2222-3333">Telefone</a>
      <a href="https://wa.me/5521999998888">WhatsApp</a>
      <a href="mailto:contato@barbearia.com.br">E-mail</a>
      <a href="https://instagram.com/barbearia.teste">Instagram</a>
      example@example.com noreply@barbearia.com.br
    </body></html>
  `,
    "https://barbearia.com.br",
  );
  assert.equal(result.phone?.value, "+552122223333");
  assert.equal(result.whatsapp?.value, "+5521999998888");
  assert.equal(result.email?.value, "contato@barbearia.com.br");
  assert.equal(
    result.socials.instagram?.value,
    "https://instagram.com/barbearia.teste",
  );
  assert.ok((result.socials.instagram?.confidence ?? 0) >= 0.9);
});

test("Brazilian phone normalization rejects malformed numbers", () => {
  assert.equal(normalizeBrazilianPhone("(21) 99999-8888"), "+5521999998888");
  assert.equal(normalizeBrazilianPhone("123"), null);
});
test("validation rejects oversized selections, invalid status and malformed search", () => {
  assert.equal(
    searchSchema.safeParse({ niche: "x", location: "", quantity: 1000 })
      .success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({ type: "status", ids: [], status: "Fechado" })
      .success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({
      type: "status",
      ids: ["not-a-uuid"],
      status: "Admin",
    }).success,
    false,
  );
  assert.equal(
    mutationSchema.safeParse({
      type: "profile",
      name: "Alex",
      avatar_url: "javascript:alert(1)",
    }).success,
    false,
  );
});

test("OpenStreetMap mapping keeps only explicit contact and location data", () => {
  const response = overpassResponseSchema.parse({
    elements: [
      {
        type: "node",
        id: 123,
        lat: -22.4,
        lon: -42.9,
        tags: {
          name: "Clínica Exemplo",
          amenity: "dentist",
          "addr:city": "Teresópolis",
          "addr:state": "RJ",
          "contact:phone": "(21) 2222-2222",
          "contact:instagram": "clinicaexemplo",
        },
      },
    ],
  });
  const lead = mapOsmElement(
    response.elements[0],
    "00000000-0000-4000-8000-000000000001",
    "Dentistas",
    "Teresópolis, RJ",
  );
  assert.ok(lead);
  assert.equal(lead.source_id, "node/123");
  assert.equal(lead.city, "Teresópolis");
  assert.equal(lead.state, "RJ");
  assert.equal(lead.instagram, "https://instagram.com/clinicaexemplo");
  assert.equal(lead.website, null);
  assert.equal(lead.whatsapp, null);
  assert.equal(lead.email, null);
  const duplicate = {
    ...lead,
    id: "00000000-0000-4000-8000-000000000002",
    source_id: "way/456",
    phone: "+552122223333",
  };
  assert.equal(deduplicateLeads([lead, duplicate]).length, 1);
});
