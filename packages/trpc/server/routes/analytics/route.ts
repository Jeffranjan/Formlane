import { TRPCError } from "@trpc/server";
import { z } from "../../schema";
import { protectedProcedure, router } from "../../trpc";
import { ErrorCode } from "../_errors";
import { analyticsService } from "@repo/services/analytics";
import FormService from "@repo/services/form";

const formService = new FormService();

const TAGS = ["Analytics"];

/**
 * Analytics router — all procedures require an authenticated session.
 *
 * Requirements: 12.1, 12.2, 12.3
 */
export const analyticsRouter = router({
  /**
   * Returns aggregated analytics for a form owned by the authenticated creator.
   *
   * - Verifies form ownership before returning any data (Req. 12.1).
   * - Returns totalCount, last7DaysCount, and perFieldDistribution (Req. 12.2, 12.3).
   */
  getForForm: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/forms/{formId}/analytics",
        tags: TAGS,
        summary: "Get aggregated analytics for a form",
      },
    })
    .input(
      z.object({
        formId: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        totalCount: z.number().int().min(0),
        last7DaysCount: z.number().int().min(0),
        perFieldDistribution: z.record(z.string(), z.unknown()),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Fetch form and verify ownership
      let form;
      try {
        form = await formService.getById(input.formId);
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === ErrorCode.form_not_found) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorCode.form_not_found,
          });
        }
        throw err;
      }

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorCode.form_not_found,
        });
      }

      if (form.creatorId !== ctx.user!.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ErrorCode.forbidden,
        });
      }

      // Delegate to analytics service
      const result = await analyticsService.getForForm(input.formId, form.fields);

      return result;
    }),
});
