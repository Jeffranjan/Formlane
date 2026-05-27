import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// Token bucket per (scope, key) tuple — backing store for RateLimitService
export const rateLimitBucketsTable = pgTable(
  "rate_limit_buckets",
  {
    scope: text("scope").notNull(), // "form_ip" | "form_global"
    key: text("key").notNull(), // composite key, e.g. "<formId>:<ipHash>"
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (t) => [primaryKey({ columns: [t.scope, t.key, t.windowStart] })],
);

export type SelectRateLimitBucket = typeof rateLimitBucketsTable.$inferSelect;
export type InsertRateLimitBucket = typeof rateLimitBucketsTable.$inferInsert;
