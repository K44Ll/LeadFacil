import {
  geminiResponseSchema,
  openAiResponseSchema,
  openRouterResponseSchema,
} from "./schemas";

export class InvalidAiResponseError extends Error {
  constructor(message = "O provedor de IA retornou uma resposta inválida.") {
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
        : "O provedor de IA retornou uma resposta vazia.",
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

export function extractOpenAiMessage(payload: unknown) {
  const parsed = openAiResponseSchema.safeParse(payload);
  if (!parsed.success) throw new InvalidAiResponseError();
  const nestedText = parsed.data.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("\n");
  return {
    text: normalizeGeneratedMessage(
      parsed.data.output_text || nestedText || "",
    ),
    model: parsed.data.model,
  };
}

export function extractGeminiMessage(payload: unknown) {
  const parsed = geminiResponseSchema.safeParse(payload);
  if (!parsed.success) throw new InvalidAiResponseError();
  const text = parsed.data.candidates[0].content.parts
    .map((part) => part.text || "")
    .join("\n");
  return {
    text: normalizeGeneratedMessage(text),
    model: parsed.data.modelVersion,
  };
}
