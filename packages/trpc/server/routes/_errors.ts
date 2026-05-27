/**
 * Internal error code catalogue for Formlane.
 *
 * Every TRPCError thrown in this codebase MUST use one of these codes as its
 * `message` field so the central errorFormatter can map it to the correct HTTP
 * status deterministically.
 *
 * Usage:
 *   throw new TRPCError({ code: "FORBIDDEN", message: ErrorCode.forbidden });
 */

export const ErrorCode = {
  // Auth
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  invalid_credentials: "invalid_credentials",
  email_already_in_use: "email_already_in_use",
  password_required: "password_required",

  // Generic input
  validation_error: "validation_error",

  // Forms
  form_not_found: "form_not_found",
  /**
   * Returned when a slug resolves to a form that exists but is not published
   * (draft or unpublished). The HTTP body MUST be byte-equivalent to the
   * form_not_found body so callers cannot distinguish the two cases.
   */
  form_unavailable: "form_unavailable",
  form_not_accepting_responses: "form_not_accepting_responses",
  cannot_publish_empty_form: "cannot_publish_empty_form",
  slug_taken: "slug_taken",
  form_expired: "form_expired",
  response_limit_reached: "response_limit_reached",

  // Submission validation
  required_field_missing: "required_field_missing",
  invalid_email: "invalid_email",
  invalid_number: "invalid_number",
  answer_too_long: "answer_too_long",
  invalid_option: "invalid_option",
  unknown_field: "unknown_field",

  // Rate limiting & spam
  rate_limited: "rate_limited",
  spam_detected: "spam_detected",

  // Persistence
  submission_failed: "submission_failed",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Maps each internal error code to its canonical HTTP status code.
 *
 * This map is the single source of truth consumed by the tRPC errorFormatter.
 * Codes not present in this map fall through to tRPC's default HTTP status
 * derivation.
 */
export const ERROR_HTTP_STATUS: Record<ErrorCodeValue, number> = {
  // 400 Bad Request
  validation_error: 400,

  // 401 Unauthorized
  unauthorized: 401,
  invalid_credentials: 401,
  password_required: 401,

  // 403 Forbidden
  forbidden: 403,

  // 404 Not Found
  // form_unavailable intentionally shares the same status as form_not_found
  // so callers cannot distinguish whether a slug exists (Req 6.4).
  form_not_found: 404,
  form_unavailable: 404,

  // 409 Conflict
  email_already_in_use: 409,
  form_not_accepting_responses: 409,
  response_limit_reached: 409,
  slug_taken: 409,

  // 410 Gone
  form_expired: 410,

  // 422 Unprocessable Entity
  cannot_publish_empty_form: 422,
  required_field_missing: 422,
  invalid_email: 422,
  invalid_number: 422,
  answer_too_long: 422,
  invalid_option: 422,
  unknown_field: 422,
  spam_detected: 422,

  // 429 Too Many Requests
  rate_limited: 429,

  // 500 Internal Server Error
  submission_failed: 500,
};
