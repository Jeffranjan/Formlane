import { describe, it, expect } from "vitest";
import { PasswordHasher } from "./index";

describe("PasswordHasher", () => {
  const hasher = new PasswordHasher();

  describe("hash", () => {
    it("returns a non-empty string", async () => {
      const result = await hasher.hash("password123");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("produces an Argon2id-encoded hash (starts with $argon2id$)", async () => {
      const result = await hasher.hash("password123");
      expect(result).toMatch(/^\$argon2id\$/);
    });

    it("produces different hashes for the same password (random salt)", async () => {
      const hash1 = await hasher.hash("samepassword");
      const hash2 = await hasher.hash("samepassword");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verify", () => {
    it("returns true when the password matches the hash", async () => {
      const password = "correctPassword!";
      const hashed = await hasher.hash(password);
      const result = await hasher.verify(hashed, password);
      expect(result).toBe(true);
    });

    it("returns false when the password does not match the hash", async () => {
      const hashed = await hasher.hash("correctPassword!");
      const result = await hasher.verify(hashed, "wrongPassword!");
      expect(result).toBe(false);
    });

    it("returns false for an empty password against a real hash", async () => {
      const hashed = await hasher.hash("somePassword");
      const result = await hasher.verify(hashed, "");
      expect(result).toBe(false);
    });

    it("handles passwords with special characters", async () => {
      const password = "p@$$w0rd!#%^&*()";
      const hashed = await hasher.hash(password);
      expect(await hasher.verify(hashed, password)).toBe(true);
      expect(await hasher.verify(hashed, "p@$$w0rd!#%^&*(")).toBe(false);
    });

    it("handles long passwords (>= 8 chars as required by Req. 1.2)", async () => {
      const password = "a".repeat(72); // bcrypt limit, argon2 handles longer
      const hashed = await hasher.hash(password);
      expect(await hasher.verify(hashed, password)).toBe(true);
    });
  });

  describe("round-trip", () => {
    it("hash then verify is consistent across multiple passwords", async () => {
      const passwords = [
        "short1!A",
        "medium-length-password-123",
        "A very long password with spaces and special chars: !@#$%^&*()",
        "unicode: 日本語パスワード",
      ];

      for (const pw of passwords) {
        const hashed = await hasher.hash(pw);
        expect(await hasher.verify(hashed, pw)).toBe(true);
        expect(await hasher.verify(hashed, pw + "x")).toBe(false);
      }
    });
  });
});
