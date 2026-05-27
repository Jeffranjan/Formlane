/**
 * SpamFilterService — honeypot-based spam detection.
 *
 * The public form runner renders a hidden `__hp` field with `tabindex="-1"`
 * and `aria-hidden="true"`. Real users never fill it in; bots typically do.
 *
 * Requirements: 10.4, 10.5
 */

export type SpamFilterResult =
  | { ok: true }
  | { ok: false; code: "spam_detected" };

export class SpamFilterService {
  /**
   * Inspect the honeypot field value from a submission payload.
   *
   * @param honeypotValue - The value of the `__hp` field from the submission.
   *   Pass `undefined` or an empty string to indicate the field was not filled.
   * @returns `{ ok: true }` when the field is absent or empty (legitimate submission),
   *   or `{ ok: false, code: "spam_detected" }` when the field contains any non-empty value.
   */
  check(honeypotValue: string | undefined | null): SpamFilterResult {
    if (honeypotValue !== undefined && honeypotValue !== null && honeypotValue !== "") {
      return { ok: false, code: "spam_detected" };
    }
    return { ok: true };
  }
}

export const spamFilterService = new SpamFilterService();
