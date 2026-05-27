import { TRPCError } from "@trpc/server";
import { z } from "../../schema";
import { protectedProcedure, router } from "../../trpc";
import { ErrorCode } from "../_errors";
import { responseService } from "@repo/services/response";
import FormService from "@repo/services/form";
import { db } from "@repo/database";
import { answersTable, responsesTable } from "@repo/database/schema";
import { eq, desc, inArray } from "drizzle-orm";

const formService = new FormService();

const TAGS = ["Responses"];

// ---------------------------------------------------------------------------
// Input / output schemas
// ---------------------------------------------------------------------------

const responseFilterSchema = z
  .object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    fieldAnswers: z
      .array(
        z.object({
          fieldId: z.string().uuid(),
          value: z.unknown(),
        }),
      )
      .optional(),
  })
  .optional();

const answerSchema = z.object({
  id: z.string().uuid(),
  responseId: z.string().uuid(),
  fieldId: z.string().uuid(),
  value: z.unknown(),
});

const responseSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  ipHash: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date().nullable(),
  answers: z.array(answerSchema),
});

const listResponsesOutputSchema = z.object({
  items: z.array(responseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

// ---------------------------------------------------------------------------
// Error mapping helper
// ---------------------------------------------------------------------------

function mapServiceError(err: unknown): never {
  const e = err as Error & { code?: string };
  switch (e.code) {
    case ErrorCode.form_not_found:
      throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
    case ErrorCode.forbidden:
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
    case ErrorCode.validation_error:
      throw new TRPCError({ code: "BAD_REQUEST", message: ErrorCode.validation_error });
    default:
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const responsesRouter = router({
  /**
   * List all responses for a form owned by the authenticated creator.
   * Supports pagination and optional filtering.
   *
   * Requirements: 11.1, 11.2, 11.5
   */
  listForForm: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/forms/{formId}/responses",
        tags: TAGS,
        summary: "List responses for a form",
      },
    })
    .input(
      z.object({
        formId: z.string().uuid(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        filter: responseFilterSchema,
      }),
    )
    .output(listResponsesOutputSchema)
    .query(async ({ input, ctx }) => {
      // Verify form ownership (Req. 11.2)
      let form;
      try {
        form = await formService.getById(input.formId);
      } catch (err) {
        mapServiceError(err);
      }

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
      }

      if (form.creatorId !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
      }

      try {
        return await responseService.list({
          formId: input.formId,
          page: input.page,
          pageSize: input.pageSize,
          filter: input.filter,
        });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Get a single response by id.
   * Verifies the response's form belongs to the authenticated creator.
   *
   * Requirements: 11.1
   */
  get: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/responses/{id}",
        tags: TAGS,
        summary: "Get a response by id",
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .output(responseSchema)
    .query(async ({ input, ctx }) => {
      let response;
      try {
        response = await responseService.get(input.id);
      } catch (err) {
        mapServiceError(err);
      }

      if (!response) {
        throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
      }

      // Verify the response's form belongs to the caller (Req. 11.2)
      let form;
      try {
        form = await formService.getById(response.formId);
      } catch (err) {
        mapServiceError(err);
      }

      if (!form || form.creatorId !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
      }

      return response;
    }),

  /**
   * Delete a response by id.
   * Verifies form ownership before deletion.
   *
   * Requirements: 11.3, 11.4
   */
  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/responses/{id}",
        tags: TAGS,
        summary: "Delete a response",
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        formId: z.string().uuid(),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      // Verify form ownership (Req. 11.4)
      let form;
      try {
        form = await formService.getById(input.formId);
      } catch (err) {
        mapServiceError(err);
      }

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
      }

      if (form.creatorId !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
      }

      try {
        await responseService.delete({ id: input.id, formId: input.formId });
      } catch (err) {
        mapServiceError(err);
      }

      return { success: true };
    }),

  /**
   * Export all responses for a form as a CSV string.
   * Header row: submission_date, then one column per field (using field label).
   * Data rows: one per response, values in field order, properly escaped.
   *
   * Requirements: 21.10 (CSV export shape)
   */
  exportCsv: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/forms/{formId}/responses.csv",
        tags: TAGS,
        summary: "Export responses as CSV",
      },
    })
    .input(
      z.object({
        formId: z.string().uuid(),
      }),
    )
    .output(z.object({ csv: z.string() }))
    .query(async ({ input, ctx }) => {
      // Verify form ownership
      let form;
      try {
        form = await formService.getById(input.formId);
      } catch (err) {
        mapServiceError(err);
      }

      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
      }

      if (form.creatorId !== ctx.user!.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
      }

      // Load fields ordered by display_order (already included in form from getById)
      const fields = form.fields;

      // Load all responses ordered by createdAt DESC
      const responses = await db
        .select()
        .from(responsesTable)
        .where(eq(responsesTable.formId, input.formId))
        .orderBy(desc(responsesTable.createdAt));

      // Load all answers for these responses in a single query
      const responseIds: string[] = responses.map((r) => r.id);
      const answersByResponseId = new Map<string, Map<string, unknown>>();

      if (responseIds.length > 0) {
        const allAnswers = await db
          .select()
          .from(answersTable)
          .where(inArray(answersTable.responseId, responseIds));

        for (const answer of allAnswers) {
          let fieldValueMap = answersByResponseId.get(answer.responseId);
          if (!fieldValueMap) {
            fieldValueMap = new Map<string, unknown>();
            answersByResponseId.set(answer.responseId, fieldValueMap);
          }
          fieldValueMap.set(answer.fieldId, answer.value);
        }
      }

      // CSV escape: wrap in double-quotes if value contains comma, newline, or double-quote
      // Double-quotes inside the value are escaped by doubling them
      function escapeCsvValue(value: unknown): string {
        const str =
          value === null || value === undefined
            ? ""
            : Array.isArray(value)
              ? value.join("; ")
              : String(value);

        if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }

      // Build header row: submission_date + one column per field label
      const headerCols = ["submission_date", ...fields.map((f) => escapeCsvValue(f.label))];
      const rows: string[] = [headerCols.join(",")];

      // Build one data row per response
      for (const response of responses) {
        const fieldValues = answersByResponseId.get(response.id) ?? new Map();
        const submissionDate = response.createdAt
          ? response.createdAt.toISOString()
          : "";

        const dataCols = [
          escapeCsvValue(submissionDate),
          ...fields.map((f) => escapeCsvValue(fieldValues.get(f.id))),
        ];
        rows.push(dataCols.join(","));
      }

      return { csv: rows.join("\n") };
    }),
});
