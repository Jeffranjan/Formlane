import { z } from "zod";
import { fieldSchema } from "../fields/model";

// ---------------------------------------------------------------------------
// Form schemas
// ---------------------------------------------------------------------------

/**
 * Full form schema including all fields.
 * Used internally and for creator-facing responses.
 */
export const formSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/),
  title: z.string().trim().min(1).max(200),
  description: z.string().nullable(),
  status: z.enum(["draft", "published", "unpublished"]),
  visibility: z.enum(["public", "unlisted"]),
  fields: z.array(fieldSchema),
  confirmationMessage: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  maxResponses: z.number().int().nullable(),
});

/**
 * Public form schema — strips creator PII (`creatorId`, `passwordHash`) and
 * the `status` field (implicit: must be "published" for the public read to
 * succeed). Returned by `forms.getPublicBySlug` (Req. 6.2).
 */
export const publicFormSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(["public", "unlisted"]),
  fields: z.array(z.any()),
  confirmationMessage: z.string().nullable(),
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxResponses: z.number().int().nullable().optional(),
});

export type PublicForm = z.infer<typeof publicFormSchema>;
