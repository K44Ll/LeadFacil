import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getApiContext,
  saveSearch,
  saveSearchRecord,
  reuseRecentEnrichment,
} from "@/lib/data/repository";
import { searchSchema } from "@/lib/validation";
import { getLeadProvider } from "@/lib/providers/factory";
import type { LeadProvider } from "@/lib/providers";
import { calculateOpportunityScore } from "@/lib/scoring";
import { enrichLeads } from "@/lib/leads/enrichment/enrichment";
import { deduplicateLeads } from "@/lib/leads/utils/deduplication";
import type { Lead } from "@/types/crm";
export const runtime = "nodejs";
export const maxDuration = 300;
const running = new Set<string>();
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  const raw = await request.text();
  if (raw.length > 10000)
    return Response.json({ error: "Pesquisa muito grande." }, { status: 413 });
  let input;
  try {
    input = searchSchema.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Pesquisa inválida." }, { status: 400 });
  }
  if (!input.success)
    return Response.json(
      { error: input.error.issues[0].message },
      { status: 400 },
    );
  const ctx = await getApiContext();
  if (!ctx)
    return Response.json(
      { error: "Sessão expirada. Entre novamente." },
      { status: 401 },
    );
  if (running.has(ctx.session))
    return Response.json(
      { error: "Uma busca já está em andamento neste workspace." },
      { status: 429 },
    );
  let provider: LeadProvider;
  try {
    provider = getLeadProvider();
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 503 });
  }
  running.add(ctx.session);
  const values = input.data;
  const encoder = new TextEncoder();
  const id = randomUUID();
  let disconnected = false;
  let activeStep = 0;
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: unknown) {
        if (!disconnected)
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }
      async function step(value: number) {
        if (request.signal.aborted || disconnected)
          throw new Error("Busca cancelada.");
        send({ type: "step", step: value });
        activeStep = value;
      }
      function preview(lead: Lead) {
        const {
          company_name,
          category,
          address,
          city,
          state,
          phone,
          whatsapp,
          email,
          website,
          instagram,
          facebook,
          linkedin,
          google_maps_url,
          google_rating,
          review_count,
          source_url,
          score,
          enrichment_confidence,
          discovery_distance_m,
        } = lead;
        return {
          company_name,
          category,
          address,
          city,
          state,
          phone,
          whatsapp,
          email,
          website,
          instagram,
          facebook,
          linkedin,
          google_maps_url,
          google_rating,
          review_count,
          source_url,
          score,
          enrichment_confidence,
          discovery_distance_m,
        };
      }
      try {
        console.info("[lead-search] started", {
          id,
          provider: provider.name,
          niche: values.niche,
          location: [values.city, values.state, values.country].join(", "),
          radiusKm: values.radius_km,
          quantity: values.quantity,
        });
        await step(0);
        let leads = deduplicateLeads(
          await provider.searchBusinesses(values, ctx.id, request.signal),
        );
        send({
          type: "progress",
          phase: "discovery",
          completed: leads.length,
          total: leads.length,
        });
        for (const lead of leads)
          send({ type: "lead", stage: "discovered", lead: preview(lead) });
        await step(1);
        leads = await reuseRecentEnrichment(
          leads.map((lead) => ({ ...lead, user_id: ctx.id })),
          ctx,
        );
        leads = await enrichLeads(leads, {
          signal: request.signal,
          concurrency: Math.min(
            6,
            Math.max(1, Number(process.env.LEAD_ENRICHMENT_CONCURRENCY) || 3),
          ),
          onLead(lead, completed) {
            const scored = calculateOpportunityScore(lead);
            lead.score = scored.score;
            lead.score_factors = scored.factors;
            send({ type: "lead", stage: "enriched", lead: preview(lead) });
            send({
              type: "progress",
              phase: "enrichment",
              completed,
              total: leads.length,
            });
          },
        });
        await step(4);
        leads = leads
          .map((lead) => {
            const result = calculateOpportunityScore(lead);
            return {
              ...lead,
              score: result.score,
              score_factors: result.factors,
            };
          })
          .filter(
            (lead) =>
              lead.score >= values.min_score &&
              (!values.no_website || !lead.website) &&
              (!values.has_phone || Boolean(lead.phone)) &&
              (!values.has_whatsapp || Boolean(lead.whatsapp)) &&
              (!values.has_instagram || Boolean(lead.instagram)) &&
              (values.min_rating === 0 ||
                (lead.google_rating !== null &&
                  lead.google_rating >= values.min_rating)) &&
              lead.review_count >= values.min_reviews,
          );
        await step(5);
        const searchRecord = {
          id,
          user_id: ctx.id,
          niche: values.niche,
          location: [values.city, values.state, values.country].join(", "),
          quantity: values.quantity,
          result_count: leads.length,
          status: "completed",
          provider: provider.name,
          created_at: new Date().toISOString(),
        } as const;
        const ephemeral = provider.persistence === "ephemeral";
        let count = 0;
        if (ephemeral) await saveSearchRecord(searchRecord, ctx);
        else count = await saveSearch(leads, searchRecord, ctx);
        revalidatePath("/", "layout");
        send({
          type: "complete",
          count,
          matched: leads.length,
          provider: provider.name,
          ephemeral,
          results: leads.map(preview),
        });
        console.info("[lead-search] completed", {
          id,
          provider: provider.name,
          matched: leads.length,
          inserted: count,
        });
      } catch (error) {
        console.error("[lead-search] failed", {
          id,
          provider: provider.name,
          step: activeStep,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        send({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível concluir a pesquisa.",
        });
      } finally {
        running.delete(ctx.session);
        if (!disconnected) controller.close();
      }
    },
    cancel() {
      disconnected = true;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
