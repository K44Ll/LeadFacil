import { outreachRequestSchema } from "@/lib/ai/schemas";
import { generateOutreach, OpenRouterError } from "@/lib/ai/openrouter";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json({ error: "Não autorizado." }, { status: 401 });

  const parsed = outreachRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { data: lead, error } = await client
    .from("leads")
    .select(
      "company_name,category,description,city,state,phone,whatsapp,email,website,instagram,google_rating,review_count,score,notes",
    )
    .eq("id", parsed.data.lead_id)
    .maybeSingle();

  if (error || !lead) {
    return Response.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  try {
    const result = await generateOutreach(lead, parsed.data.channel);
    return Response.json(result);
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("OpenRouter generation failed");
    return Response.json(
      { error: "Não foi possível gerar a abordagem." },
      { status: 500 },
    );
  }
}
