import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateText } from "ai";
import type { OutreachLeadContext } from "./lead-context";
import { AiProviderError, getAiProviderErrorForStatus } from "./errors";
import { buildOutreachPrompt, OUTREACH_SYSTEM_PROMPT } from "./prompt";
import { InvalidAiResponseError, normalizeGeneratedMessage } from "./response";
import type { AiProviderId } from "./providers";
import type { OutreachRequest, PersonalAiConfig } from "./schemas";

type ProviderRuntime = {
  baseURL: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  localOnly?: boolean;
};

const PROVIDER_RUNTIMES: Record<AiProviderId, ProviderRuntime> = {
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    timeoutMs: 75_000,
  },
  openai: { baseURL: "https://api.openai.com/v1", timeoutMs: 90_000 },
  google: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    timeoutMs: 120_000,
    headers: { "x-goog-api-client": "leadfacil-oai/1.0" },
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    timeoutMs: 60_000,
  },
  mistral: { baseURL: "https://api.mistral.ai/v1", timeoutMs: 90_000 },
  deepseek: { baseURL: "https://api.deepseek.com", timeoutMs: 120_000 },
  xai: { baseURL: "https://api.x.ai/v1", timeoutMs: 120_000 },
  ollama: {
    baseURL: "http://127.0.0.1:11434/v1",
    timeoutMs: 180_000,
    localOnly: true,
  },
};

export { AiProviderError } from "./errors";

function resolveConfig(personal?: PersonalAiConfig) {
  if (personal) return personal;
  throw new AiProviderError(
    "Configure sua própria API em Configurações para usar a geração com IA.",
    503,
    "missing_api_key",
  );
}

function responsePayload(error: APICallError) {
  if (!error.responseBody) return undefined;
  try {
    return JSON.parse(error.responseBody) as unknown;
  } catch {
    return undefined;
  }
}

function hasErrorName(error: unknown, names: readonly string[]): boolean {
  if (!(error instanceof Error)) return false;
  if (names.includes(error.name)) return true;
  return hasErrorName(error.cause, names);
}

function mapGenerationError(error: unknown, provider: AiProviderId) {
  if (error instanceof AiProviderError) return error;
  if (hasErrorName(error, ["AbortError", "TimeoutError"]))
    return new AiProviderError(
      "A IA demorou além do limite desse provedor. Tente novamente ou escolha um modelo mais rápido.",
      504,
      "timeout",
    );
  if (APICallError.isInstance(error)) {
    if (error.statusCode)
      return getAiProviderErrorForStatus(
        error.statusCode,
        responsePayload(error),
      );
    return provider === "ollama"
      ? new AiProviderError(
          "Não foi possível conectar ao Ollama. Abra o Ollama neste computador e confirme que o modelo está instalado.",
          503,
          "local_provider_unavailable",
        )
      : new AiProviderError(
          "Não foi possível conectar à IA agora. Tente novamente.",
          502,
          "network_error",
        );
  }
  if (error instanceof InvalidAiResponseError)
    return new AiProviderError(error.message, 502, "invalid_response");
  return new AiProviderError(
    "Não foi possível gerar a abordagem agora. Tente novamente.",
    502,
    "provider_error",
  );
}

export async function generateOutreach(
  lead: OutreachLeadContext,
  request: OutreachRequest,
) {
  const config = resolveConfig(request.ai);
  const runtime = PROVIDER_RUNTIMES[config.provider];
  if (runtime.localOnly && process.env.VERCEL === "1") {
    throw new AiProviderError(
      "O Ollama local funciona apenas quando o LeadFácil roda no mesmo computador. No deploy da Vercel, escolha um provedor online.",
      503,
      "local_provider_unavailable",
    );
  }

  const startedAt = Date.now();
  console.info("AI outreach started", {
    provider: config.provider,
    model: config.model,
    timeoutMs: runtime.timeoutMs,
  });

  try {
    const provider = createOpenAICompatible({
      name: config.provider,
      baseURL: runtime.baseURL,
      apiKey: config.api_key || undefined,
      headers:
        config.provider === "openrouter"
          ? {
              "HTTP-Referer":
                process.env.NEXT_PUBLIC_APP_URL?.trim() ||
                "http://localhost:3000",
              "X-OpenRouter-Title": "LeadFácil",
            }
          : runtime.headers,
    });
    const result = await generateText({
      model: provider(config.model),
      system: OUTREACH_SYSTEM_PROMPT,
      prompt: buildOutreachPrompt({ ...request, lead }),
      maxRetries: 0,
      timeout: runtime.timeoutMs,
    });
    const text = normalizeGeneratedMessage(result.text);
    console.info("AI outreach completed", {
      provider: config.provider,
      model: config.model,
      durationMs: Date.now() - startedAt,
    });
    return { text, model: config.model, provider: config.provider };
  } catch (error) {
    const mapped = mapGenerationError(error, config.provider);
    console.error("AI provider request failed", {
      provider: config.provider,
      model: config.model,
      durationMs: Date.now() - startedAt,
      code: mapped.code,
      status: mapped.status,
    });
    throw mapped;
  }
}
