import * as fc from "fast-check";

/**
 * Generates valid slugs matching the design's regex:
 * ^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$
 *
 * A valid slug is:
 * - 1 char: a single [a-z0-9]
 * - 3–64 chars: starts and ends with [a-z0-9], middle chars are [a-z0-9-]
 */
export const slugArb: fc.Arbitrary<string> = fc.oneof(
  // Single character slug
  fc.stringMatching(/^[a-z0-9]$/),
  // Multi-character slug: start + middle (1-62 chars) + end
  fc
    .tuple(
      fc.stringMatching(/^[a-z0-9]$/),
      fc.stringMatching(/^[a-z0-9-]{1,62}$/),
      fc.stringMatching(/^[a-z0-9]$/),
    )
    .map(([start, middle, end]) => `${start}${middle}${end}`),
);
