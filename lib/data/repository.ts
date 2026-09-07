import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Mutation } from "@/lib/validation";
import type { WorkspaceData, Lead, SearchRecord } from "@/types/crm";
import type { Database, Json } from "@/types/database";
import { websiteAnalysisSchema, unavailableAnalysis } from "@/lib/analyzers";
import { STATUSES } from "@/types/crm";
import { z } from "zod";

export const getContext = cache(async () => {
  const context = await getApiContext();
  if (!context) redirect("/login");
  return context;
});

export async function getApiContext() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, session: user.id, client, user };
}

type AuthenticatedContext = NonNullable<Awaited<ReturnType<typeof getApiContext>>>;

export const getWorkspace = cache(async (): Promise<WorkspaceData> => {
  const ctx = await getContext();
  // Read in pages: PostgREST may enforce a 1,000-row server maximum.
  async function loadTable<T extends keyof Database["public"]["Tables"]>(
    table: T,
  ) {
    const rows: Database["public"]["Tables"][T]["Row"][] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await ctx.client
        .from(table)
        .select("*")
        .filter("user_id", "eq", ctx.id)
        .order(
          table === "lead_tags" || table === "lead_lists" ? "lead_id" : "id",
        )
        .range(offset, offset + 499);
      if (error) {
        console.error("Workspace query failed:", error.code);
        throw new Error(
          "Não foi possível carregar seus dados. Tente novamente.",
        );
      }
      rows.push(
        ...(data as unknown as Database["public"]["Tables"][T]["Row"][]),
      );
      if (data.length < 500) break;
    }
    return rows;
  }
  const [
    leadRows,
    lists,
    tags,
    interactions,
    searches,
    leadTags,
    leadLists,
    scoreFactors,
  ] = await Promise.all([
    loadTable("leads"),
    loadTable("lists"),
    loadTable("tags"),
    loadTable("interactions"),
    loadTable("searches"),
    loadTable("lead_tags"),
    loadTable("lead_lists"),
    loadTable("lead_score_factors"),
  ]);
  const { data: profile, error } = await ctx.client
    .from("profiles")
    .select("*")
    .eq("id", ctx.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o perfil.");
  return {
    leads: leadRows.map((lead): Lead => ({
      ...lead,
      status: z.enum(STATUSES).parse(lead.status),
      analysis: websiteAnalysisSchema
        .catch(unavailableAnalysis)
        .parse(lead.analysis),
      tag_ids: leadTags
        .filter((t) => t.lead_id === lead.id)
        .map((t) => t.tag_id),
      list_ids: leadLists
        .filter((l) => l.lead_id === lead.id)
        .map((l) => l.list_id),
      score_factors: scoreFactors
        .filter((f) => f.lead_id === lead.id)
        .map((f) => ({
          key: f.factor_key,
          label: f.label,
          description: f.description,
          points: f.points,
        })),
    })),
    lists,
    tags,
    interactions,
    searches,
    profile: {
      id: ctx.id,
      name: profile?.name || ctx.user.user_metadata?.name || "Seu workspace",
      email: ctx.user.email || "",
      avatar_url: profile?.avatar_url || null,
    },
  } as WorkspaceData;
});

export async function mutateWorkspace(mutation: Mutation) {
  const ctx = await getContext();
  const { error } = await ctx.client.rpc("crm_mutate", { payload: mutation });
  if (error) {
    console.error("CRM mutation failed:", error.code);
    if (error.code === "23505")
      throw new Error("Já existe um item com esse nome.");
    throw new Error(
      "Não foi possível salvar. Verifique sua conexão e tente novamente.",
    );
  }
}
export async function saveSearch(
  leads: Lead[],
  search: SearchRecord,
  context?: AuthenticatedContext,
) {
  const ctx = context ?? (await getContext());
  const { data, error } = await ctx.client.rpc("crm_save_search", {
    businesses: leads as unknown as Json,
    search_record: search as unknown as Json,
  });
  if (error) {
    console.error("Search persistence failed:", error.code);
    throw new Error("Não foi possível salvar os resultados da pesquisa.");
  }
  return Number(data);
}
export async function saveSearchRecord(
  search: SearchRecord,
  context?: AuthenticatedContext,
) {
  const ctx = context ?? (await getContext());
  const { error } = await ctx.client.from("searches").insert({
    id: search.id,
    user_id: ctx.id,
    niche: search.niche,
    location: search.location,
    quantity: search.quantity,
    result_count: search.result_count,
    status: search.status,
    provider: search.provider,
    created_at: search.created_at,
  });
  if (error) {
    console.error("Search record persistence failed:", error.code);
    throw new Error("Não foi possível registrar a pesquisa.");
  }
}
