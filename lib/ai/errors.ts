export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export function getOpenRouterErrorForStatus(status: number) {
  if (status === 401 || status === 403)
    return new OpenRouterError(
      "A integração com a IA precisa ser reconectada.",
      503,
      "authentication",
    );
  if (status === 402)
    return new OpenRouterError(
      "A conta da IA está sem créditos disponíveis.",
      503,
      "insufficient_credits",
    );
  if (status === 404)
    return new OpenRouterError(
      "O modelo de IA configurado não está disponível.",
      503,
      "model_unavailable",
    );
  if (status === 429)
    return new OpenRouterError(
      "Muitas abordagens foram solicitadas. Aguarde um instante e tente novamente.",
      429,
      "provider_rate_limit",
    );
  return new OpenRouterError(
    "Não foi possível gerar a abordagem agora. Tente novamente.",
    502,
    "provider_error",
  );
}
