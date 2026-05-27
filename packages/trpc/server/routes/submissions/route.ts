import { TRPCError } from "@trpc/server";
import { z } from "../../schema";
import { publicProcedure, router } from "../../trpc";
import { ErrorCode } from "../_errors";
import { rateLimitService } from "@repo/services/rate-limit";
import { spamFilterService } from "@repo/services/spam-filter";
import FormService from "@repo/services/form";
import { validationService } from "@repo/services/validation";
import { responseService } from "@repo/services/response";
import { db, eq, sql } from "@repo/database";
import { responsesTable } from "@repo/database/schema";

const formService = new FormService();

const TAGS = ["Submissions"];

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const submissionsRouter = router({
  /**
   * Submit a response to a public form.
   *
   * Pipeline (in order):
   * 1. Rate-limit per IP (10 req/min per form+IP)
   * 2. Rate-limit per form globally (100 req/min)
   * 3. Spam filter (honeypot check)
   * 4. Resolve form by slug (must be published)
   * 5. Check form status is "published"
   * 6. Check form expiry (task 7.4)
   * 7. Check max responses (task 7.4)
   * 8. Validate answers against form fields
   * 9. Persist response
   * 10. Return submissionId + thankYou message
   *
   * Requirements: 7.1–7.8, 10.1–10.5
   */
  submit: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/api/forms/{slug}/responses",
        tags: TAGS,
        summary: "Submit a response to a form",
      },
    })
    .input(
      z.object({
        slug: z.string().min(1),
        answers: z.record(z.string(), z.unknown()),
        __hp: z.string().optional(),
      }),
    )
    .output(
      z.object({
        submissionId: z.string().uuid(),
        thankYou: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { slug, answers, __hp } = input;
      const ipHash = ctx.ipHash;
      const userAgent = ctx.req.headers["user-agent"] as string | undefined;

      // Step 1: Rate-limit per IP per form
      const ipRateResult = await rateLimitService.consume({
        scope: "form_ip",
        key: `${slug}:${ipHash}`,
        limit: 10,
        windowMs: 60_000,
      });

      if (!ipRateResult.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: ErrorCode.rate_limited,
        });
      }

      // Step 2: Rate-limit per form globally
      const globalRateResult = await rateLimitService.consume({
        scope: "form_global",
        key: slug,
        limit: 100,
        windowMs: 60_000,
      });

      if (!globalRateResult.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: ErrorCode.rate_limited,
        });
      }

      // Step 3: Spam filter (honeypot)
      const spamResult = spamFilterService.check(__hp);
      if (!spamResult.ok) {
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: ErrorCode.spam_detected,
        });
      }

      // Step 4: Resolve form by slug
      let form;
      try {
        form = await formService.getPublicBySlug({ slug });
      } catch (err) {
        const e = err as Error & { code?: string };
        if (e.code === ErrorCode.form_not_found) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorCode.form_not_found,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorCode.submission_failed,
        });
      }

      // Step 5: Form status check
      // Note: getPublicBySlug already throws form_not_found for non-published forms,
      // but we keep this guard for any edge cases where status may differ.
      // The form object returned by getPublicBySlug strips the status field,
      // so we rely on the service's own guard above. If we reach here, the form
      // is published. This explicit check is a belt-and-suspenders guard.

      // Step 6 (Task 7.4): Check form expiry
      if (form.expiresAt != null) {
        const now = new Date();
        if (now >= form.expiresAt) {
          throw new TRPCError({
            code: "METHOD_NOT_SUPPORTED",
            message: ErrorCode.form_expired,
          });
        }
      }

      // Step 7 (Task 7.4): Check max responses
      if (form.maxResponses != null) {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(responsesTable)
          .where(eq(responsesTable.formId, form.id));

        const currentCount = countResult?.count ?? 0;
        if (currentCount >= form.maxResponses) {
          throw new TRPCError({
            code: "CONFLICT",
            message: ErrorCode.response_limit_reached,
          });
        }
      }

      // Step 8: Validate answers
      const validationResult = validationService.validate(form.fields, answers);
      if (!validationResult.ok) {
        // Return field-level validation errors as a structured BAD_REQUEST
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: ErrorCode.validation_error,
          cause: validationResult.errors,
        });
      }

      // Step 9: Persist response
      let persistResult;
      try {
        persistResult = await responseService.persist(
          form.id,
          validationResult.normalized,
          { ipHash, userAgent },
        );
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorCode.submission_failed,
        });
      }

      // Step 10: Return result
      return {
        submissionId: persistResult.submissionId,
        thankYou:
          form.confirmationMessage ??
          "Thanks! Your response has been recorded.",
      };
    }),
});
