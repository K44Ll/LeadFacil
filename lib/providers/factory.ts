import "server-only";
import type { LeadProvider } from "./index";
import { z } from "zod";
import { OpenStreetMapProvider } from "./openstreetmap";
export function isLeadProviderConfigured() {
  return z.email().safeParse(process.env.OSM_CONTACT_EMAIL?.trim()).success;
}
export function getLeadProvider(): LeadProvider {
  const email = process.env.OSM_CONTACT_EMAIL?.trim();
  if (!z.email().safeParse(email).success)
    throw new Error(
      "Configure um OSM_CONTACT_EMAIL válido no arquivo .env para iniciar suas buscas.",
    );
  return new OpenStreetMapProvider(email as string);
}
