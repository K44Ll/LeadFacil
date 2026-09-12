import { z } from "zod";
import { approachLengthIds, personalityIds, toneIds } from "./outreach-options";
import { AI_MODEL_PATTERN, AI_PROVIDER_IDS } from "./providers";

export const personalAiConfigSchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS),
    model: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(
        AI_MODEL_PATTERN,
        "O identificador do modelo contém caracteres inválidos.",
      ),
    api_key: z.string().trim().max(1_024),
  })
  .strict()
  .superRefine((config, context) => {
    if (config.provider !== "ollama" && config.api_key.length < 8) {
      context.addIssue({
        code: "custom",
        path: ["api_key"],
        message: "Informe uma chave de API válida.",
      });
    }
  });

export const outreachRequestSchema = z
  .object({
    lead_id: z.uuid(),
    offered_service: z.string().trim().min(2).max(240),
    user_context: z.string().trim().max(1_500).default(""),
    personality: z.enum(personalityIds),
    tone: z.enum(toneIds),
    length: z.enum(approachLengthIds),
    previous_message: z.string().trim().max(1_600).optional(),
    ai: personalAiConfigSchema.optional(),
  })
  .strict();

export const openRouterResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().max(4_000) }),
      }),
    )
    .min(1),
});

export const openAiResponseSchema = z.object({
  model: z.string().optional(),
  output_text: z.string().optional(),
  output: z
    .array(
      z.object({
        content: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export const geminiResponseSchema = z.object({
  modelVersion: z.string().optional(),
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .min(1),
});

export type OutreachRequest = z.infer<typeof outreachRequestSchema>;
export type PersonalAiConfig = z.infer<typeof personalAiConfigSchema>;
