import { z } from "zod";
import type { SelectField } from "@repo/database/schema";
import { buildAnswerSchema } from "./build-answer-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationError = {
  fieldId: string;
  code: string;
  message: string;
};

export type NormalizedAnswer = {
  fieldId: string;
  value: unknown;
};

export type ValidationResult =
  | { ok: true; normalized: NormalizedAnswer[] }
  | { ok: false; errors: ValidationError[] };

// ---------------------------------------------------------------------------
// Error code mapping
//
// Maps Zod issue codes / checks to the structured error codes defined in the
// design's error catalogue (packages/trpc/server/routes/_errors.ts).
// ---------------------------------------------------------------------------

/**
 * Derives the structured error code from a single Zod issue for a given field.
 *
 * Zod v4 issue codes used here:
 *   - `invalid_type` where received is "undefined" → `required_field_missing`
 *   - `invalid_type` on a number/rating field → `invalid_number`
 *   - `too_big` with origin "string" → `answer_too_long`
 *   - `too_big` / `too_small` with origin "number" → `invalid_number`
 *   - `invalid_format` with format "email" → `invalid_email`
 *   - `invalid_value` (enum mismatch) → `invalid_option`
 *   - `not_multiple_of` → `invalid_number`
 *   - anything else → falls back to the Zod code as a string
 */
function zodIssueToErrorCode(issue: z.ZodIssue, field: SelectField): string {
  const issueAny = issue as unknown as Record<string, unknown>;

  switch (issue.code) {
    case "invalid_type": {
      // Zod v4: the `received` type is embedded in the message string, not as a
      // separate property. We detect a missing required field by checking whether
      // the message says "received undefined".
      const message = issue.message ?? "";
      if (message.includes("received undefined")) {
        return "required_field_missing";
      }
      // Non-numeric value supplied for a number/rating field
      if (field.type === "number" || field.type === "rating") {
        return "invalid_number";
      }
      return issue.code;
    }

    case "too_big": {
      // Zod v4: origin field distinguishes string vs number
      const origin = issueAny["origin"] as string | undefined;
      if (origin === "string") {
        return "answer_too_long";
      }
      if (origin === "number") {
        return "invalid_number";
      }
      // Fallback: check field type
      if (field.type === "short_text" || field.type === "long_text") {
        return "answer_too_long";
      }
      if (field.type === "number" || field.type === "rating") {
        return "invalid_number";
      }
      return issue.code;
    }

    case "too_small": {
      const origin = issueAny["origin"] as string | undefined;
      if (origin === "number") {
        return "invalid_number";
      }
      if (field.type === "number" || field.type === "rating") {
        return "invalid_number";
      }
      return issue.code;
    }

    case "invalid_format": {
      // Zod v4 replaces invalid_string; format field holds "email" etc.
      const format = issueAny["format"] as string | undefined;
      if (format === "email") {
        return "invalid_email";
      }
      return issue.code;
    }

    case "invalid_value": {
      // Zod v4 replaces invalid_enum_value for z.enum() mismatches
      return "invalid_option";
    }

    case "not_multiple_of": {
      return "invalid_number";
    }

    default:
      return issue.code;
  }
}

/**
 * Derives a human-readable message from a Zod issue for a given field.
 */
function zodIssueToMessage(issue: z.ZodIssue, field: SelectField): string {
  const code = zodIssueToErrorCode(issue, field);
  switch (code) {
    case "required_field_missing":
      return `Field "${field.label}" is required.`;
    case "answer_too_long":
      return `Answer for "${field.label}" exceeds the maximum allowed length.`;
    case "invalid_email":
      return `"${field.label}" must be a valid email address.`;
    case "invalid_number":
      return `"${field.label}" must be a valid number within the allowed range.`;
    case "invalid_option":
      return `"${field.label}" contains an invalid option selection.`;
    default:
      return issue.message ?? `Validation failed for "${field.label}".`;
  }
}

// ---------------------------------------------------------------------------
// ValidationService
// ---------------------------------------------------------------------------

export class ValidationService {
  /**
   * Validates a raw answers object against the form's field definitions.
   *
   * @param fields       - The form's field definitions (from the DB).
   * @param answers      - Raw answers keyed by field id.
   * @param showIfEvaluator - Optional evaluator; when provided, fields for
   *                         which it returns `false` are hidden and skipped.
   *
   * @returns `{ ok: true, normalized }` on success, or
   *          `{ ok: false, errors }` on failure.
   *
   * Requirements: 8.1–8.9, 21.2
   */
  validate(
    fields: SelectField[],
    answers: Record<string, unknown>,
    showIfEvaluator?: (field: SelectField) => boolean,
  ): ValidationResult {
    // Determine which fields are visible (i.e. should be validated).
    // When showIfEvaluator is provided, skip fields where it returns false.
    const visibleFields = showIfEvaluator
      ? fields.filter((f) => showIfEvaluator(f) !== false)
      : fields;

    // Build a set of known field ids for unknown-field detection (Req. 8.7).
    const knownFieldIds = new Set(fields.map((f) => f.id));

    // Collect unknown-field errors first (Req. 8.7).
    const errors: ValidationError[] = [];

    for (const answeredFieldId of Object.keys(answers)) {
      if (!knownFieldIds.has(answeredFieldId)) {
        errors.push({
          fieldId: answeredFieldId,
          code: "unknown_field",
          message: `Field id "${answeredFieldId}" does not belong to this form.`,
        });
      }
    }

    // Build the per-form Zod schema restricted to visible fields only.
    const schema = buildAnswerSchema(visibleFields);

    // Extract only the answers that correspond to visible fields so that
    // answers for hidden fields are neither validated nor included in the
    // normalized output.
    const visibleAnswers: Record<string, unknown> = {};
    for (const field of visibleFields) {
      if (Object.prototype.hasOwnProperty.call(answers, field.id)) {
        visibleAnswers[field.id] = answers[field.id];
      }
    }

    const result = schema.safeParse(visibleAnswers);

    if (!result.success) {
      // Map Zod errors to structured error codes (Req. 8.1–8.7).
      const fieldById = new Map(visibleFields.map((f) => [f.id, f]));

      for (const issue of result.error.issues) {
        // The path for a top-level field error is [fieldId].
        const fieldId = issue.path[0] as string | undefined;
        if (!fieldId) continue;

        const field = fieldById.get(fieldId);
        if (!field) continue;

        errors.push({
          fieldId,
          code: zodIssueToErrorCode(issue, field),
          message: zodIssueToMessage(issue, field),
        });
      }
    }

    // If there are any errors (unknown fields or validation failures), return
    // the error result (Req. 8.9).
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    // Build the normalized output (Req. 8.8).
    const normalized: NormalizedAnswer[] = visibleFields
      .filter((f) => Object.prototype.hasOwnProperty.call(result.data, f.id))
      .map((f) => ({
        fieldId: f.id,
        // Use the Zod-parsed (coerced/validated) value from result.data.
        value: (result.data as Record<string, unknown>)[f.id],
      }));

    return { ok: true, normalized };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const validationService = new ValidationService();
