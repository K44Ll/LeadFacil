import "server-only";

import { openRouterResponseSchema, type OutreachChannel } from "./schemas";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type LeadContext = {
  company_name: string;
  category: string;
  description: string;
  city: string;
  state: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  google_rating: number | null;
  review_count: number;
  score: number;
  notes: string;
};

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export function getOpenRouterStatus() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  return { configured: Boolean(apiKey && model), model: model || null };
}

function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) {
    throw new OpenRouterError(
      "Configure OPENROUTER_API_KEY e OPENROUTER_MODEL no arquivo .env.",
      503,
    );
  }
  return { apiKey, model };
}

function buildPrompt(lead: LeadContext, channel: OutreachChannel) {
  const channelRules = {
    whatsapp:
      "Escreva uma mensagem de WhatsApp curta, natural e fácil de responder.",
    email:
      "Escreva um email com uma linha de assunto e um corpo objetivo, separados por uma linha em branco.",
    ligacao:
      "Escreva um roteiro curto de ligação, com abertura, pergunta de diagnóstico e próximo passo.",
  } satisfies Record<OutreachChannel, string>;

  return `${channelRules[channel]}

Use exclusivamente os dados fornecidos abaixo. Não invente problemas, auditorias, resultados, pessoas, números ou informações sobre a empresa. Não diga que visitou ou analisou o website. Se um dado estiver ausente, simplesmente não o mencione. O objetivo é iniciar uma conversa consultiva sobre criação de sites, redesign, landing pages, SEO, performance ou desenvolvimento web. Escreva em português do Brasil, sem jargões, sem tom agressivo e com no máximo 170 palavras.

Dados do lead:
${JSON.stringify(lead, null, 2)}`;
}

export async function generateOutreach(
  lead: LeadContext,
  channel: OutreachChannel,
) {
  const { apiKey, model } = getConfig();
  let response: Response;

  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
        "X-OpenRouter-Title": "LeadFácil",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Você ajuda profissionais de serviços digitais a criar abordagens comerciais factuais, respeitosas e personalizadas.",
          },
          { role: "user", content: buildPrompt(lead, channel) },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new OpenRouterError("A IA demorou demais para responder.", 504);
    }
    throw new OpenRouterError("Não foi possível acessar o OpenRouter.", 502);
  }

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "A chave do OpenRouter foi recusada.",
      402: "A conta do OpenRouter está sem créditos disponíveis.",
      429: "O limite de requisições do OpenRouter foi atingido.",
    };
    throw new OpenRouterError(
      messages[response.status] ||
        "O OpenRouter não conseguiu gerar a abordagem.",
      response.status >= 400 && response.status < 600 ? response.status : 502,
    );
  }

  const parsed = openRouterResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new OpenRouterError(
      "O OpenRouter retornou uma resposta inválida.",
      502,
    );
  }

  return {
    text: parsed.data.choices[0].message.content.trim(),
    model: parsed.data.model || model,
  };
}
