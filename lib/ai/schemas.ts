import { z } from "zod";
import {
  approachLengthIds,
  personalityIds,
  toneIds,
} from "./outreach-options";

export const outreachRequestSchema = z
  .object({
    lead_id: z.uuid(),
    offered_service: z.string().trim().min(2).max(240),
    user_context: z.string().trim().max(1_500).default(""),
    personality: z.enum(personalityIds),
    tone: z.enum(toneIds),
    length: z.enum(approachLengthIds),
    previous_message: z.string().trim().max(1_600).optional(),
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

export type OutreachRequest = z.infer<typeof outreachRequestSchema>;
