import { websiteAnalysisSchema, unavailableAnalysis } from "@/lib/analyzers";
import { createOutreachLeadContext } from "@/lib/ai/lead-context";
import { AiProviderError, generateOutreach } from "@/lib/ai/gateway";
import { consumeOutreachRateLimit } from "@/lib/ai/rate-limit";
import { outreachRequestSchema } from "@/lib/ai/schemas";
import { getApiContext } from "@/lib/data/repository";

const responseHeaders = { "Cache-Control": "no-store" };

export const maxDuration = 200;

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context)
    return Response.json(
      { error: "Não autorizado." },
      { status: 401, headers: responseHeaders },
    );

  const parsed = outreachRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.path[0] === "offered_service"
            ? "Informe o serviço que você oferece."
            : parsed.error.issues[0]?.path[0] === "ai"
              ? "Revise o provedor, o modelo e a chave da sua API."
              : "Revise as opções da abordagem e tente novamente.",
      },
      { status: 400, headers: responseHeaders },
    );
  }

  const rateLimit = consumeOutreachRateLimit(context.id);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Muitas abordagens em pouco tempo. Aguarde e tente novamente." },
      {
        status: 429,
        headers: {
          ...responseHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const { data: lead, error } = await context.client
    .from("leads")
    .select(
      "company_name,category,description,address,neighborhood,city,state,country,phone,whatsapp,email,website,domain,instagram,facebook,linkedin,google_rating,review_count,opening_hours,notes,analysis",
    )
    .eq("id", parsed.data.lead_id)
    .eq("user_id", context.id)
    .maybeSingle();

  if (error || !lead) {
    return Response.json(
      { error: "Lead não encontrado." },
      { status: 404, headers: responseHeaders },
    );
  }

  try {
    const leadContext = createOutreachLeadContext({
      ...lead,
      analysis: websiteAnalysisSchema
        .catch(unavailableAnalysis)
        .parse(lead.analysis),
    });
    const result = await generateOutreach(leadContext, parsed.data);
    return Response.json(result, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof AiProviderError) {
      console.error("AI outreach failed", {
        code: error.code,
        status: error.status,
      });
      return Response.json(
        { error: error.message },
        { status: error.status, headers: responseHeaders },
      );
    }
    console.error("Unexpected outreach generation failure", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Não foi possível gerar a abordagem agora. Tente novamente." },
      { status: 500, headers: responseHeaders },
    );
  }
}
