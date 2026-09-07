import { z } from "zod";
import { INTERACTION_TYPES, STATUSES } from "@/types/crm";
export const searchSchema = z.object({
  niche: z
    .string()
    .trim()
    .min(2, "Informe um nicho com pelo menos 2 caracteres.")
    .max(80),
  city: z.string().trim().min(2, "Informe a cidade.").max(100),
  state: z.string().trim().min(2, "Informe o estado.").max(80),
  country: z.string().trim().min(2).max(80).default("Brasil"),
  radius_km: z.coerce.number().int().min(1).max(50).default(10),
  quantity: z.coerce
    .number()
    .refine((n) => [10, 25, 50, 100].includes(n), "Quantidade inválida."),
  no_website: z.boolean().default(false),
  has_phone: z.boolean().default(false),
  has_whatsapp: z.boolean().default(false),
  has_instagram: z.boolean().default(false),
  min_rating: z.coerce.number().min(0).max(5).default(0),
  min_reviews: z.coerce.number().int().min(0).max(100000).default(0),
  min_score: z.coerce.number().int().min(0).max(100).default(0),
});
export const mutationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("status"),
    ids: z.array(z.uuid()).min(1).max(100),
    status: z.enum(STATUSES),
  }),
  z.object({
    type: z.literal("notes"),
    id: z.uuid(),
    notes: z.string().max(10000),
  }),
  z.object({
    type: z.literal("interaction"),
    lead_id: z.uuid(),
    kind: z.enum(INTERACTION_TYPES),
    observation: z.string().trim().min(2).max(5000),
    result: z.string().max(500),
    happened_at: z.iso.datetime(),
  }),
  z.object({
    type: z.literal("create_list"),
    name: z.string().trim().min(2).max(80),
    description: z.string().max(300),
  }),
  z.object({ type: z.literal("delete_list"), id: z.uuid() }),
  z.object({
    type: z.literal("list_membership"),
    ids: z.array(z.uuid()).min(1).max(100),
    list_id: z.uuid(),
    remove: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("create_tag"),
    name: z.string().trim().min(2).max(40),
  }),
  z.object({
    type: z.literal("tag_membership"),
    id: z.uuid(),
    tag_id: z.uuid(),
    remove: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("profile"),
    name: z.string().trim().min(2).max(80),
    avatar_url: z.union([
      z.literal(""),
      z.url().refine((s) => s.startsWith("https://"), "Use uma URL HTTPS."),
    ]),
  }),
]);
export type Mutation = z.infer<typeof mutationSchema>;
