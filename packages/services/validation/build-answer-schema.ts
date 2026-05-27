import { z } from "zod";
import type { SelectField } from "@repo/database/schema";

// ---------------------------------------------------------------------------
// Config shapes (mirrors packages/trpc/server/routes/fields/model.ts)
// These are cast from the JSONB `config` column at runtime.
// ---------------------------------------------------------------------------

interface ShortTextConfig {
  maxLength?: number;
}

interface LongTextConfig {
  maxLength?: number;
}

interface NumberConfig {
  min?: number;
  max?: number;
}

interface OptionItem {
  id: string;
  label: string;
}

interface SelectConfig {
  options: OptionItem[];
}

interface RatingConfig {
  scaleMax?: number;
}

// ---------------------------------------------------------------------------
// Per-field schema builder
// ---------------------------------------------------------------------------

/**
 * Builds a Zod schema for a single field's answer value.
 *
 * - Required fields return the base schema.
 * - Optional fields (required === false) wrap the schema with `.optional()`.
 *
 * Requirements: 8.1–8.7, 19.5
 */
function buildFieldSchema(field: SelectField): z.ZodTypeAny {
  const config = (field.config ?? {}) as Record<string, unknown>;
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "short_text": {
      const c = config as ShortTextConfig;
      schema = z.string().max(c.maxLength ?? 500);
      break;
    }

    case "long_text": {
      const c = config as LongTextConfig;
      schema = z.string().max(c.maxLength ?? 5000);
      break;
    }

    case "email": {
      schema = z.string().email();
      break;
    }

    case "number": {
      const c = config as NumberConfig;
      let numSchema = z.coerce.number();
      if (c.min !== undefined && c.min !== null) {
        numSchema = numSchema.min(c.min);
      }
      if (c.max !== undefined && c.max !== null) {
        numSchema = numSchema.max(c.max);
      }
      schema = numSchema;
      break;
    }

    case "single_select": {
      const c = config as unknown as SelectConfig;
      const ids = (c.options ?? []).map((o) => o.id);
      if (ids.length === 0) {
        schema = z.string();
      } else {
        schema = z.enum(ids as [string, ...string[]]);
      }
      break;
    }

    case "multi_select": {
      const c = config as unknown as SelectConfig;
      const ids = (c.options ?? []).map((o) => o.id);
      if (ids.length === 0) {
        schema = z.array(z.string());
      } else {
        schema = z.array(z.enum(ids as [string, ...string[]]));
      }
      break;
    }

    case "checkbox": {
      schema = z.boolean();
      break;
    }

    case "dropdown": {
      const c = config as unknown as SelectConfig;
      const ids = (c.options ?? []).map((o) => o.id);
      if (ids.length === 0) {
        schema = z.string();
      } else {
        schema = z.enum(ids as [string, ...string[]]);
      }
      break;
    }

    case "rating": {
      const c = config as RatingConfig;
      schema = z.coerce.number().int().min(1).max(c.scaleMax ?? 5);
      break;
    }

    case "date": {
      // Accept ISO 8601 date strings; coerce.date() also handles Date objects
      schema = z.coerce.date();
      break;
    }

    default: {
      // Fallback for any future field types — accept any value
      schema = z.unknown();
      break;
    }
  }

  // Wrap with optional() when the field is not required (Req. 8.1)
  if (!field.required) {
    return schema.optional();
  }

  return schema;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a per-form Zod object schema dynamically from the form's field set.
 *
 * The returned schema maps `fieldId -> value schema` so that a raw answers
 * object keyed by field id can be parsed/validated in one call.
 *
 * Usage:
 * ```ts
 * const schema = buildAnswerSchema(fields);
 * const result = schema.safeParse(answersById);
 * ```
 *
 * Requirements: 8.1–8.7, 19.5
 */
export function buildAnswerSchema(
  fields: SelectField[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    shape[field.id] = buildFieldSchema(field);
  }

  return z.object(shape);
}
