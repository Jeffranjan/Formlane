import { z } from "zod";

// ---------------------------------------------------------------------------
// Common field properties shared across all field types
// ---------------------------------------------------------------------------

export const fieldCommonSchema = z.object({
  /** Stable UUID assigned at creation; omit on new fields (server assigns). */
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(200),
  description: z.string().nullable().optional(),
  required: z.boolean().default(false),
  /** 0-based display order within the form; must be contiguous and unique. */
  order: z.number().int().min(0),
  /** Multi-page support (Req. 21.12): 0-based page index. */
  page: z.number().int().min(0).default(0),
  /** Conditional logic (Req. 21.2): show this field only when the referenced
   *  field's answer matches the given value. */
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
// Per-type config schemas (Req. 4.1 – 4.8)
// ---------------------------------------------------------------------------

/** short_text / long_text: optional maxLength in [1, 10000] (Req. 4.3, 4.4) */
export const shortTextConfigSchema = z.object({
  maxLength: z.number().int().min(1).max(10000).optional(),
});

export const longTextConfigSchema = z.object({
  maxLength: z.number().int().min(1).max(10000).optional(),
});

/** email: no extra config */
export const emailConfigSchema = z.object({});

/** number: optional min/max with min <= max when both present (Req. 4.5) */
export const numberConfigSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .refine((c) => c.min == null || c.max == null || c.min <= c.max, {
    message: "min_gt_max",
  });

/** Shared option shape for select / dropdown fields (Req. 4.6) */
export const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
});

export type Option = z.infer<typeof optionSchema>;

/** single_select / multi_select / dropdown: at least one option (Req. 4.6) */
export const singleSelectConfigSchema = z.object({
  options: z.array(optionSchema).min(1),
});

export const multiSelectConfigSchema = z.object({
  options: z.array(optionSchema).min(1),
});

export const dropdownConfigSchema = z.object({
  options: z.array(optionSchema).min(1),
});

/** checkbox: no extra config */
export const checkboxConfigSchema = z.object({});

/** rating: scaleMax in [2, 10] (Req. 4.7) */
export const ratingConfigSchema = z.object({
  scaleMax: z.number().int().min(2).max(10),
});

/** date: no extra config */
export const dateConfigSchema = z.object({});

// ---------------------------------------------------------------------------
// Discriminated union covering all 10 field types (Req. 4.1, 4.2)
// ---------------------------------------------------------------------------

export const fieldSchema = z.discriminatedUnion("type", [
  fieldCommonSchema.extend({
    type: z.literal("short_text"),
    config: shortTextConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("long_text"),
    config: longTextConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("email"),
    config: emailConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("number"),
    config: numberConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("single_select"),
    config: singleSelectConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("multi_select"),
    config: multiSelectConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("checkbox"),
    config: checkboxConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("dropdown"),
    config: dropdownConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("rating"),
    config: ratingConfigSchema,
  }),
  fieldCommonSchema.extend({
    type: z.literal("date"),
    config: dateConfigSchema,
  }),
]);

export type Field = z.infer<typeof fieldSchema>;
export type FieldType = Field["type"];

/** All supported field type literals — useful for runtime checks. */
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
