"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePreference } from "@/hooks/use-preference";
import type { OutreachLeadContext } from "@/lib/ai/lead-context";
import {
  APPROACH_LENGTHS,
  DEFAULT_OUTREACH_PREFERENCES,
  isApproachLengthId,
  isPersonalityId,
  isToneId,
  type ApproachLengthId,
  type PersonalityId,
  type ToneId,
} from "@/lib/ai/outreach-options";
import {
  getAiProvider,
  getAiApiKeyPreferenceKey,
  getAiModelPreferenceKey,
  AI_PREFERENCE_KEYS,
  isAiProviderId,
  isValidAiModel,
  type AiProviderId,
} from "@/lib/ai/providers";
import { GeneratedApproach } from "./generated-approach";
import { LeadSummary } from "./lead-summary";
import { PersonalitySelector, ToneSelector } from "./option-selectors";

type GeneratorState =
  "initial" | "configuring" | "generating" | "success" | "error";

type ApiResponse = {
  text?: string;
  model?: string;
  provider?: AiProviderId;
  error?: string;
};

function isApiResponse(value: unknown): value is ApiResponse {
  return typeof value === "object" && value !== null;
}

export function LeadApproachGenerator({
  leadId,
  lead,
}: {
  leadId: string;
  lead: OutreachLeadContext;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<GeneratorState>("initial");
  const [contextOpen, setContextOpen] = useState(false);
  const [userContext, setUserContext] = useState("");
  const [result, setResult] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [offeredService, setOfferedService] = usePreference(
    "outreach-service",
    "",
  );
  const [personalityValue, setPersonalityValue] = usePreference(
    "outreach-personality",
    DEFAULT_OUTREACH_PREFERENCES.personality,
  );
  const [toneValue, setToneValue] = usePreference(
    "outreach-tone",
    DEFAULT_OUTREACH_PREFERENCES.tone,
  );
  const [lengthValue, setLengthValue] = usePreference(
    "outreach-length",
    DEFAULT_OUTREACH_PREFERENCES.length,
  );
  const [aiProviderValue] = usePreference(
    AI_PREFERENCE_KEYS.provider,
    "openrouter",
  );
  const requestSequence = useRef(0);
  const requestInFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const personality: PersonalityId = isPersonalityId(personalityValue)
    ? personalityValue
    : DEFAULT_OUTREACH_PREFERENCES.personality;
  const tone: ToneId = isToneId(toneValue)
    ? toneValue
    : DEFAULT_OUTREACH_PREFERENCES.tone;
  const length: ApproachLengthId = isApproachLengthId(lengthValue)
    ? lengthValue
    : DEFAULT_OUTREACH_PREFERENCES.length;
  const aiProvider: AiProviderId = isAiProviderId(aiProviderValue)
    ? aiProviderValue
    : "openrouter";
  const [legacyAiModel] = usePreference(AI_PREFERENCE_KEYS.legacyModel, "");
  const [aiModel] = usePreference(
    getAiModelPreferenceKey(aiProvider),
    (aiProvider === "openrouter" ? legacyAiModel : "") ||
      getAiProvider(aiProvider).defaultModel,
  );
  const [legacyAiApiKey] = usePreference(AI_PREFERENCE_KEYS.legacyApiKey, "");
  const [aiApiKey] = usePreference(
    getAiApiKeyPreferenceKey(aiProvider),
    aiProvider === "openrouter" ? legacyAiApiKey : "",
  );
  const aiProviderDetails = getAiProvider(aiProvider);
  const personalAi =
    isValidAiModel(aiModel) &&
    (!aiProviderDetails.requiresApiKey || aiApiKey.trim().length >= 8)
      ? {
          provider: aiProvider,
          model: aiModel.trim(),
          api_key: aiProviderDetails.requiresApiKey ? aiApiKey.trim() : "",
        }
      : undefined;
  const configured = Boolean(personalAi);
  const canGenerate = configured && offeredService.trim().length >= 2;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setState(result ? "success" : "configuring");
      return;
    }
    requestSequence.current += 1;
    requestInFlight.current = false;
    controller.current?.abort();
    controller.current = null;
    setState("initial");
    setError("");
  }

  async function generate(variation = false) {
    if (requestInFlight.current || !canGenerate) return;
    requestInFlight.current = true;
    const sequence = ++requestSequence.current;
    const abortController = new AbortController();
    controller.current = abortController;
    setError("");
    setState("generating");

    try {
      const response = await fetch("/api/ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          offered_service: offeredService,
          user_context: userContext,
          personality,
          tone,
          length,
          previous_message: variation && result ? result : undefined,
          ai: personalAi,
        }),
        signal: abortController.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      const body = isApiResponse(payload) ? payload : {};
      if (!response.ok || typeof body.text !== "string" || !body.text.trim()) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Não foi possível gerar a abordagem agora. Tente novamente.",
        );
      }
      if (sequence !== requestSequence.current) return;
      setResult(body.text);
      setModel(
        typeof body.model === "string" ? body.model : "o modelo configurado",
      );
      setState("success");
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível gerar a abordagem agora. Tente novamente.",
      );
      setState("error");
    } finally {
      if (sequence === requestSequence.current) {
        requestInFlight.current = false;
        controller.current = null;
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="primary-cta h-9 px-4 text-xs">
          <Sparkles />
          Gerar abordagem com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            Chegador na Empresa
          </DialogTitle>
          <DialogDescription className="text-xs">
            Uma mensagem curta e personalizada para abrir conversa com{" "}
            {lead.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[240px_1fr]">
          <div className="border-b p-4 lg:border-b-0 lg:border-r">
            <LeadSummary lead={lead} />
          </div>
          <div className="min-w-0 p-4 sm:p-5">
            {state === "generating" ? (
              <div
                className="flex min-h-80 flex-col items-center justify-center text-center"
                role="status"
                aria-live="polite"
              >
                <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Loader2 className="size-5 animate-spin" />
                </span>
                <h3 className="text-sm font-medium">
                  Criando uma abordagem para {lead.name}...
                </h3>
                <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                  Combinando os dados disponíveis com seu serviço, personalidade
                  e tom.
                </p>
              </div>
            ) : state === "success" ? (
              <GeneratedApproach
                value={result}
                model={model}
                onChange={setResult}
                onRegenerate={() => void generate(true)}
                onConfigure={() => setState("configuring")}
              />
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void generate(false);
                }}
                className="space-y-5"
              >
                {!configured && (
                  <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/8 p-3 text-[11px] leading-5">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <p>
                      A IA ainda não foi configurada. Conecte sua própria API em{" "}
                      <a
                        href="/configuracoes#ia"
                        className="font-medium underline underline-offset-2"
                      >
                        Configurações
                      </a>{" "}
                      para gerar mensagens.
                    </p>
                  </div>
                )}

                <label className="block">
                  <span className="field-label">Serviço que você oferece</span>
                  <Input
                    value={offeredService}
                    onChange={(event) =>
                      setOfferedService(event.target.value.slice(0, 240))
                    }
                    placeholder="Ex.: criação de sites para academias"
                    minLength={2}
                    maxLength={240}
                    required
                    autoFocus
                  />
                  <span className="mt-1.5 block text-[10px] text-muted-foreground">
                    Fica salvo neste navegador para suas próximas abordagens.
                  </span>
                </label>

                <PersonalitySelector
                  value={personality}
                  onChange={setPersonalityValue}
                />
                <ToneSelector value={tone} onChange={setToneValue} />

                <fieldset>
                  <legend className="field-label">Tamanho</legend>
                  <div
                    role="radiogroup"
                    aria-label="Tamanho da abordagem"
                    className="grid grid-cols-3 gap-2"
                  >
                    {APPROACH_LENGTHS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={length === option.id}
                        onClick={() => setLengthValue(option.id)}
                        className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                          length === option.id
                            ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="block text-[11px] font-medium">
                          {option.name}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="rounded-xl border">
                  <button
                    type="button"
                    aria-expanded={contextOpen}
                    onClick={() => setContextOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  >
                    <span>
                      <span className="block text-xs font-medium">
                        Adicionar contexto
                      </span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        Opcional: conte o que você observou ou quer oferecer.
                      </span>
                    </span>
                    {contextOpen ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                  {contextOpen && (
                    <div className="border-t p-3">
                      <label htmlFor="outreach-context" className="sr-only">
                        Contexto adicional para a abordagem
                      </label>
                      <Textarea
                        id="outreach-context"
                        value={userContext}
                        onChange={(event) =>
                          setUserContext(event.target.value.slice(0, 1_500))
                        }
                        placeholder="Ex.: O Instagram é movimentado, mas o site está desatualizado. Quero oferecer um site novo por R$ 900."
                        className="min-h-28 text-xs leading-5"
                        maxLength={1_500}
                      />
                      <span className="mt-1.5 block text-right text-[9px] text-muted-foreground">
                        {userContext.length.toLocaleString("pt-BR")} / 1.500
                      </span>
                    </div>
                  )}
                </div>

                {state === "error" && (
                  <div
                    className="flex gap-2 rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-[11px] text-destructive"
                    role="alert"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[9px] leading-4 text-muted-foreground">
                    {personalAi
                      ? aiProviderDetails.requiresApiKey
                        ? `${aiProviderDetails.name} · ${personalAi.model}. A chave pessoal é usada somente nesta solicitação.`
                        : `${aiProviderDetails.name} · ${personalAi.model}. O modelo roda neste computador.`
                      : "A IA recebe somente os dados exibidos e suas preferências."}
                  </p>
                  <Button
                    type="submit"
                    className="primary-cta"
                    disabled={!canGenerate}
                  >
                    <Sparkles />
                    Gerar agora
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
