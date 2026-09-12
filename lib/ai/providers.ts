export const AI_PROVIDER_IDS = [
  "openrouter",
  "openai",
  "google",
  "groq",
  "mistral",
  "deepseek",
  "xai",
  "ollama",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];
export const AI_MODEL_PATTERN = /^[a-zA-Z0-9._~:/-]+$/;
export const AI_PREFERENCE_KEYS = {
  provider: "ai-provider-v1",
  legacyModel: "ai-model-v1",
  legacyApiKey: "ai-api-key-v1",
} as const;

export function getAiModelPreferenceKey(provider: AiProviderId) {
  return `ai-model-${provider}-v1`;
}

export function getAiApiKeyPreferenceKey(provider: AiProviderId) {
  return `ai-api-key-${provider}-v1`;
}

export type AiProvider = {
  id: AiProviderId;
  name: string;
  description: string;
  keyLabel: string;
  keyPlaceholder: string;
  defaultModel: string;
  modelSuggestions: readonly string[];
  requiresApiKey: boolean;
  localOnly?: boolean;
};

export const AI_PROVIDERS: readonly AiProvider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Acesse modelos de vários laboratórios com uma única chave.",
    keyLabel: "Chave da API do OpenRouter",
    keyPlaceholder: "sk-or-v1-...",
    defaultModel: "openai/gpt-4o-mini",
    modelSuggestions: [
      "openai/gpt-4o-mini",
      "openai/gpt-5-mini",
      "anthropic/claude-sonnet-4.6",
      "google/gemini-3.5-flash",
    ],
    requiresApiKey: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Use diretamente os modelos disponíveis na sua conta OpenAI.",
    keyLabel: "Chave da API da OpenAI",
    keyPlaceholder: "sk-...",
    defaultModel: "gpt-5",
    modelSuggestions: ["gpt-5", "gpt-5-mini", "gpt-4.1-mini"],
    requiresApiKey: true,
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "Use uma chave criada no Google AI Studio.",
    keyLabel: "Chave da API do Google AI Studio",
    keyPlaceholder: "AIza...",
    defaultModel: "gemini-3.8-flash",
    modelSuggestions: [
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-2.5-pro",
    ],
    requiresApiKey: true,
  },
  {
    id: "groq",
    name: "Groq",
    description: "Inferência rápida para Llama, GPT-OSS e Qwen.",
    keyLabel: "Chave da API da Groq",
    keyPlaceholder: "gsk_...",
    defaultModel: "llama-3.3-70b-versatile",
    modelSuggestions: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
    ],
    requiresApiKey: true,
  },
  {
    id: "mistral",
    name: "Mistral AI",
    description: "Modelos europeus rápidos e econômicos.",
    keyLabel: "Chave da API da Mistral",
    keyPlaceholder: "Cole sua chave da Mistral",
    defaultModel: "mistral-small-latest",
    modelSuggestions: [
      "mistral-small-latest",
      "mistral-large-latest",
      "mistral-medium-latest",
    ],
    requiresApiKey: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "Modelos próprios com API compatível com OpenAI.",
    keyLabel: "Chave da API da DeepSeek",
    keyPlaceholder: "sk-...",
    defaultModel: "deepseek-v4-flash",
    modelSuggestions: ["deepseek-v4-flash", "deepseek-v4-pro"],
    requiresApiKey: true,
  },
  {
    id: "xai",
    name: "xAI",
    description: "Use os modelos Grok diretamente pela xAI.",
    keyLabel: "Chave da API da xAI",
    keyPlaceholder: "xai-...",
    defaultModel: "grok-4.6",
    modelSuggestions: [
      "grok-4.6",
      "grok-4.20-non-reasoning-latest",
      "grok-4.5-latest",
    ],
    requiresApiKey: true,
  },
  {
    id: "ollama",
    name: "Ollama local",
    description: "Use gratuitamente os modelos instalados no seu computador.",
    keyLabel: "Ollama não usa chave",
    keyPlaceholder: "",
    defaultModel: "gpt-oss:20b",
    modelSuggestions: ["gpt-oss:20b", "llama3.2", "qwen3", "gemma3"],
    requiresApiKey: false,
    localOnly: true,
  },
] as const;

export function isAiProviderId(value: string): value is AiProviderId {
  return AI_PROVIDER_IDS.some((provider) => provider === value);
}

export function isValidAiModel(value: string) {
  const model = value.trim();
  return (
    model.length > 0 && model.length <= 160 && AI_MODEL_PATTERN.test(model)
  );
}

export function getAiProvider(id: AiProviderId) {
  return AI_PROVIDERS.find((provider) => provider.id === id)!;
}
