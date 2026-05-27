import { z } from "zod";

// ---------------------------------------------------------------------------
// Common field properties shared across all field types
// ---------------------------------------------------------------------------

export const fieldCommonSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(200),
  description: z.string().nullable().optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  page: z.number().int().min(0).default(0),
  showIf: z
    .object({
      fieldId: z.string().uuid(),
      op: z.enum(["eq", "neq", "contains", "gt", "lt"]),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })
    .nullable()
    .optional(),
});

// ---------------------------------------------------------------------------
// Per-type config schemas
// ---------------------------------------------------------------------------

export const shortTextConfigSchema = z.object({
  maxLength: z.number().int().min(1).max(10000).optional(),
});

export const longTextConfigSchema = z.object({
  maxLength: z.number().int().min(1).max(10000).optional(),
});

export const emailConfigSchema = z.object({});

export const numberConfigSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .refine((c) => c.min == null || c.max == null || c.min <= c.max, {
    message: "min_gt_max",
  });

export const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
});

export type Option = z.infer<typeof optionSchema>;

export const singleSelectConfigSchema = z.object({
  options: z.array(optionSchema).min(1),
});

export const multiSelectConfigSchema = z.object({
  options: z.array(optionSchema).min(1),
});

export const dropdownConfigSchema = z.object({
  options: z.array(optionSchema).min(1),
});

export const checkboxConfigSchema = z.object({});

export const ratingConfigSchema = z.object({
  scaleMax: z.number().int().min(2).max(10),
});

export const dateConfigSchema = z.object({});

// ---------------------------------------------------------------------------
// Discriminated union covering all 10 field types
// ---------------------------------------------------------------------------

export const fieldSchema = z.discriminatedUnion("type", [
  fieldCommonSchema.extend({ type: z.literal("short_text"), config: shortTextConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("long_text"), config: longTextConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("email"), config: emailConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("number"), config: numberConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("single_select"), config: singleSelectConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("multi_select"), config: multiSelectConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("checkbox"), config: checkboxConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("dropdown"), config: dropdownConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("rating"), config: ratingConfigSchema }),
  fieldCommonSchema.extend({ type: z.literal("date"), config: dateConfigSchema }),
]);

export type Field = z.infer<typeof fieldSchema>;
export type FieldType = Field["type"];

export const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "single_select",
  "multi_select",
  "checkbox",
  "dropdown",
  "rating",
  "date",
] as const satisfies readonly FieldType[];
