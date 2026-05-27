import * as fc from "fast-check";
import type { FieldShape } from "./field";
import { completeAnswersArb, type AnswersShape } from "./answers";

/** A single persisted response with its answers */
export interface ResponseShape {
  id: string;
  formId: string;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: Date;
  answers: AnswersShape;
}

/** Generates a single response for a given form's fields */
export const responseArb = (formId: string, fields: FieldShape[]): fc.Arbitrary<ResponseShape> =>
  fc.record({
    id: fc.uuid(),
    formId: fc.constant(formId),
    ipHash: fc.option(
      fc.hexaString({ minLength: 64, maxLength: 64 }),
      { nil: null },
    ),
    userAgent: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") }),
    answers: completeAnswersArb(fields),
  });

/**
 * Generates a set of 1–50 responses for a given form.
 * Useful for analytics and pagination property tests.
 */
export const responseSetArb = (
  formId: string,
  fields: FieldShape[],
): fc.Arbitrary<ResponseShape[]> =>
  fc.array(responseArb(formId, fields), { minLength: 1, maxLength: 50 });
