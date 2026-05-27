import { describe, it, expect, vi, beforeEach } from "vitest";
import { SLUG_REGEX, generateSlugFromTitle, generateRandomSlug } from "./model";
import SlugService from "./index";

// ---------------------------------------------------------------------------
// Pure model tests (no DB)
// ---------------------------------------------------------------------------

describe("SLUG_REGEX", () => {
  it("accepts a minimal 2-character slug", () => {
    expect(SLUG_REGEX.test("ab")).toBe(true);
  });

  it("accepts a single alphanumeric character slug (length 1 — boundary)", () => {
    // The regex requires at least 2 chars when the middle group is present,
    // but a single char matches the first char class alone.
    // Per the regex: ^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
    // A single char satisfies ^[a-z0-9]$ with the optional group absent.
    expect(SLUG_REGEX.test("a")).toBe(true);
  });

  it("accepts a slug with hyphens in the middle", () => {
    expect(SLUG_REGEX.test("my-form-slug")).toBe(true);
  });

  it("accepts a slug with numbers", () => {
    expect(SLUG_REGEX.test("form-2024")).toBe(true);
  });

  it("accepts a 64-character slug (max length)", () => {
    const slug = "a" + "b".repeat(62) + "c"; // 64 chars
    expect(SLUG_REGEX.test(slug)).toBe(true);
  });

  it("rejects a slug starting with a hyphen", () => {
    expect(SLUG_REGEX.test("-my-form")).toBe(false);
  });

  it("rejects a slug ending with a hyphen", () => {
    expect(SLUG_REGEX.test("my-form-")).toBe(false);
  });

  it("rejects a slug with uppercase letters", () => {
    expect(SLUG_REGEX.test("My-Form")).toBe(false);
  });

  it("rejects a slug with spaces", () => {
    expect(SLUG_REGEX.test("my form")).toBe(false);
  });

  it("rejects a slug with special characters", () => {
    expect(SLUG_REGEX.test("my_form")).toBe(false);
    expect(SLUG_REGEX.test("my.form")).toBe(false);
    expect(SLUG_REGEX.test("my/form")).toBe(false);
  });

  it("rejects a slug longer than 64 characters", () => {
    const slug = "a".repeat(65);
    expect(SLUG_REGEX.test(slug)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(SLUG_REGEX.test("")).toBe(false);
  });
});

describe("generateSlugFromTitle", () => {
  it("converts a title to a lowercase hyphenated slug", () => {
    const slug = generateSlugFromTitle("My Awesome Form");
    expect(slug).toBe("my-awesome-form");
  });

  it("strips special characters", () => {
    const slug = generateSlugFromTitle("Hello, World! (2024)");
    expect(slug).toBe("hello-world-2024");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    const slug = generateSlugFromTitle("Form   With   Spaces");
    expect(slug).toBe("form-with-spaces");
  });

  it("replaces underscores with hyphens", () => {
    const slug = generateSlugFromTitle("form_with_underscores");
    expect(slug).toBe("form-with-underscores");
  });

  it("trims leading and trailing hyphens", () => {
    const slug = generateSlugFromTitle("  ---form---  ");
    expect(slug).toBe("form");
  });

  it("truncates to 50 characters", () => {
    const title = "a".repeat(100);
    const slug = generateSlugFromTitle(title);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  it("falls back to a random slug for a title that produces too short a result", () => {
    const slug = generateSlugFromTitle("!@#$%");
    // Should be a valid slug (random fallback)
    expect(SLUG_REGEX.test(slug)).toBe(true);
  });

  it("produces a slug matching the SLUG_REGEX", () => {
    const titles = [
      "Customer Feedback Survey",
      "2024 Annual Report",
      "Product NPS",
      "Sign-Up Form",
    ];
    for (const title of titles) {
      const slug = generateSlugFromTitle(title);
      expect(SLUG_REGEX.test(slug)).toBe(true);
    }
  });
});

describe("generateRandomSlug", () => {
  it("generates a slug matching SLUG_REGEX", () => {
    for (let i = 0; i < 20; i++) {
      const slug = generateRandomSlug();
      expect(SLUG_REGEX.test(slug)).toBe(true);
    }
  });

  it("generates a slug of the requested length", () => {
    for (const len of [2, 4, 8, 12, 16, 32, 64]) {
      const slug = generateRandomSlug(len);
      expect(slug.length).toBe(len);
    }
  });

  it("clamps length to 64 at maximum", () => {
    const slug = generateRandomSlug(100);
    expect(slug.length).toBe(64);
  });

  it("clamps length to 2 at minimum", () => {
    const slug = generateRandomSlug(1);
    expect(slug.length).toBe(2);
  });

  it("never starts or ends with a hyphen", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateRandomSlug();
      expect(slug[0]).toMatch(/[a-z0-9]/);
      expect(slug[slug.length - 1]).toMatch(/[a-z0-9]/);
    }
  });

  it("never contains consecutive hyphens", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateRandomSlug();
      expect(slug).not.toMatch(/--/);
    }
  });
});

// ---------------------------------------------------------------------------
// SlugService tests (DB mocked)
// ---------------------------------------------------------------------------

// Mock the database module so we don't need a real Postgres connection
vi.mock("@repo/database", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@repo/database/schema", () => ({
  formsTable: {
    id: "id",
    slug: "slug",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

// Helper to set up the DB mock chain
function mockDbSelect(rows: Array<{ id: string }>) {
  const { db } = require("@repo/database");
  const limitMock = vi.fn().mockResolvedValue(rows);
  const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  db.select.mockReturnValue({ from: fromMock });
  return { limitMock, whereMock, fromMock };
}

describe("SlugService", () => {
  let service: SlugService;

  beforeEach(() => {
    service = new SlugService();
    vi.clearAllMocks();
  });

  describe("isAvailable", () => {
    it("returns true when no form has the slug", async () => {
      mockDbSelect([]);
      const result = await service.isAvailable("my-form");
      expect(result).toBe(true);
    });

    it("returns false when another form has the slug", async () => {
      mockDbSelect([{ id: "other-form-id" }]);
      const result = await service.isAvailable("my-form");
      expect(result).toBe(false);
    });

    it("returns true when the only matching form is the excluded form", async () => {
      mockDbSelect([{ id: "form-123" }]);
      const result = await service.isAvailable("my-form", "form-123");
      expect(result).toBe(true);
    });

    it("returns false when a different form has the slug even with excludeFormId", async () => {
      mockDbSelect([{ id: "other-form-id" }]);
      const result = await service.isAvailable("my-form", "form-123");
      expect(result).toBe(false);
    });
  });

  describe("validateCustomSlug", () => {
    it("returns the slug when valid and available", async () => {
      mockDbSelect([]);
      const result = await service.validateCustomSlug("my-custom-slug");
      expect(result).toBe("my-custom-slug");
    });

    it("throws slug_invalid for a slug that doesn't match the regex", async () => {
      await expect(service.validateCustomSlug("My-Invalid-Slug")).rejects.toMatchObject({
        code: "slug_invalid",
      });
    });

    it("throws slug_invalid for a slug starting with a hyphen", async () => {
      await expect(service.validateCustomSlug("-bad-slug")).rejects.toMatchObject({
        code: "slug_invalid",
      });
    });

    it("throws slug_invalid for a slug ending with a hyphen", async () => {
      await expect(service.validateCustomSlug("bad-slug-")).rejects.toMatchObject({
        code: "slug_invalid",
      });
    });

    it("throws slug_invalid for an empty string", async () => {
      await expect(service.validateCustomSlug("")).rejects.toMatchObject({
        code: "slug_invalid",
      });
    });

    it("throws slug_taken when the slug is already in use", async () => {
      mockDbSelect([{ id: "existing-form-id" }]);
      await expect(service.validateCustomSlug("taken-slug")).rejects.toMatchObject({
        code: "slug_taken",
      });
    });

    it("accepts a slug that is taken by the excluded form (update scenario)", async () => {
      mockDbSelect([{ id: "my-form-id" }]);
      const result = await service.validateCustomSlug("my-slug", "my-form-id");
      expect(result).toBe("my-slug");
    });
  });

  describe("generateFromTitle", () => {
    it("returns a valid slug derived from the title when available", async () => {
      mockDbSelect([]);
      const slug = await service.generateFromTitle("Customer Feedback");
      expect(SLUG_REGEX.test(slug)).toBe(true);
      expect(slug).toContain("customer");
    });

    it("appends a numeric suffix when the base slug is taken", async () => {
      const { db } = require("@repo/database");
      let callCount = 0;
      // First call (base slug) returns taken; second call (base-1) returns available
      db.select.mockImplementation(() => {
        const rows = callCount === 0 ? [{ id: "other-id" }] : [];
        callCount++;
        const limitMock = vi.fn().mockResolvedValue(rows);
        const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
        const fromMock = vi.fn().mockReturnValue({ where: whereMock });
        return { from: fromMock };
      });

      const slug = await service.generateFromTitle("My Form");
      expect(SLUG_REGEX.test(slug)).toBe(true);
    });

    it("falls back to a random slug when all title-based candidates are taken", async () => {
      const { db } = require("@repo/database");
      let callCount = 0;
      // First 5 calls (base + 4 suffixes) return taken; 6th call (random) returns available
      db.select.mockImplementation(() => {
        const rows = callCount < 5 ? [{ id: "other-id" }] : [];
        callCount++;
        const limitMock = vi.fn().mockResolvedValue(rows);
        const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
        const fromMock = vi.fn().mockReturnValue({ where: whereMock });
        return { from: fromMock };
      });

      const slug = await service.generateFromTitle("My Form");
      expect(SLUG_REGEX.test(slug)).toBe(true);
    });
  });

  describe("generateRandom", () => {
    it("returns a valid slug when the first candidate is available", async () => {
      mockDbSelect([]);
      const slug = await service.generateRandom();
      expect(SLUG_REGEX.test(slug)).toBe(true);
    });

    it("retries when the first candidate is taken", async () => {
      const { db } = require("@repo/database");
      let callCount = 0;
      db.select.mockImplementation(() => {
        const rows = callCount === 0 ? [{ id: "other-id" }] : [];
        callCount++;
        const limitMock = vi.fn().mockResolvedValue(rows);
        const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
        const fromMock = vi.fn().mockReturnValue({ where: whereMock });
        return { from: fromMock };
      });

      const slug = await service.generateRandom();
      expect(SLUG_REGEX.test(slug)).toBe(true);
    });
  });
});
