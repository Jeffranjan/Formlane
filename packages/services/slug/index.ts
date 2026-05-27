import { db } from "@repo/database";
import { formsTable } from "@repo/database/schema";
import { eq } from "drizzle-orm";
import { SLUG_REGEX, generateSlugFromTitle, generateRandomSlug } from "./model";

export { SLUG_REGEX } from "./model";

/**
 * SlugService handles generation and uniqueness verification of form slugs.
 *
 * Generated slugs match: ^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
 * - Minimum length: 2 characters
 * - Maximum length: 64 characters
 * - Only lowercase alphanumeric and hyphens
 * - Cannot start or end with a hyphen
 */
class SlugService {
  /**
   * Generates a unique slug derived from the given title.
   * Falls back to a random slug if the title-based slug is taken after retries.
   */
  async generateFromTitle(title: string): Promise<string> {
    const base = generateSlugFromTitle(title);

    // Try the base slug first, then with numeric suffixes
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${attempt}`;
      const normalized = this.normalizeSlug(candidate);
      if (normalized && (await this.isAvailable(normalized))) {
        return normalized;
      }
    }

    // Fall back to random slug
    return this.generateRandom();
  }

  /**
   * Generates a unique random slug.
   */
  async generateRandom(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateRandomSlug();
      if (await this.isAvailable(candidate)) {
        return candidate;
      }
    }
    // Extremely unlikely to reach here; generate a longer random slug as last resort
    const fallback = generateRandomSlug(12);
    return fallback;
  }

  /**
   * Validates a Creator-supplied custom slug and checks uniqueness.
   * Returns the slug if valid and available.
   * Throws with code "slug_invalid" if the format is wrong.
   * Throws with code "slug_taken" if already in use.
   */
  async validateCustomSlug(
    slug: string,
    excludeFormId?: string,
  ): Promise<string> {
    if (!SLUG_REGEX.test(slug)) {
      const err = new Error("slug_invalid") as Error & { code: string };
      err.code = "slug_invalid";
      throw err;
    }

    const available = await this.isAvailable(slug, excludeFormId);
    if (!available) {
      const err = new Error("slug_taken") as Error & { code: string };
      err.code = "slug_taken";
      throw err;
    }

    return slug;
  }

  /**
   * Checks whether a slug is available (not used by any form).
   * Optionally excludes a specific form id (for updates).
   */
  async isAvailable(slug: string, excludeFormId?: string): Promise<boolean> {
    const rows = await db
      .select({ id: formsTable.id })
      .from(formsTable)
      .where(eq(formsTable.slug, slug))
      .limit(1);

    if (rows.length === 0) return true;
    if (excludeFormId && rows[0]!.id === excludeFormId) return true;
    return false;
  }

  /**
   * Normalizes a slug candidate: lowercase, replace spaces/underscores with hyphens,
   * strip invalid characters, collapse consecutive hyphens, trim leading/trailing hyphens.
   * Returns null if the result doesn't match the slug regex.
   */
  private normalizeSlug(input: string): string | null {
    const normalized = input
      .toLowerCase()
      .replace(/[\s_]+/g, "-") // spaces and underscores → hyphens
      .replace(/[^a-z0-9-]/g, "") // strip anything not alphanumeric or hyphen
      .replace(/-{2,}/g, "-") // collapse consecutive hyphens
      .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
      .slice(0, 64); // enforce max length

    return SLUG_REGEX.test(normalized) ? normalized : null;
  }
}

export default SlugService;
