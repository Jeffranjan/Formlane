import { createHash, randomUUID } from "node:crypto";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import { authService } from "./services";

/**
 * The resolved user shape exposed on the tRPC context.
 * Mirrors the columns from `usersTable` that procedures need.
 */
export interface ContextUser {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
}

/**
 * The resolved session shape exposed on the tRPC context.
 * Mirrors the columns from `sessionsTable` that procedures need.
 */
export interface ContextSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date | null;
}

/** The full tRPC context object available in every procedure. */
export interface ContextShape {
  req: Request;
  res: Response;
  /** Null when the request carries no valid session cookie. */
  session: ContextSession | null;
  /** Null when the request carries no valid session cookie. */
  user: ContextUser | null;
  /** sha256(ip + IP_HASH_SECRET) — never contains the raw IP. */
  ipHash: string;
  /** Propagated from `x-correlation-id` header or freshly generated UUID. */
  correlationId: string;
}

/**
 * Parse the session id from the `session` httpOnly cookie.
 * Returns undefined when the cookie is absent or the cookie header is missing.
 */
function parseSessionCookie(req: CreateExpressContextOptions["req"]): string | undefined {
  // cookie-parser (task 2.3) populates req.cookies; fall back to manual parsing
  // when it is not yet mounted so context.ts works in isolation.
  const cookies: Record<string, string> =
    (req as unknown as { cookies?: Record<string, string> }).cookies ?? {};

  if (cookies["session"]) {
    return cookies["session"];
  }

  // Manual fallback: parse the raw Cookie header
  const cookieHeader = req.headers["cookie"];
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    if (key === "session") {
      return rest.join("=").trim();
    }
  }

  return undefined;
}

/**
 * Compute a one-way hash of the client IP address so it can be stored and
 * compared without retaining the raw IP (Req. 7.5).
 *
 * Formula: sha256(ip + IP_HASH_SECRET) — the secret prevents rainbow-table
 * reversal of the hash.  Falls back to an empty string when IP_HASH_SECRET is
 * not configured (development / test environments).
 */
function hashIp(ip: string): string {
  const secret = process.env["IP_HASH_SECRET"] ?? "";
  return createHash("sha256").update(ip + secret).digest("hex");
}

/**
 * Resolve the client IP from the request.  When `trust proxy` is enabled in
 * Express (task 2.3), `req.ip` already reflects the forwarded IP.
 */
function getClientIp(req: CreateExpressContextOptions["req"]): string {
  return (req as unknown as { ip?: string }).ip ?? "unknown";
}

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<ContextShape> {
  // --- Session resolution (Req. 1.7) ---
  const sessionId = parseSessionCookie(req);
  const resolved = sessionId ? await authService.resolveSession(sessionId) : null;

  // --- IP hash (Req. 7.5) ---
  const ipHash = hashIp(getClientIp(req));

  // --- Correlation ID (Req. 20.4) ---
  // Propagate an existing id from the upstream caller or generate a fresh one.
  const correlationId =
    (req.headers["x-correlation-id"] as string | undefined) ?? randomUUID();

  // Attach the correlation id to the response so callers can trace it back.
  res.setHeader("x-correlation-id", correlationId);

  return {
    req,
    res,
    session: (resolved?.session ?? null) as ContextSession | null,
    user: (resolved?.user ?? null) as ContextUser | null,
    ipHash,
    correlationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
