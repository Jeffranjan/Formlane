import * as fc from "fast-check";
import { optionsArb, type OptionShape } from "./option";

/** All supported field types from the design */
export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "single_select"
  | "multi_select"
  | "checkbox"
  | "dropdown"
  | "rating"
  | "date";

/** Type-specific config shapes */
export type FieldConfig =
  | { maxLength?: number } // short_text, long_text
  | {} // email, checkbox, date
  | { min?: number; max?: number } // number
  | { options: OptionShape[] } // single_select, multi_select, dropdown
  | { scaleMax: number }; // rating

export interface FieldShape {
  id: string;
  formId: string;
  type: FieldType;
  label: string;
  description: string | null;
  required: boolean;
  order: number;
  config: FieldConfig;
}

/** Arbitrary for a short_text or long_text config */
const textConfigArb = fc.record({
  maxLength: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
});

/** Arbitrary for a number config with valid min <= max constraint */
const numberConfigArb = fc
  .tuple(
    fc.option(fc.float({ min: -1e9, max: 1e9, noNaN: true }), { nil: undefined }),
    fc.option(fc.float({ min: -1e9, max: 1e9, noNaN: true }), { nil: undefined }),
  )
  .map(([a, b]) => {
    if (a !== undefined && b !== undefined) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      return { min, max };
    }
    if (a !== undefined) return { min: a };
    if (b !== undefined) return { max: b };
    return {};
  });

/** Arbitrary for a rating config: scaleMax in [2, 10] */
const ratingConfigArb = fc.record({
  scaleMax: fc.integer({ min: 2, max: 10 }),
});

/** Generates a single field with a consistent type + config pair */
export const fieldArb: fc.Arbitrary<FieldShape> = fc
  .record({
    id: fc.uuid(),
    formId: fc.uuid(),
    label: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
    required: fc.boolean(),
    order: fc.nat({ max: 99 }),
  })
  .chain((base) =>
    fc
      .oneof(
        fc.constant("short_text" as const).chain((type) =>
          textConfigArb.map((config) => ({ ...base, type, config })),
        ),
        fc.constant("long_text" as const).chain((type) =>
          textConfigArb.map((config) => ({ ...base, type, config })),
        ),
        fc.constant("email" as const).map((type) => ({ ...base, type, config: {} })),
        fc.constant("number" as const).chain((type) =>
          numberConfigArb.map((config) => ({ ...base, type, config })),
        ),
        fc.constant("single_select" as const).chain((type) =>
          optionsArb.map((options) => ({ ...base, type, config: { options } })),
        ),
        fc.constant("multi_select" as const).chain((type) =>
          optionsArb.map((options) => ({ ...base, type, config: { options } })),
        ),
        fc.constant("checkbox" as const).map((type) => ({ ...base, type, config: {} })),
        fc.constant("dropdown" as const).chain((type) =>
          optionsArb.map((options) => ({ ...base, type, config: { options } })),
        ),
        fc.constant("rating" as const).chain((type) =>
          ratingConfigArb.map((config) => ({ ...base, type, config })),
        ),
        fc.constant("date" as const).map((type) => ({ ...base, type, config: {} })),
      )
      .map((field) => field as FieldShape),
  );
