export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

function errorText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const value = payload as {
    error?: { message?: unknown; code?: unknown; type?: unknown } | unknown;
    message?: unknown;
  };
  if (value.error && typeof value.error === "object") {
    const error = value.error as {
      message?: unknown;
      code?: unknown;
      type?: unknown;
    };
    return [error.message, error.code, error.type]
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();
  }
  return typeof value.message === "string" ? value.message.toLowerCase() : "";
}

export function getAiProviderErrorForStatus(status: number, payload?: unknown) {
  const detail = errorText(payload);
  if (status === 401 || status === 403)
    return new AiProviderError(
      "A chave da API foi recusada pelo provedor. Revise suas configurações de IA.",
      503,
      "authentication",
    );
  if (status === 402)
    return new AiProviderError(
      "A conta da IA está sem créditos disponíveis.",
      503,
      "insufficient_credits",
    );
  if (status === 404)
    return new AiProviderError(
      "O modelo de IA configurado não está disponível.",
      503,
      "model_unavailable",
    );
  if (status === 429)
    return new AiProviderError(
      "Muitas abordagens foram solicitadas. Aguarde um instante e tente novamente.",
      429,
      "provider_rate_limit",
    );
  if (status === 400 || status === 422) {
    if (/model|endpoint|route|not found|does not exist/.test(detail))
      return new AiProviderError(
        "O modelo configurado foi recusado ou não está disponível nessa conta.",
        503,
        "model_unavailable",
      );
    if (/credit|balance|quota|billing/.test(detail))
      return new AiProviderError(
        "A conta da IA está sem créditos ou cota disponível.",
        503,
        "insufficient_credits",
      );
    if (/parameter|unsupported|not supported|invalid.*request/.test(detail))
      return new AiProviderError(
        "O modelo recusou os parâmetros da solicitação. Tente outro modelo do mesmo provedor.",
        502,
        "unsupported_request",
      );
    if (/safety|policy|moderation|content.filter|blocked/.test(detail))
      return new AiProviderError(
        "O provedor bloqueou a solicitação pela política de conteúdo.",
        422,
        "content_blocked",
      );
    return new AiProviderError(
      "O provedor recusou a solicitação. Confira o modelo e tente novamente.",
      502,
      "request_rejected",
    );
  }
  return new AiProviderError(
    "Não foi possível gerar a abordagem agora. Tente novamente.",
    502,
    "provider_error",
  );
}

// Mantido para compatibilidade com integrações e testes existentes.
export { AiProviderError as OpenRouterError };
export const getOpenRouterErrorForStatus = getAiProviderErrorForStatus;
