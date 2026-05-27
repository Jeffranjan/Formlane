import { hash, verify, Algorithm } from "@node-rs/argon2";

/**
 * Argon2id configuration aligned with OWASP recommendations.
 * - memoryCost: 64 MiB (65536 KiB)
 * - timeCost: 3 iterations
 * - parallelism: 4 lanes
 */
const ARGON2_OPTIONS = {
  // `Algorithm` is exported as a const enum by @node-rs/argon2; under
  // `isolatedModules` we can't reference its members directly, so we use
  // the underlying numeric value (Argon2id = 2).
  algorithm: 2 as Algorithm,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

/**
 * PasswordHasher wraps @node-rs/argon2 to provide Argon2id hashing and
 * verification. Used by AuthService for user passwords and (optionally) by
 * FormService for form password protection (Req. 21.8).
 */
export class PasswordHasher {
  /**
   * Hashes a plaintext password using Argon2id.
   * Returns the encoded hash string (includes algorithm, params, salt, and
   * digest — safe to store directly in the database).
   */
  async hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  /**
   * Verifies a plaintext password against a stored Argon2id hash.
   * Returns `true` when the password matches, `false` otherwise.
   * Never throws on a mismatch — only throws on unexpected internal errors.
   */
  async verify(hash: string, password: string): Promise<boolean> {
    return verify(hash, password, ARGON2_OPTIONS);
  }
}

/** Singleton instance for use across the services layer. */
export const passwordHasher = new PasswordHasher();
