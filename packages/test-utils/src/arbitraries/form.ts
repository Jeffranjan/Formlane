import * as fc from "fast-check";
import { slugArb } from "./slug";
import { fieldArb, type FieldShape } from "./field";

export type FormStatus = "draft" | "published" | "unpublished";
export type FormVisibility = "public" | "unlisted";

export interface FormShape {
  id: string;
  creatorId: string;
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  visibility: FormVisibility;
  confirmationMessage: string | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  maxResponses: number | null;
  passwordHash: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  fields: FieldShape[];
}

/** Generates a valid form with 0–10 fields */
export const formArb: fc.Arbitrary<FormShape> = fc.record({
  id: fc.uuid(),
  creatorId: fc.uuid(),
  slug: slugArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 2000 }), { nil: null }),
  status: fc.oneof(
    fc.constant("draft" as const),
    fc.constant("published" as const),
    fc.constant("unpublished" as const),
  ),
  visibility: fc.oneof(
    fc.constant("public" as const),
    fc.constant("unlisted" as const),
  ),
  confirmationMessage: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  publishedAt: fc.option(fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }), {
    nil: null,
  }),
  expiresAt: fc.option(fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }), {
    nil: null,
  }),
  maxResponses: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: null }),
  passwordHash: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
  archived: fc.boolean(),
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }),
  updatedAt: fc.option(fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }), {
    nil: null,
  }),
  fields: fc.array(fieldArb, { minLength: 0, maxLength: 10 }),
});

/** Generates a published form with at least one field (suitable for submission tests) */
export const publishedFormArb: fc.Arbitrary<FormShape> = formArb.map((form) => ({
  ...form,
  status: "published" as const,
  publishedAt: form.publishedAt ?? new Date(),
  fields: form.fields.length === 0 ? [{ ...form.fields[0]! }] : form.fields,
}));
