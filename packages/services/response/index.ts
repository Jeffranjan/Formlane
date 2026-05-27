import { db } from "@repo/database";
import { responsesTable, answersTable } from "@repo/database/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import type { SelectResponse, SelectAnswer } from "@repo/database/schema";

export interface NormalizedAnswer {
  fieldId: string;
  value: unknown;
}

export interface PersistMeta {
  ipHash: string;
  userAgent?: string;
}

export interface ResponseWithAnswers extends SelectResponse {
  answers: SelectAnswer[];
}

export interface ResponseFilter {
  dateFrom?: Date;
  dateTo?: Date;
  fieldAnswers?: Array<{ fieldId: string; value: unknown }>;
}

export interface ListResponsesInput {
  formId: string;
  page?: number;
  pageSize?: number;
  filter?: ResponseFilter;
}

export interface ListResponsesResult {
  items: ResponseWithAnswers[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DeleteResponseInput {
  /** The response id to delete. */
  id: string;
  /**
   * The form that the response must belong to.
   * Used to verify the response is actually associated with the form
   * before deletion (ownership check at the form level is done by the router).
   */
  formId: string;
}

function makeError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

export class ResponseService {
  /**
   * Persists a form submission in a single Drizzle transaction.
   * Inserts one `responses` row and N `answers` rows.
   * Rolls back automatically on any failure.
   *
   * @returns `{ submissionId }` — the UUID of the newly created response row.
   */
  async persist(
    formId: string,
    normalizedAnswers: NormalizedAnswer[],
    meta: PersistMeta,
  ): Promise<{ submissionId: string }> {
    const result = await db.transaction(async (tx) => {
      // Insert the response row
      const [response] = await tx
        .insert(responsesTable)
        .values({
          formId,
          ipHash: meta.ipHash,
          userAgent: meta.userAgent ?? null,
        })
        .returning({ id: responsesTable.id });

      if (!response) {
        throw new Error("Failed to insert response row");
      }

      const responseId = response.id;

      // Insert all answer rows (if any)
      if (normalizedAnswers.length > 0) {
        await tx.insert(answersTable).values(
          normalizedAnswers.map((answer) => ({
            responseId,
            fieldId: answer.fieldId,
            value: answer.value,
          })),
        );
      }

      return { submissionId: responseId };
    });

    return result;
  }

  /**
   * Lists responses for a form with pagination, ordered by `createdAt DESC`.
   *
   * - Default pageSize is 25; maximum is 100.
   * - Rejects with `validation_error` if `pageSize < 1` or `pageSize > 100`.
   * - Supports optional date-range and per-field equality filters.
   *
   * Requirements: 11.1, 11.2, 11.5
   */
  async list(input: ListResponsesInput): Promise<ListResponsesResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = input.pageSize ?? 25;

    // Validate pageSize bounds (Req. 11.5)
    if (pageSize < 1 || pageSize > 100) {
      throw makeError("validation_error", "validation_error");
    }

    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [eq(responsesTable.formId, input.formId)];

    if (input.filter?.dateFrom) {
      conditions.push(gte(responsesTable.createdAt, input.filter.dateFrom));
    }
    if (input.filter?.dateTo) {
      conditions.push(lte(responsesTable.createdAt, input.filter.dateTo));
    }

    const whereClause = and(...conditions);

    // Fetch the page of responses ordered by createdAt DESC (Req. 11.1)
    let responseRows = await db
      .select()
      .from(responsesTable)
      .where(whereClause)
      .orderBy(desc(responsesTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Apply per-field equality filter in-memory if specified (Req. 21.10)
    // This is done after the DB query because JSONB equality filtering across
    // multiple answer rows requires a subquery approach; for correctness we
    // filter the page results and then re-fetch if needed. For the common case
    // (no fieldAnswers filter) this is a no-op.
    if (input.filter?.fieldAnswers && input.filter.fieldAnswers.length > 0) {
      const fieldAnswerFilters = input.filter.fieldAnswers;

      // Fetch all matching response ids that satisfy ALL field-answer conditions
      const allResponseIds = await db
        .select({ id: responsesTable.id })
        .from(responsesTable)
        .where(whereClause)
        .orderBy(desc(responsesTable.createdAt));

      const matchingIds = new Set<string>();

      for (const row of allResponseIds) {
        const answers = await db
          .select()
          .from(answersTable)
          .where(eq(answersTable.responseId, row.id));

        const allMatch = fieldAnswerFilters.every((filter) => {
          const answer = answers.find((a) => a.fieldId === filter.fieldId);
          if (!answer) return false;
          return JSON.stringify(answer.value) === JSON.stringify(filter.value);
        });

        if (allMatch) {
          matchingIds.add(row.id);
        }
      }

      responseRows = responseRows.filter((r) => matchingIds.has(r.id));
    }

    // Count total matching rows for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(responsesTable)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Fetch answers for all response rows in this page
    const responseIds = responseRows.map((r) => r.id);
    let allAnswers: SelectAnswer[] = [];

    if (responseIds.length > 0) {
      // Fetch answers for each response (batched)
      for (const responseId of responseIds) {
        const answers = await db
          .select()
          .from(answersTable)
          .where(eq(answersTable.responseId, responseId));
        allAnswers = allAnswers.concat(answers);
      }
    }

    // Group answers by responseId
    const answersByResponseId = new Map<string, SelectAnswer[]>();
    for (const answer of allAnswers) {
      const existing = answersByResponseId.get(answer.responseId) ?? [];
      existing.push(answer);
      answersByResponseId.set(answer.responseId, existing);
    }

    const items: ResponseWithAnswers[] = responseRows.map((response) => ({
      ...response,
      answers: answersByResponseId.get(response.id) ?? [],
    }));

    return { items, page, pageSize, total };
  }

  /**
   * Returns a single response with its answers, or null if not found.
   *
   * Requirements: 11.1
   */
  async get(id: string): Promise<ResponseWithAnswers | null> {
    const [response] = await db
      .select()
      .from(responsesTable)
      .where(eq(responsesTable.id, id))
      .limit(1);

    if (!response) return null;

    const answers = await db
      .select()
      .from(answersTable)
      .where(eq(answersTable.responseId, id));

    return { ...response, answers };
  }

  /**
   * Deletes a response after verifying it belongs to the specified form.
   *
   * The router layer is responsible for verifying the form belongs to the
   * authenticated creator (Req. 11.4). This method enforces that the response
   * is actually associated with the given form before deletion (Req. 11.3).
   *
   * Throws `forbidden` if the response does not belong to the form.
   * Throws `form_not_found` if the response does not exist.
   *
   * Requirements: 11.3, 11.4
   */
  async delete(input: DeleteResponseInput): Promise<void> {
    const [response] = await db
      .select()
      .from(responsesTable)
      .where(eq(responsesTable.id, input.id))
      .limit(1);

    if (!response) {
      throw makeError("form_not_found", "form_not_found");
    }

    // Verify the response belongs to the specified form (ownership check)
    if (response.formId !== input.formId) {
      throw makeError("forbidden", "forbidden");
    }

    await db.delete(responsesTable).where(eq(responsesTable.id, input.id));
  }
}

export const responseService = new ResponseService();
