import { z } from "zod";

export const outreachChannels = ["whatsapp", "email", "ligacao"] as const;

export const outreachRequestSchema = z.object({
  lead_id: z.uuid(),
  channel: z.enum(outreachChannels),
});

export const openRouterResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().min(1) }),
      }),
    )
    .min(1),
});

export type OutreachChannel = (typeof outreachChannels)[number];
