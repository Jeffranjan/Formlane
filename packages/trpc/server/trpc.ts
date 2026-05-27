import { TRPCError, initTRPC } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext, type ContextShape, type ContextUser } from "./context";
import { ERROR_HTTP_STATUS, ErrorCode, type ErrorCodeValue } from "./routes/_errors";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({
    errorFormatter({ shape, error }) {
      const message = error.message as ErrorCodeValue;
      const httpStatus = ERROR_HTTP_STATUS[message];

      // When the message is a known internal code, override the HTTP status so
      // every transport (tRPC native, REST via trpc-to-openapi) returns the
      // correct status deterministically (Req 1.8, 3.3, 6.4, 7.7, 10.3, 20.4).
      if (httpStatus !== undefined) {
        // form_unavailable must produce a body byte-equivalent to form_not_found
        // so callers cannot distinguish whether a slug exists (Req 6.4).
        const normalizedMessage =
          message === ErrorCode.form_unavailable
            ? ErrorCode.form_not_found
            : message;

        return {
          ...shape,
          message: normalizedMessage,
          data: {
            ...shape.data,
            httpStatus,
          },
        };
      }

      return shape;
    },
  });

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

/**
 * Middleware that enforces an authenticated session on Creator-only procedures.
 *
 * Throws UNAUTHORIZED (HTTP 401) when `ctx.user` is absent (Req. 1.8).
 * Narrows the context so downstream procedures receive a guaranteed non-null `user`.
 */
const enforceAuthenticated = tRPCContext.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorCode.unauthorized,
    });
  }

  const user: ContextUser = ctx.user;

  return next({
    ctx: {
      ...(ctx as ContextShape),
      user,
    },
  });
});

// Cast to typeof publicProcedure to avoid TS2742 portability error caused by
// declaration emit resolving Express types through deep pnpm paths.
// The middleware is still applied at runtime — the cast only affects the
// exported declaration type.
export const protectedProcedure = tRPCContext.procedure.use(
  enforceAuthenticated,
) as typeof publicProcedure;
