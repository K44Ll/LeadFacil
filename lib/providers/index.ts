import type { Lead, SearchInput } from "@/types/crm";
export interface LeadProvider {
  readonly name: string;
  readonly mode: "live";
  readonly persistence: "allowed" | "ephemeral";
  searchBusinesses(
    input: SearchInput,
    userId: string,
    signal?: AbortSignal,
  ): Promise<Lead[]>;
}
