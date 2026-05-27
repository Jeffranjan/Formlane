import * as fc from "fast-check";

/**
 * Represents a failing database port for property tests that need to verify
 * error handling when the database layer throws.
 *
 * Usage: inject `failingDbArb` as the db dependency in a service under test
 * to verify that the service propagates or handles DB errors correctly.
 */
export interface FailingDbShape {
  /** The error that the DB will throw */
  error: Error;
  /** Which operation fails: "query" | "insert" | "update" | "delete" | "transaction" */
  failingOperation: "query" | "insert" | "update" | "delete" | "transaction";
}

const dbErrorMessages = [
  "connection refused",
  "deadlock detected",
  "unique constraint violation",
  "foreign key constraint violation",
  "timeout exceeded",
  "too many connections",
  "disk full",
  "serialization failure",
];

export const failingDbArb: fc.Arbitrary<FailingDbShape> = fc.record({
  error: fc
    .constantFrom(...dbErrorMessages)
    .map((msg) => new Error(`DB error: ${msg}`)),
  failingOperation: fc.oneof(
    fc.constant("query" as const),
    fc.constant("insert" as const),
    fc.constant("update" as const),
    fc.constant("delete" as const),
    fc.constant("transaction" as const),
  ),
});
