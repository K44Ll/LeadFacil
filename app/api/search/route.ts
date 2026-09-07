import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getApiContext,
  saveSearch,
  saveSearchRecord,
} from "@/lib/data/repository";
import { searchSchema } from "@/lib/validation";
import { getLeadProvider } from "@/lib/providers/factory";
import type { LeadProvider } from "@/lib/providers";
import { UnconfiguredWebsiteAnalyzer } from "@/lib/analyzers";
import { calculateOpportunityScore } from "@/lib/scoring";
export const runtime = "nodejs";
export const maxDuration = 60;
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
      try {
        console.info("[lead-search] started", {
          id,
          provider: provider.name,
          niche: values.niche,
          location: values.location,
          quantity: values.quantity,
        });
        await step(0);
        let leads = await provider.searchBusinesses(
          values,
          ctx.id,
          request.signal,
        );
        await step(1);
        leads = leads.map((lead) => ({ ...lead, user_id: ctx.id }));
        await step(2);
        const analyzer = new UnconfiguredWebsiteAnalyzer();
        leads = await Promise.all(
          leads.map(async (lead) => ({
            ...lead,
            analysis: await analyzer.analyze(),
          })),
        );
        await step(3);
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
          .filter((l) => l.score >= values.min_score);
        await step(5);
        const searchRecord = {
          id,
          user_id: ctx.id,
          niche: values.niche,
          location: values.location,
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
          results: ephemeral
            ? leads.map(
                ({
                  company_name,
                  category,
                  address,
                  city,
                  state,
                  phone,
                  website,
                  instagram,
                  google_rating,
                  review_count,
                  source_url,
                  score,
                }) => ({
                  company_name,
                  category,
                  address,
                  city,
                  state,
                  phone,
                  website,
                  instagram,
                  google_rating,
                  review_count,
                  source_url,
                  score,
                }),
              )
            : undefined,
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
