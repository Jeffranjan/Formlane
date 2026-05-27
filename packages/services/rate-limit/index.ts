import { db } from "@repo/database";
import { rateLimitBucketsTable } from "@repo/database/schema";
import { sql } from "drizzle-orm";

/**
 * Injectable clock interface for deterministic testing.
 */
export interface Clock {
  now(): Date;
}

/**
 * Default clock implementation using the system time.
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export interface ConsumeParams {
  /** The rate-limit scope: per-IP-per-form or global-per-form. */
  scope: "form_ip" | "form_global";
  /**
   * The bucket key.
   * - For "form_ip": typically `"<formId>:<ipHash>"`
   * - For "form_global": typically `"<formId>"`
   */
  key: string;
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface ConsumeResult {
  ok: boolean;
  /** Milliseconds until the current window expires. Only present when ok is false. */
  retryAfterMs?: number;
}

/**
 * RateLimitService — token-bucket rate limiter backed by the `rate_limit_buckets` table.
 *
 * Uses a sliding-window approach where each window is identified by its start timestamp
 * (floored to the nearest `windowMs` boundary). An upsert atomically increments the
 * counter for the current window; if the resulting count exceeds the limit the request
 * is rejected with a `retryAfterMs` value indicating when the window resets.
 *
 * The injectable `Clock` interface allows deterministic testing without real-time delays.
 *
 * Defaults (applied by callers, not enforced here):
 *   - 10 per IP per form per minute  (scope="form_ip",     windowMs=60_000, limit=10)
 *   - 100 per form per minute global (scope="form_global", windowMs=60_000, limit=100)
 *
 * Requirements: 10.1, 10.2, 10.3
 */
export class RateLimitService {
  private readonly clock: Clock;

  constructor(clock: Clock = new SystemClock()) {
    this.clock = clock;
  }

  /**
   * Attempt to consume one token from the specified bucket.
   *
   * Steps:
   * 1. Compute the current window start by flooring `now` to the nearest `windowMs` boundary.
   * 2. Upsert a row in `rate_limit_buckets` (insert with count=1 or increment count by 1).
   * 3. If the resulting count > limit, return `{ ok: false, retryAfterMs }`.
   * 4. Otherwise return `{ ok: true }`.
   */
  async consume(params: ConsumeParams): Promise<ConsumeResult> {
    const { scope, key, limit, windowMs } = params;

    const now = this.clock.now();
    const nowMs = now.getTime();

    // Floor to the nearest windowMs boundary
    const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
    const windowStart = new Date(windowStartMs);

    // Upsert: insert a new row with count=1, or increment count by 1 on conflict
    const rows = await db
      .insert(rateLimitBucketsTable)
      .values({
        scope,
        key,
        windowStart,
        count: 1,
      })
      .onConflictDoUpdate({
        target: [
          rateLimitBucketsTable.scope,
          rateLimitBucketsTable.key,
          rateLimitBucketsTable.windowStart,
        ],
        set: {
          count: sql`${rateLimitBucketsTable.count} + 1`,
        },
      })
      .returning({ count: rateLimitBucketsTable.count });

    const count = rows[0]?.count ?? 1;

    if (count > limit) {
      const windowEndMs = windowStartMs + windowMs;
      const retryAfterMs = windowEndMs - nowMs;
      return { ok: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    return { ok: true };
  }
}

/** Default singleton using the system clock. */
export const rateLimitService = new RateLimitService();
