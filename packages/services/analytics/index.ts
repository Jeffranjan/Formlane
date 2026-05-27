import { db } from "@repo/database";
import { responsesTable, answersTable } from "@repo/database/schema";
import type { SelectField } from "@repo/database/schema";
import { eq, gte, and, count, sql } from "drizzle-orm";

// ─── Result types ────────────────────────────────────────────────────────────

export type OptionsDistribution = {
  type: "options";
  counts: Record<string, number>;
};

export type RatingDistribution = {
  type: "rating";
  counts: Record<number, number>;
};

export type NumberDistribution = {
  type: "number";
  min: number;
  max: number;
  mean: number;
  median: number;
};

export type TextDistribution = {
  type: "text";
  count: number;
};

export type FieldDistribution =
  | OptionsDistribution
  | RatingDistribution
  | NumberDistribution
  | TextDistribution;

export interface AnalyticsResult {
  totalCount: number;
  last7DaysCount: number;
  perFieldDistribution: Record<string, FieldDistribution>;
}

// ─── Field type helpers ───────────────────────────────────────────────────────

const OPTION_FIELD_TYPES = new Set([
  "single_select",
  "multi_select",
  "dropdown",
]);

const RATING_FIELD_TYPES = new Set(["rating"]);
const NUMBER_FIELD_TYPES = new Set(["number"]);

// ─── Service ─────────────────────────────────────────────────────────────────

export class AnalyticsService {
  /**
   * Aggregates response data for a given form.
   *
   * @param formId  - UUID of the form to aggregate.
   * @param fields  - The form's field rows (used to determine distribution type per field).
   * @returns       AnalyticsResult with totalCount, last7DaysCount, and perFieldDistribution.
   *
   * Requirements: 12.1, 12.2, 12.3
   */
  async getForForm(
    formId: string,
    fields: SelectField[],
  ): Promise<AnalyticsResult> {
    // ── 1. Total response count ──────────────────────────────────────────────
    const [totalRow] = await db
      .select({ value: count() })
      .from(responsesTable)
      .where(eq(responsesTable.formId, formId));

    const totalCount = Number(totalRow?.value ?? 0);

    // ── 2. Last-7-days count ─────────────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [last7Row] = await db
      .select({ value: count() })
      .from(responsesTable)
      .where(
        and(
          eq(responsesTable.formId, formId),
          gte(responsesTable.createdAt, sevenDaysAgo),
        ),
      );

    const last7DaysCount = Number(last7Row?.value ?? 0);

    // ── 3. Per-field distributions ───────────────────────────────────────────
    const perFieldDistribution: Record<string, FieldDistribution> = {};

    if (fields.length === 0) {
      return { totalCount, last7DaysCount, perFieldDistribution };
    }

    // Fetch all answers for this form in one query (join responses → answers)
    const rows = await db
      .select({
        fieldId: answersTable.fieldId,
        value: answersTable.value,
      })
      .from(answersTable)
      .innerJoin(responsesTable, eq(answersTable.responseId, responsesTable.id))
      .where(eq(responsesTable.formId, formId));

    // Group raw answer rows by fieldId for O(n) processing
    const answersByField = new Map<string, unknown[]>();
    for (const row of rows) {
      const bucket = answersByField.get(row.fieldId);
      if (bucket) {
        bucket.push(row.value);
      } else {
        answersByField.set(row.fieldId, [row.value]);
      }
    }

    // Compute distribution per field
    for (const field of fields) {
      const values = answersByField.get(field.id) ?? [];

      if (OPTION_FIELD_TYPES.has(field.type)) {
        perFieldDistribution[field.id] = computeOptionsDistribution(values);
      } else if (RATING_FIELD_TYPES.has(field.type)) {
        perFieldDistribution[field.id] = computeRatingDistribution(values);
      } else if (NUMBER_FIELD_TYPES.has(field.type)) {
        perFieldDistribution[field.id] = computeNumberDistribution(values);
      } else {
        // short_text, long_text, email, checkbox, date, etc.
        perFieldDistribution[field.id] = { type: "text", count: values.length };
      }
    }

    return { totalCount, last7DaysCount, perFieldDistribution };
  }
}

// ─── Pure aggregation helpers ─────────────────────────────────────────────────

/**
 * Counts occurrences of each option id.
 * Handles both single-select (string) and multi-select (string[]) answers.
 */
function computeOptionsDistribution(values: unknown[]): OptionsDistribution {
  const counts: Record<string, number> = {};

  for (const v of values) {
    if (Array.isArray(v)) {
      // multi_select: value is string[]
      for (const item of v) {
        if (typeof item === "string") {
          counts[item] = (counts[item] ?? 0) + 1;
        }
      }
    } else if (typeof v === "string") {
      // single_select / dropdown: value is string
      counts[v] = (counts[v] ?? 0) + 1;
    }
  }

  return { type: "options", counts };
}

/**
 * Counts occurrences of each numeric rating value.
 */
function computeRatingDistribution(values: unknown[]): RatingDistribution {
  const counts: Record<number, number> = {};

  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) {
      counts[v] = (counts[v] ?? 0) + 1;
    }
  }

  return { type: "rating", counts };
}

/**
 * Computes min, max, mean, and median for numeric answers.
 * Returns zeros for all stats when there are no numeric values.
 */
function computeNumberDistribution(values: unknown[]): NumberDistribution {
  const nums: number[] = [];

  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) {
      nums.push(v);
    }
  }

  if (nums.length === 0) {
    return { type: "number", min: 0, max: 0, mean: 0, median: 0 };
  }

  nums.sort((a, b) => a - b);

  const min = nums[0]!;
  const max = nums[nums.length - 1]!;
  const mean = nums.reduce((sum, n) => sum + n, 0) / nums.length;

  let median: number;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 0) {
    median = (nums[mid - 1]! + nums[mid]!) / 2;
  } else {
    median = nums[mid]!;
  }

  return { type: "number", min, max, mean, median };
}

export const analyticsService = new AnalyticsService();
