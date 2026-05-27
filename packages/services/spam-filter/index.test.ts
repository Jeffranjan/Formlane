import { describe, it, expect } from "vitest";
import { SpamFilterService } from "./index";

describe("SpamFilterService", () => {
  const service = new SpamFilterService();

  describe("check()", () => {
    // --- Legitimate submissions (honeypot not filled) ---

    it("returns ok:true when honeypot is undefined", () => {
      expect(service.check(undefined)).toEqual({ ok: true });
    });

    it("returns ok:true when honeypot is null", () => {
      expect(service.check(null)).toEqual({ ok: true });
    });

    it("returns ok:true when honeypot is an empty string", () => {
      expect(service.check("")).toEqual({ ok: true });
    });

    // --- Spam submissions (honeypot filled) ---

    it("returns spam_detected when honeypot contains a non-empty string", () => {
      expect(service.check("bot-value")).toEqual({
        ok: false,
        code: "spam_detected",
      });
    });

    it("returns spam_detected when honeypot contains a single space", () => {
      expect(service.check(" ")).toEqual({
        ok: false,
        code: "spam_detected",
      });
    });

    it("returns spam_detected when honeypot contains a long string", () => {
      expect(service.check("a".repeat(500))).toEqual({
        ok: false,
        code: "spam_detected",
      });
    });

    it("returns spam_detected when honeypot contains only whitespace", () => {
      expect(service.check("   \t\n")).toEqual({
        ok: false,
        code: "spam_detected",
      });
    });

    it("returns spam_detected when honeypot contains a numeric string", () => {
      expect(service.check("12345")).toEqual({
        ok: false,
        code: "spam_detected",
      });
    });
  });
});
