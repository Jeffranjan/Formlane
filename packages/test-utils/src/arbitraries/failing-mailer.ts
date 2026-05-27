import * as fc from "fast-check";

/**
 * Represents a failing mailer port for property tests that verify
 * notification decoupling (Property 31: Notifications are decoupled from
 * response acceptance).
 *
 * Usage: inject `failingMailerArb` as the MailerPort in NotificationService
 * to verify that mailer failures do not roll back responses or block callers.
 */
export interface FailingMailerShape {
  /** The error the mailer will throw */
  error: Error;
  /** Whether the error is thrown synchronously or asynchronously */
  isAsync: boolean;
  /** Which send operation fails */
  failingMethod: "sendCreatorNotification" | "sendRespondentConfirmation" | "send";
}

const mailerErrorMessages = [
  "SMTP connection refused",
  "authentication failed",
  "recipient address rejected",
  "message size exceeds limit",
  "rate limit exceeded by mail provider",
  "TLS handshake failed",
  "DNS resolution failed for mail server",
];

export const failingMailerArb: fc.Arbitrary<FailingMailerShape> = fc.record({
  error: fc
    .constantFrom(...mailerErrorMessages)
    .map((msg) => new Error(`Mailer error: ${msg}`)),
  isAsync: fc.boolean(),
  failingMethod: fc.oneof(
    fc.constant("sendCreatorNotification" as const),
    fc.constant("sendRespondentConfirmation" as const),
    fc.constant("send" as const),
  ),
});
