import "server-only";

import type { OutreachLeadContext } from "./lead-context";
import { getOpenRouterErrorForStatus, OpenRouterError } from "./errors";
import { buildOutreachPrompt, OUTREACH_SYSTEM_PROMPT } from "./prompt";
import { extractOpenRouterMessage, InvalidAiResponseError } from "./response";
import type { OutreachRequest } from "./schemas";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 240;

export { OpenRouterError } from "./errors";

export function getOpenRouterStatus() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  return {
    configured: Boolean(apiKey),
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
  };
}

function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenRouterError(
      "A geração com IA ainda não foi configurada.",
      503,
      "missing_api_key",
    );
  }
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL,
  };
}

export async function generateOutreach(
  lead: OutreachLeadContext,
  request: OutreachRequest,
) {
  const { apiKey, model } = getConfig();
  const userPrompt = buildOutreachPrompt({ ...request, lead });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const requestPromise = (async () => {
      const response = await fetch(OPENROUTER_ENDPOINT, {
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
            { role: "system", content: OUTREACH_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature:
            (request.previous_message ? 0.78 : 0.62) + attempt * 0.04,
          max_tokens: MAX_OUTPUT_TOKENS,
          reasoning: { effort: "none", exclude: true },
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      return { response, payload };
    })();

    let response: Response;
    let payload: unknown;
    try {
      ({ response, payload } = await Promise.race([
        requestPromise,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(
              new OpenRouterError(
                "A IA demorou para responder. Tente novamente.",
                504,
                "timeout",
              ),
            );
          }, OPENROUTER_TIMEOUT_MS);
        }),
      ]));
    } catch (error) {
      if (error instanceof OpenRouterError) throw error;
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      throw new OpenRouterError(
        timedOut
          ? "A IA demorou para responder. Tente novamente."
          : "Não foi possível conectar à IA agora. Tente novamente.",
        timedOut ? 504 : 502,
        timedOut ? "timeout" : "network_error",
      );
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!response.ok) throw getOpenRouterErrorForStatus(response.status);

    try {
      const result = extractOpenRouterMessage(payload);
      return { text: result.text, model: result.model || model };
    } catch (error) {
      if (!(error instanceof InvalidAiResponseError)) throw error;
      if (attempt === 0) {
        console.warn("OpenRouter returned an invalid response; retrying", {
          model,
        });
        continue;
      }
      throw new OpenRouterError(error.message, 502, "invalid_response");
    }
  }

  throw new OpenRouterError(
    "Não foi possível gerar a abordagem agora. Tente novamente.",
    502,
    "invalid_response",
  );
}
