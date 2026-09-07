import type { Lead } from "@/types/crm";
import { comparableDomain } from "./normalize-url";

function text(value: string | null | undefined) {
  return (value || "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function digits(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}
function distanceMeters(a: Lead, b: Lead) {
  if (
    a.latitude === null ||
    a.longitude === null ||
    b.latitude === null ||
    b.longitude === null
  )
    return Infinity;
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
export function leadIdentityMatch(a: Lead, b: Lead) {
  if (a.source === b.source && a.source_id === b.source_id) return true;
  const aPhone = digits(a.whatsapp || a.phone);
  const bPhone = digits(b.whatsapp || b.phone);
  if (aPhone.length >= 10 && aPhone === bPhone) return true;
  const aDomain = comparableDomain(a.website);
  const bDomain = comparableDomain(b.website);
  if (aDomain && bDomain && aDomain === bDomain) return true;
  const sameName = text(a.company_name) === text(b.company_name);
  return (
    sameName &&
    (distanceMeters(a, b) <= 80 ||
      (text(a.address) && text(a.address) === text(b.address)))
  );
}
export function deduplicateLeads(leads: Lead[]) {
  return leads.reduce<Lead[]>((unique, lead) => {
    const existing = unique.find((candidate) =>
      leadIdentityMatch(candidate, lead),
    );
    if (!existing) unique.push(lead);
    else {
      for (const key of [
        "phone",
        "whatsapp",
        "email",
        "website",
        "instagram",
        "facebook",
        "linkedin",
      ] as const)
        existing[key] ||= lead[key];
      existing.sources = [...new Set([...existing.sources, ...lead.sources])];
    }
    return unique;
  }, []);
}
