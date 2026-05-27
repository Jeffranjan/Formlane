import * as fc from "fast-check";

/**
 * Represents a select/dropdown option as defined in the design's `optionSchema`:
 * { id: string (min 1), label: string (min 1, max 200) }
 */
export interface OptionShape {
  id: string;
  label: string;
}

/**
 * Generates a single valid option for single_select, multi_select, or dropdown fields.
 */
export const optionArb: fc.Arbitrary<OptionShape> = fc.record({
  id: fc.uuid(),
  label: fc.string({ minLength: 1, maxLength: 200 }),
});

/**
 * Generates a non-empty array of options (at least 1, at most 20).
 */
export const optionsArb: fc.Arbitrary<OptionShape[]> = fc.array(optionArb, {
  minLength: 1,
  maxLength: 20,
});
