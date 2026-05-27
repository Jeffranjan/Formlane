import {
  pgTable,
  uuid,
  char,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export const responsesTable = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    ipHash: char("ip_hash", { length: 64 }), // sha256 hex of ip+secret
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("responses_form_created_idx").on(t.formId, t.createdAt)],
);

export type SelectResponse = typeof responsesTable.$inferSelect;
export type InsertResponse = typeof responsesTable.$inferInsert;
