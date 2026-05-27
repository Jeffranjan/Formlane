import { describe, it, expect } from "vitest";
import { ValidationService } from "./index";
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

const svc = new ValidationService();

// ---------------------------------------------------------------------------
// Happy path — all fields valid
// ---------------------------------------------------------------------------

describe("ValidationService.validate – success cases", () => {
  it("returns ok=true with normalized array for a valid submission", () => {
    const fields = [
      makeField({ id: "name", type: "short_text", config: {}, required: true }),
      makeField({ id: "email", type: "email", config: {}, required: true }),
    ];
    const result = svc.validate(fields, { name: "Alice", email: "alice@example.com" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toHaveLength(2);
      expect(result.normalized.find((n) => n.fieldId === "name")?.value).toBe("Alice");
      expect(result.normalized.find((n) => n.fieldId === "email")?.value).toBe("alice@example.com");
    }
  });

  it("returns ok=true when optional fields are omitted", () => {
    const fields = [
      makeField({ id: "name", type: "short_text", config: {}, required: true }),
      makeField({ id: "bio", type: "long_text", config: {}, required: false }),
    ];
    const result = svc.validate(fields, { name: "Bob" });
    expect(result.ok).toBe(true);
  });

  it("normalized array only contains fields present in the answers", () => {
    const fields = [
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
      makeField({ id: "f2", type: "short_text", config: {}, required: false }),
    ];
    const result = svc.validate(fields, { f1: "hello" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.map((n) => n.fieldId)).not.toContain("f2");
    }
  });

  it("returns ok=true for an empty form with empty answers", () => {
    const result = svc.validate([], {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Req. 8.1 — required_field_missing
// ---------------------------------------------------------------------------

describe("ValidationService.validate – required_field_missing (Req. 8.1)", () => {
  it("emits required_field_missing when a required field is absent", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];
    const result = svc.validate(fields, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("required_field_missing");
      expect(result.errors[0]?.fieldId).toBe("f1");
    }
  });

  it("does NOT emit required_field_missing for an optional absent field", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: false })];
    const result = svc.validate(fields, {});
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req. 8.2 — invalid_email
// ---------------------------------------------------------------------------

describe("ValidationService.validate – invalid_email (Req. 8.2)", () => {
  it("emits invalid_email for a malformed email value", () => {
    const fields = [makeField({ id: "f1", type: "email", config: {}, required: true })];
    const result = svc.validate(fields, { f1: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_email");
    }
  });

  it("does NOT emit invalid_email for a valid email", () => {
    const fields = [makeField({ id: "f1", type: "email", config: {}, required: true })];
    const result = svc.validate(fields, { f1: "user@example.com" });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req. 8.3 — invalid_number
// ---------------------------------------------------------------------------

describe("ValidationService.validate – invalid_number (Req. 8.3)", () => {
  it("emits invalid_number when value is below min", () => {
    const fields = [makeField({ id: "f1", type: "number", config: { min: 5 }, required: true })];
    const result = svc.validate(fields, { f1: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_number");
    }
  });

  it("emits invalid_number when value is above max", () => {
    const fields = [makeField({ id: "f1", type: "number", config: { max: 10 }, required: true })];
    const result = svc.validate(fields, { f1: 11 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_number");
    }
  });

  it("emits invalid_number when a non-numeric value is supplied", () => {
    const fields = [makeField({ id: "f1", type: "number", config: {}, required: true })];
    const result = svc.validate(fields, { f1: "not-a-number" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_number");
    }
  });
});

// ---------------------------------------------------------------------------
// Req. 8.4 — answer_too_long
// ---------------------------------------------------------------------------

describe("ValidationService.validate – answer_too_long (Req. 8.4)", () => {
  it("emits answer_too_long for short_text exceeding maxLength", () => {
    const fields = [
      makeField({ id: "f1", type: "short_text", config: { maxLength: 5 }, required: true }),
    ];
    const result = svc.validate(fields, { f1: "toolong" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("answer_too_long");
    }
  });

  it("emits answer_too_long for long_text exceeding maxLength", () => {
    const fields = [
      makeField({ id: "f1", type: "long_text", config: { maxLength: 10 }, required: true }),
    ];
    const result = svc.validate(fields, { f1: "a".repeat(11) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("answer_too_long");
    }
  });
});

// ---------------------------------------------------------------------------
// Req. 8.5 — invalid_option (single_select / dropdown)
// ---------------------------------------------------------------------------

describe("ValidationService.validate – invalid_option single_select (Req. 8.5)", () => {
  const options = [
    { id: "opt-a", label: "A" },
    { id: "opt-b", label: "B" },
  ];

  it("emits invalid_option for an unknown option id in single_select", () => {
    const fields = [
      makeField({ id: "f1", type: "single_select", config: { options }, required: true }),
    ];
    const result = svc.validate(fields, { f1: "opt-z" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_option");
    }
  });

  it("emits invalid_option for an unknown option id in dropdown", () => {
    const fields = [
      makeField({ id: "f1", type: "dropdown", config: { options }, required: true }),
    ];
    const result = svc.validate(fields, { f1: "opt-z" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_option");
    }
  });

  it("accepts a valid option id in single_select", () => {
    const fields = [
      makeField({ id: "f1", type: "single_select", config: { options }, required: true }),
    ];
    const result = svc.validate(fields, { f1: "opt-a" });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req. 8.6 — invalid_option (multi_select)
// ---------------------------------------------------------------------------

describe("ValidationService.validate – invalid_option multi_select (Req. 8.6)", () => {
  const options = [
    { id: "opt-1", label: "One" },
    { id: "opt-2", label: "Two" },
  ];

  it("emits invalid_option when multi_select contains an unknown id", () => {
    const fields = [
      makeField({ id: "f1", type: "multi_select", config: { options }, required: true }),
    ];
    const result = svc.validate(fields, { f1: ["opt-1", "opt-99"] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_option");
    }
  });

  it("accepts a valid multi_select answer", () => {
    const fields = [
      makeField({ id: "f1", type: "multi_select", config: { options }, required: true }),
    ];
    const result = svc.validate(fields, { f1: ["opt-1", "opt-2"] });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req. 8.7 — unknown_field
// ---------------------------------------------------------------------------

describe("ValidationService.validate – unknown_field (Req. 8.7)", () => {
  it("emits unknown_field when answers contain a field id not in the form", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];
    const result = svc.validate(fields, { f1: "hello", "ghost-id": "extra" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const unknownErr = result.errors.find((e) => e.code === "unknown_field");
      expect(unknownErr).toBeDefined();
      expect(unknownErr?.fieldId).toBe("ghost-id");
    }
  });

  it("does NOT emit unknown_field when all answer keys are valid field ids", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];
    const result = svc.validate(fields, { f1: "hello" });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Req. 8.8 + 8.9 — mutual exclusivity
// ---------------------------------------------------------------------------

describe("ValidationService.validate – mutual exclusivity (Req. 8.8, 8.9)", () => {
  it("never returns both ok=true and errors simultaneously", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];

    // Valid case
    const valid = svc.validate(fields, { f1: "hello" });
    expect(valid.ok).toBe(true);
    expect("errors" in valid).toBe(false);

    // Invalid case
    const invalid = svc.validate(fields, {});
    expect(invalid.ok).toBe(false);
    expect("normalized" in invalid).toBe(false);
  });

  it("on success, normalized payload is present and errors is absent", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];
    const result = svc.validate(fields, { f1: "hello" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toBeDefined();
    }
  });

  it("on failure, errors payload is present and normalized is absent", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];
    const result = svc.validate(fields, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// showIf evaluator — hidden fields are skipped (Req. 21.2)
// ---------------------------------------------------------------------------

describe("ValidationService.validate – showIf / hidden field skipping", () => {
  it("skips validation for fields where showIfEvaluator returns false", () => {
    const fields = [
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
      makeField({ id: "f2", type: "email", config: {}, required: true, label: "Hidden email" }),
    ];
    // f2 is hidden — even though it's required and absent, no error should be emitted
    const result = svc.validate(fields, { f1: "hello" }, (field) => field.id !== "f2");
    expect(result.ok).toBe(true);
  });

  it("validates visible fields normally when showIfEvaluator is provided", () => {
    const fields = [
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
      makeField({ id: "f2", type: "email", config: {}, required: true }),
    ];
    // Both visible, f1 missing → error
    const result = svc.validate(fields, { f2: "user@example.com" }, () => true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.fieldId).toBe("f1");
    }
  });

  it("hidden field answers are excluded from the normalized output", () => {
    const fields = [
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
      makeField({ id: "f2", type: "short_text", config: {}, required: false }),
    ];
    // f2 is hidden but an answer is provided for it anyway
    const result = svc.validate(
      fields,
      { f1: "hello", f2: "should-be-excluded" },
      (field) => field.id !== "f2",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.map((n) => n.fieldId)).not.toContain("f2");
    }
  });
});

// ---------------------------------------------------------------------------
// Multiple errors in one submission
// ---------------------------------------------------------------------------

describe("ValidationService.validate – multiple errors", () => {
  it("collects errors from multiple invalid fields in one pass", () => {
    const fields = [
      makeField({ id: "f1", type: "short_text", config: {}, required: true }),
      makeField({ id: "f2", type: "email", config: {}, required: true }),
    ];
    // Both fields missing
    const result = svc.validate(fields, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("combines unknown_field errors with validation errors", () => {
    const fields = [makeField({ id: "f1", type: "short_text", config: {}, required: true })];
    // f1 missing (required) + ghost field present
    const result = svc.validate(fields, { ghost: "extra" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain("unknown_field");
      expect(codes).toContain("required_field_missing");
    }
  });
});

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

describe("validationService singleton", () => {
  it("is exported and is an instance of ValidationService", async () => {
    const { validationService } = await import("./index");
    expect(validationService).toBeInstanceOf(ValidationService);
  });
});
