import { openRouterResponseSchema } from "./schemas";

export class InvalidAiResponseError extends Error {
  constructor(message = "O OpenRouter retornou uma resposta inválida.") {
    super(message);
    this.name = "InvalidAiResponseError";
  }
}

export function normalizeGeneratedMessage(value: string) {
  let normalized = value
    .trim()
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
    .replace(/^(?:mensagem|abordagem|resposta)\s*:\s*/i, "")
    .trim();

  const quotePairs: ReadonlyArray<readonly [string, string]> = [
    ['"', '"'],
    ["“", "”"],
    ["‘", "’"],
  ];
  for (const [start, end] of quotePairs) {
    if (normalized.startsWith(start) && normalized.endsWith(end)) {
      normalized = normalized.slice(start.length, -end.length).trim();
      break;
    }
  }

  normalized = normalized
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized || normalized.length > 1_600) {
    throw new InvalidAiResponseError(
      normalized
        ? "A resposta gerada ficou fora do tamanho esperado."
        : "O OpenRouter retornou uma resposta vazia.",
    );
  }
  return normalized;
}

export function extractOpenRouterMessage(payload: unknown) {
  const parsed = openRouterResponseSchema.safeParse(payload);
  if (!parsed.success) throw new InvalidAiResponseError();
  return {
    text: normalizeGeneratedMessage(parsed.data.choices[0].message.content),
    model: parsed.data.model,
  };
}
