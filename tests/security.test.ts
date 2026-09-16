/**
 * tests/security.test.ts
 */
import { describe, it, expect } from "vitest";
import { isAllowed, isDM, redactToken } from "../src/security.js";

describe("isAllowed", () => {
  it("returns true when userId is in allowlist", () => {
    expect(isAllowed("123", ["123", "456"])).toBe(true);
  });

  it("returns false when userId is not in allowlist", () => {
    expect(isAllowed("999", ["123", "456"])).toBe(false);
  });

  it("returns false when allowlist is empty", () => {
    expect(isAllowed("123", [])).toBe(false);
  });
});

describe("isDM", () => {
  it("returns true for channel type 1 (DM)", () => {
    expect(isDM(1)).toBe(true);
  });

  it("returns false for other channel types", () => {
    expect(isDM(0)).toBe(false);
    expect(isDM(2)).toBe(false);
  });
});

describe("redactToken", () => {
  it("redacts most of the token, keeping first 8 chars", () => {
    const result = redactToken("MTIzNDU2Nzg5ABC.XYZ");
    expect(result).toBe("MTIzNDU2***");
  });

  it("returns *** for very short tokens", () => {
    expect(redactToken("abc")).toBe("***");
  });
});
