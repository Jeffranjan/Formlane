import { describe, it, expect } from "vitest";
import { buildAnswerSchema } from "./build-answer-schema";
import type { SelectField } from "@repo/database/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(
  overrides: Partial<SelectField> & { type: SelectField["type"]; config: unknown },
): SelectField {
  return {
    id: "field-uuid-1",
    formId: "form-uuid-1",
    label: "Test field",
    description: null,
    required: true,
    order: 0,
    page: 0,
    showIf: null,
    ...overrides,
  } as SelectField;
}

// ---------------------------------------------------------------------------
// short_text
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – short_text", () => {
  it("accepts a string within the default maxLength (500)", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "hello" }).success).toBe(true);
  });

  it("rejects a string exceeding the configured maxLength", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: { maxLength: 10 } }),
    ]);
    expect(schema.safeParse({ f1: "a".repeat(11) }).success).toBe(false);
  });

  it("accepts a string at exactly the configured maxLength", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: { maxLength: 5 } }),
    ]);
    expect(schema.safeParse({ f1: "abcde" }).success).toBe(true);
  });

  it("rejects a missing required short_text field", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
    ]);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("allows a missing optional short_text field", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: {}, required: false }),
    ]);
    expect(schema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// long_text
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – long_text", () => {
  it("accepts a string within the default maxLength (5000)", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "long_text", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "a".repeat(5000) }).success).toBe(true);
  });

  it("rejects a string exceeding the configured maxLength", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "long_text", config: { maxLength: 20 } }),
    ]);
    expect(schema.safeParse({ f1: "a".repeat(21) }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// email
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – email", () => {
  it("accepts a valid email address", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "email", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "user@example.com" }).success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "email", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "not-an-email" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// number
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – number", () => {
  it("accepts a number within min/max bounds", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "number", config: { min: 1, max: 10 } }),
    ]);
    expect(schema.safeParse({ f1: 5 }).success).toBe(true);
  });

  it("rejects a number below min", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "number", config: { min: 5 } }),
    ]);
    expect(schema.safeParse({ f1: 4 }).success).toBe(false);
  });

  it("rejects a number above max", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "number", config: { max: 10 } }),
    ]);
    expect(schema.safeParse({ f1: 11 }).success).toBe(false);
  });

  it("accepts a number with no bounds configured", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "number", config: {} }),
    ]);
    expect(schema.safeParse({ f1: -999999 }).success).toBe(true);
  });

  it("rejects a non-number value", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "number", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "42" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// single_select
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – single_select", () => {
  const options = [
    { id: "opt-a", label: "Option A" },
    { id: "opt-b", label: "Option B" },
  ];

  it("accepts a valid option id", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "single_select", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: "opt-a" }).success).toBe(true);
  });

  it("rejects an invalid option id", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "single_select", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: "opt-c" }).success).toBe(false);
  });

  it("rejects an option label (only ids are valid)", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "single_select", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: "Option A" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// multi_select
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – multi_select", () => {
  const options = [
    { id: "opt-1", label: "One" },
    { id: "opt-2", label: "Two" },
    { id: "opt-3", label: "Three" },
  ];

  it("accepts an array of valid option ids", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "multi_select", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: ["opt-1", "opt-3"] }).success).toBe(true);
  });

  it("rejects an array containing an invalid option id", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "multi_select", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: ["opt-1", "opt-99"] }).success).toBe(false);
  });

  it("accepts an empty array for optional multi_select", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "multi_select", config: { options }, required: false }),
    ]);
    expect(schema.safeParse({ f1: [] }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkbox
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – checkbox", () => {
  it("accepts true", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "checkbox", config: {} }),
    ]);
    expect(schema.safeParse({ f1: true }).success).toBe(true);
  });

  it("accepts false", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "checkbox", config: {} }),
    ]);
    expect(schema.safeParse({ f1: false }).success).toBe(true);
  });

  it("rejects a non-boolean value", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "checkbox", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "true" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dropdown
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – dropdown", () => {
  const options = [
    { id: "d-1", label: "First" },
    { id: "d-2", label: "Second" },
  ];

  it("accepts a valid option id", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "dropdown", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: "d-1" }).success).toBe(true);
  });

  it("rejects an invalid option id", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "dropdown", config: { options } }),
    ]);
    expect(schema.safeParse({ f1: "d-99" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rating
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – rating", () => {
  it("accepts an integer within [1, scaleMax]", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: { scaleMax: 5 } }),
    ]);
    expect(schema.safeParse({ f1: 3 }).success).toBe(true);
  });

  it("accepts the boundary value 1", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: { scaleMax: 5 } }),
    ]);
    expect(schema.safeParse({ f1: 1 }).success).toBe(true);
  });

  it("accepts the boundary value scaleMax", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: { scaleMax: 10 } }),
    ]);
    expect(schema.safeParse({ f1: 10 }).success).toBe(true);
  });

  it("rejects a value below 1", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: { scaleMax: 5 } }),
    ]);
    expect(schema.safeParse({ f1: 0 }).success).toBe(false);
  });

  it("rejects a value above scaleMax", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: { scaleMax: 5 } }),
    ]);
    expect(schema.safeParse({ f1: 6 }).success).toBe(false);
  });

  it("rejects a non-integer rating", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: { scaleMax: 5 } }),
    ]);
    expect(schema.safeParse({ f1: 2.5 }).success).toBe(false);
  });

  it("uses default scaleMax of 5 when not configured", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "rating", config: {} }),
    ]);
    expect(schema.safeParse({ f1: 5 }).success).toBe(true);
    expect(schema.safeParse({ f1: 6 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// date
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – date", () => {
  it("accepts a valid ISO date string", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "date", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "2024-06-15T00:00:00.000Z" }).success).toBe(true);
  });

  it("accepts a Date object", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "date", config: {} }),
    ]);
    expect(schema.safeParse({ f1: new Date("2024-06-15") }).success).toBe(true);
  });

  it("rejects a non-date string", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "date", config: {} }),
    ]);
    expect(schema.safeParse({ f1: "not-a-date" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multi-field schema
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – multi-field form", () => {
  it("validates all fields together", () => {
    const fields: SelectField[] = [
      makeField({ id: "name", type: "short_text", config: { maxLength: 100 }, required: true }),
      makeField({ id: "email", type: "email", config: {}, required: true }),
      makeField({ id: "age", type: "number", config: { min: 0, max: 120 }, required: false }),
    ];
    const schema = buildAnswerSchema(fields);

    expect(
      schema.safeParse({ name: "Alice", email: "alice@example.com" }).success,
    ).toBe(true);

    expect(
      schema.safeParse({ name: "Alice", email: "alice@example.com", age: 30 }).success,
    ).toBe(true);

    // Missing required email
    expect(schema.safeParse({ name: "Alice" }).success).toBe(false);
  });

  it("returns an empty object schema for an empty field list", () => {
    const schema = buildAnswerSchema([]);
    expect(schema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// required vs optional
// ---------------------------------------------------------------------------

describe("buildAnswerSchema – required flag", () => {
  it("required=true: rejects undefined value", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
    ]);
    expect(schema.safeParse({ f1: undefined }).success).toBe(false);
  });

  it("required=false: allows undefined value", () => {
    const schema = buildAnswerSchema([
      makeField({ id: "f1", type: "short_text", config: {}, required: false }),
    ]);
    expect(schema.safeParse({ f1: undefined }).success).toBe(true);
  });
});
