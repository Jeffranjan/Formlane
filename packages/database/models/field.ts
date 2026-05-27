import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export const fieldType = pgEnum("field_type", [
  "short_text",
  "long_text",
  "email",
  "number",
  "single_select",
  "multi_select",
  "checkbox",
  "dropdown",
  "rating",
  "date",
]);

export const fieldsTable = pgTable(
  "fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    type: fieldType("type").notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    description: text("description"),
    required: boolean("required").default(false).notNull(),
    order: integer("display_order").notNull(), // 0-based, contiguous within a form
    page: integer("page").default(0).notNull(), // Req. 21.12
    showIf: jsonb("show_if"), // Req. 21.2: { fieldId, op, value }
    config: jsonb("config").notNull(), // type-specific: { maxLength, min, max, options[], scaleMax, ... }
  },
  (t) => [
    uniqueIndex("fields_form_order_idx").on(t.formId, t.order),
  ],
);

export type SelectField = typeof fieldsTable.$inferSelect;
export type InsertField = typeof fieldsTable.$inferInsert;
