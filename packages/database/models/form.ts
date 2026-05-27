import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const formStatus = pgEnum("form_status", [
  "draft",
  "published",
  "unpublished",
]);

export const formVisibility = pgEnum("form_visibility", ["public", "unlisted"]);

export const formsTable = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: formStatus("status").notNull().default("draft"),
    visibility: formVisibility("visibility").notNull().default("unlisted"),
    confirmationMessage: text("confirmation_message"),
    publishedAt: timestamp("published_at"),
    expiresAt: timestamp("expires_at"), // Req. 21.3
    maxResponses: integer("max_responses"), // Req. 21.4
    passwordHash: text("password_hash"), // Req. 21.8
    archived: boolean("archived").default(false).notNull(), // Req. 21.11
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (t) => [index("forms_creator_status_idx").on(t.creatorId, t.status)],
);

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
