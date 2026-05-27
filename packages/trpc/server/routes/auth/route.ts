import { TRPCError } from "@trpc/server";
import { z } from "../../schema";
import { authService } from "../../services";
import { publicProcedure, router } from "../../trpc";
import { ErrorCode } from "../_errors";

const TAGS = ["Authentication"];

/** Cookie options applied to the session cookie on every set/clear. */
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
  path: "/",
};

/** Shape returned by signUp and signIn. */
const authResultSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    isAdmin: z.boolean(),
  }),
});

/** Shape returned by the `me` procedure. */
const meResultSchema = z.object({
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      fullName: z.string(),
      isAdmin: z.boolean(),
    })
    .nullable(),
});

export const authRouter = router({
  /**
   * Sign up a new Creator account and establish a session (Req. 1.1, 1.2, 1.3).
   */
  signUp: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/api/auth/sign-up",
        tags: TAGS,
        summary: "Create a new Creator account and establish a session",
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
        fullName: z.string().optional(),
      }),
    )
    .output(authResultSchema)
    .mutation(async ({ input, ctx }) => {
      let result;
      try {
        result = await authService.signUp({
          email: input.email,
          password: input.password,
          fullName: input.fullName,
        });
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === ErrorCode.email_already_in_use) {
          throw new TRPCError({
            code: "CONFLICT",
            message: ErrorCode.email_already_in_use,
          });
        }
        if (code === ErrorCode.validation_error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ErrorCode.validation_error,
          });
        }
        throw err;
      }

      ctx.res.cookie("session", result.sessionId, SESSION_COOKIE_OPTIONS);

      return { user: result.user };
    }),

  /**
   * Sign in with existing credentials and establish a session (Req. 1.1, 1.4, 1.5).
   */
  signIn: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/api/auth/sign-in",
        tags: TAGS,
        summary: "Sign in with email and password",
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .output(authResultSchema)
    .mutation(async ({ input, ctx }) => {
      let result;
      try {
        result = await authService.signIn({
          email: input.email,
          password: input.password,
        });
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === ErrorCode.invalid_credentials) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: ErrorCode.invalid_credentials,
          });
        }
        throw err;
      }

      ctx.res.cookie("session", result.sessionId, SESSION_COOKIE_OPTIONS);

      return { user: result.user };
    }),

  /**
   * Sign out by invalidating the current session and clearing the cookie (Req. 1.1, 1.6).
   */
  signOut: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/api/auth/sign-out",
        tags: TAGS,
        summary: "Invalidate the current session",
      },
    })
    .input(z.undefined())
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      if (ctx.session) {
        await authService.signOut(ctx.session.id);
      }

      ctx.res.clearCookie("session", SESSION_COOKIE_OPTIONS);

      return { success: true };
    }),

  /**
   * Return the currently authenticated user, or null if not authenticated (Req. 1.7).
   * Uses publicProcedure so unauthenticated callers receive null rather than an error.
   */
  me: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/auth/me",
        tags: TAGS,
        summary: "Return the currently authenticated Creator",
      },
    })
    .input(z.undefined())
    .output(meResultSchema)
    .query(({ ctx }) => {
      return { user: ctx.user };
    }),

  /**
   * Returns the Google OAuth authorization URL (Req. 1.9).
   *
   * When Google OAuth is not configured (env vars absent), returns
   * `{ url: null }` so the caller can skip the button silently.
   */
  googleStart: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/api/auth/google/start",
        tags: TAGS,
        summary: "Get the Google OAuth authorization URL",
      },
    })
    .input(z.undefined())
    .output(z.object({ url: z.string().nullable() }))
    .query(() => {
      const url = authService.googleGetAuthUrl();
      return { url };
    }),

  /**
   * Handles the Google OAuth callback: exchanges the code for tokens,
   * creates/updates the user, and issues a session cookie (Req. 1.9).
   *
   * When Google OAuth is not configured, returns `{ user: null }` silently.
   */
  googleCallback: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/api/auth/google/callback",
        tags: TAGS,
        summary: "Handle Google OAuth callback and establish a session",
      },
    })
    .input(z.object({ code: z.string() }))
    .output(
      z.object({
        user: z
          .object({
            id: z.string(),
            email: z.string(),
            fullName: z.string(),
            isAdmin: z.boolean(),
          })
          .nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let result;
      try {
        result = await authService.googleOAuthSignIn({ code: input.code });
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === ErrorCode.validation_error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ErrorCode.validation_error,
          });
        }
        throw err;
      }

      // Google OAuth not configured — skip silently
      if (!result) {
        return { user: null };
      }

      ctx.res.cookie("session", result.sessionId, SESSION_COOKIE_OPTIONS);

      return { user: result.user };
    }),
});
