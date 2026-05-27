import * as fc from "fast-check";
import type { FieldShape, FieldType } from "./field";
import type { OptionShape } from "./option";

/** A single answer in a submission payload */
export interface AnswerShape {
  fieldId: string;
  value: string | number | string[] | boolean;
}

/** A complete set of answers for a given set of fields */
export type AnswersShape = AnswerShape[];

/**
 * Generates a valid answer value for a given field type and config.
 * The generated value satisfies the field's validation rules.
 */
function validValueForField(field: FieldShape): fc.Arbitrary<string | number | string[] | boolean> {
  const type = field.type as FieldType;
  const config = field.config as Record<string, unknown>;

  switch (type) {
    case "short_text":
    case "long_text": {
      const maxLength = typeof config.maxLength === "number" ? config.maxLength : 200;
      return fc.string({ minLength: 0, maxLength: Math.min(maxLength, 200) });
    }
    case "email":
      return fc.emailAddress();
    case "number": {
      const min = typeof config.min === "number" ? config.min : -1000;
      const max = typeof config.max === "number" ? config.max : 1000;
      return fc.float({ min, max, noNaN: true });
    }
    case "single_select":
    case "dropdown": {
      const options = (config.options as OptionShape[]) ?? [];
      if (options.length === 0) return fc.constant("");
      return fc.constantFrom(...options.map((o) => o.id));
    }
    case "multi_select": {
      const options = (config.options as OptionShape[]) ?? [];
      if (options.length === 0) return fc.constant([] as string[]);
      return fc
        .array(fc.constantFrom(...options.map((o) => o.id)), {
          minLength: 1,
          maxLength: options.length,
        })
        .map((ids) => [...new Set(ids)]);
    }
    case "checkbox":
      return fc.boolean();
    case "rating": {
      const scaleMax = typeof config.scaleMax === "number" ? config.scaleMax : 5;
      return fc.integer({ min: 1, max: scaleMax }).map(String);
    }
    case "date":
      return fc
        .date({ min: new Date("2000-01-01"), max: new Date("2030-12-31") })
        .map((d) => d.toISOString().split("T")[0]!);
    default:
      return fc.string();
  }
}

/**
 * Generates a valid set of answers for the given fields.
 * All required fields are answered; optional fields may or may not be answered.
 */
export const answersArb = (fields: FieldShape[]): fc.Arbitrary<AnswersShape> => {
  if (fields.length === 0) return fc.constant([]);

  const answerArbs = fields.map((field) =>
    fc
      .tuple(
        fc.boolean(), // include this field?
        validValueForField(field),
      )
      .map(([include, value]) => {
        // Always include required fields
        if (field.required || include) {
          return { fieldId: field.id, value } as AnswerShape;
        }
        return null;
      }),
  );

  return fc.tuple(...(answerArbs as [fc.Arbitrary<AnswerShape | null>])).map((results) =>
    (results as (AnswerShape | null)[]).filter((r): r is AnswerShape => r !== null),
  );
};

/**
 * Generates a complete set of answers (all fields answered, required or not).
 */
export const completeAnswersArb = (fields: FieldShape[]): fc.Arbitrary<AnswersShape> => {
  if (fields.length === 0) return fc.constant([]);

  const answerArbs = fields.map((field) =>
    validValueForField(field).map(
      (value) => ({ fieldId: field.id, value }) as AnswerShape,
    ),
  );

  return fc
    .tuple(...(answerArbs as [fc.Arbitrary<AnswerShape>]))
    .map((results) => results as AnswerShape[]);
};
