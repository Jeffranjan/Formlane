/**
 * Slug format: ^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
 *
 * Rules:
 * - Starts and ends with a lowercase alphanumeric character
 * - Middle portion (if present) may contain lowercase alphanumeric and hyphens
 * - Total length: 2–64 characters
 */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;

/**
 * Characters used for random slug generation (lowercase alphanumeric only).
 */
const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Derives a slug base from a form title.
 * Converts to lowercase, replaces spaces/underscores with hyphens,
 * strips non-alphanumeric/hyphen characters, collapses hyphens, trims edges.
 */
export function generateSlugFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50); // leave room for numeric suffix

  // If the result is too short or empty, fall back to a random slug
  if (slug.length < 2) {
    return generateRandomSlug();
  }

  return slug;
}

/**
 * Generates a random URL-safe slug of the given length.
 * The slug always starts and ends with an alphanumeric character.
 * Default length is 8 characters.
 */
export function generateRandomSlug(length = 8): string {
  if (length < 2) length = 2;
  if (length > 64) length = 64;

  const chars: string[] = [];

  // First character: alphanumeric only
  chars.push(randomChar(SLUG_CHARS));

  // Middle characters (if length > 2): alphanumeric + hyphens, but avoid consecutive hyphens
  const SLUG_CHARS_WITH_HYPHEN = SLUG_CHARS + "-";
  for (let i = 1; i < length - 1; i++) {
    let c = randomChar(SLUG_CHARS_WITH_HYPHEN);
    // Avoid consecutive hyphens
    while (c === "-" && chars[chars.length - 1] === "-") {
      c = randomChar(SLUG_CHARS_WITH_HYPHEN);
    }
    chars.push(c);
  }

  // Last character: alphanumeric only (and not a hyphen)
  chars.push(randomChar(SLUG_CHARS));

  return chars.join("");
}

function randomChar(charset: string): string {
  // Use Math.random for simplicity; crypto.getRandomValues would be stronger
  // but slugs are not security-sensitive identifiers
  return charset[Math.floor(Math.random() * charset.length)]!;
}
