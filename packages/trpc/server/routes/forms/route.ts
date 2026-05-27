import { TRPCError } from "@trpc/server";
import { z } from "../../schema";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { ErrorCode } from "../_errors";
import { fieldSchema } from "../fields/model";
import { publicFormSchema } from "./model";
import FormService from "@repo/services/form";

const formService = new FormService();

// ---------------------------------------------------------------------------
// Error mapping helper
// ---------------------------------------------------------------------------

/**
 * Maps service-layer errors (identified by their `.code` property) to the
 * appropriate TRPCError code and message so the central errorFormatter can
 * derive the correct HTTP status (Req. 3.3, 5.1, 5.3, 5.4).
 */
function mapServiceError(err: unknown): never {
  const code = (err as { code?: string }).code;

  switch (code) {
    case ErrorCode.form_not_found:
      throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
    case ErrorCode.form_unavailable:
      // Return the same NOT_FOUND code and message as form_not_found so the
      // two cases are byte-equivalent to the caller (Req. 6.4).
      throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
    case ErrorCode.forbidden:
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
    case ErrorCode.cannot_publish_empty_form:
      throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: ErrorCode.cannot_publish_empty_form });
    case ErrorCode.validation_error:
      throw new TRPCError({ code: "BAD_REQUEST", message: ErrorCode.validation_error });
    case ErrorCode.slug_taken:
      throw new TRPCError({ code: "CONFLICT", message: ErrorCode.slug_taken });
    case "slug_invalid":
      throw new TRPCError({ code: "BAD_REQUEST", message: "slug_invalid" });
    case ErrorCode.submission_failed:
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: ErrorCode.submission_failed });
    default:
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: ErrorCode.submission_failed });
  }
}

// ---------------------------------------------------------------------------
// Forms router
// ---------------------------------------------------------------------------

export const formsRouter = router({
  /**
   * Create a new form (draft, unlisted) for the authenticated creator.
   * POST /api/forms  (Req. 2.4, 3.1)
   */
  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/api/forms", tags: ["Forms"] } })
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().nullable().optional(),
      }),
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.create({
          creatorId: ctx.user!.id,
          title: input.title,
          description: input.description,
        });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Get a form by id (with its fields). No auth required — the creator needs
   * this to load their own form in the editor before authenticating.
   * GET /api/forms/{id}  (Req. 3.2)
   */
  get: publicProcedure
    .meta({ openapi: { method: "GET", path: "/api/forms/{id}", tags: ["Forms"] } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.any())
    .query(async ({ input }) => {
      const form = await formService.getById(input.id);
      if (!form) {
        throw new TRPCError({ code: "NOT_FOUND", message: ErrorCode.form_not_found });
      }
      return form;
    }),

  /**
   * Resolve a slug to a published form for public consumption.
   *
   * - Returns `publicFormSchema` with `creatorId` and `passwordHash` stripped (Req. 6.2).
   * - Returns the same byte-equivalent 404 body for a slug that maps to a
   *   draft/unpublished form as for a slug that does not exist at all, so
   *   callers cannot determine whether the slug is taken (Req. 6.3, 6.4).
   * - No authentication required (Req. 6.5).
   *
   * GET /api/forms/:slug  (Req. 5.6, 6.1, 6.2, 6.3, 6.4, 6.5)
   */
  getPublicBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: "/api/forms/{slug}", tags: ["Forms"] } })
    .input(z.object({ slug: z.string().min(1) }))
    .output(publicFormSchema)
    .query(async ({ input }) => {
      try {
        const form = await formService.getPublicBySlug({ slug: input.slug });
        // Serialize Date fields to ISO strings for the Zod output schema
        return {
          ...form,
          publishedAt: form.publishedAt ? form.publishedAt.toISOString() : null,
          expiresAt: form.expiresAt ? form.expiresAt.toISOString() : null,
        };
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * List forms owned by the authenticated creator, with pagination.
   * GET /api/forms  (Req. 3.2, 5.1)
   */
  listMine: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/api/forms", tags: ["Forms"] } })
    .input(
      z.object({
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        includeArchived: z.boolean().optional(),
      }),
    )
    .output(z.any())
    .query(async ({ ctx, input }) => {
      try {
        return await formService.listMine({
          creatorId: ctx.user!.id,
          page: input.page,
          pageSize: input.pageSize,
          includeArchived: input.includeArchived,
        });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Update a form's title, description, and/or fields atomically.
   * PUT /api/forms/{id}  (Req. 3.3, 3.7)
   */
  update: protectedProcedure
    .meta({ openapi: { method: "PUT", path: "/api/forms/{id}", tags: ["Forms"] } })
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().nullable().optional(),
        fields: z.array(fieldSchema).optional(),
        slug: z.string().optional(),
      }),
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.update({
          id: input.id,
          creatorId: ctx.user!.id,
          title: input.title,
          description: input.description,
          fields: input.fields,
          slug: input.slug,
        });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Publish a form (requires at least one field).
   * POST /api/forms/{id}/publish  (Req. 3.5)
   */
  publish: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/api/forms/{id}/publish", tags: ["Forms"] } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.publish({ id: input.id, creatorId: ctx.user!.id });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Unpublish a form (sets status back to "unpublished").
   * POST /api/forms/{id}/unpublish  (Req. 3.5)
   */
  unpublish: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/api/forms/{id}/unpublish", tags: ["Forms"] } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.unpublish({ id: input.id, creatorId: ctx.user!.id });
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Permanently delete a form and all associated data.
   * DELETE /api/forms/{id}  (Req. 3.3)
   */
  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/api/forms/{id}", tags: ["Forms"] } })
    .input(z.object({ id: z.string().uuid() }))
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      try {
        await formService.delete({ id: input.id, creatorId: ctx.user!.id });
        return { success: true };
      } catch (err) {
        mapServiceError(err);
      }
    }),

  /**
   * Update a form's visibility (public / unlisted) independently of status.
   * PATCH /api/forms/{id}/visibility  (Req. 5.3, 5.4)
   */
  updateVisibility: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/api/forms/{id}/visibility", tags: ["Forms"] } })
    .input(
      z.object({
        id: z.string().uuid(),
        visibility: z.enum(["public", "unlisted"]),
      }),
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      try {
        return await formService.updateVisibility({
          id: input.id,
          creatorId: ctx.user!.id,
          visibility: input.visibility,
        });
      } catch (err) {
        mapServiceError(err);
      }
    }),
});
