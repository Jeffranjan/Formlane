import { pgTable, uuid, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { responsesTable } from "./response";
import { fieldsTable } from "./field";

export const answersTable = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responsesTable.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => fieldsTable.id, { onDelete: "cascade" }),
    value: jsonb("value").notNull(), // string | number | string[] | boolean | ISO date
  },
  (t) => [uniqueIndex("answers_response_field_idx").on(t.responseId, t.fieldId)],
);

export type SelectAnswer = typeof answersTable.$inferSelect;
export type InsertAnswer = typeof answersTable.$inferInsert;
