import { describe, expect, it } from "vitest";
import { decodeCredentialPayload } from "./usage.js";

const CREDS = { claudeAiOauth: { accessToken: "sk-test-token", expiresAt: 1234567890 } };
const CREDS_JSON = JSON.stringify(CREDS);
const CREDS_HEX = Buffer.from(CREDS_JSON, "utf-8").toString("hex");

describe("decodeCredentialPayload", () => {
  it("passes plain JSON through unchanged", () => {
    // Regression: Buffer.from(json, "hex") stops at the leading "{" and
    // returns an empty buffer, which made every usage widget render nothing
    // on macOS because JSON.parse("") threw into a silent catch.
    expect(decodeCredentialPayload(CREDS_JSON)).toBe(CREDS_JSON);
    expect(JSON.parse(decodeCredentialPayload(CREDS_JSON))).toEqual(CREDS);
  });

  it("decodes a hex-encoded payload", () => {
    expect(decodeCredentialPayload(CREDS_HEX)).toBe(CREDS_JSON);
    expect(JSON.parse(decodeCredentialPayload(CREDS_HEX))).toEqual(CREDS);
  });

  it("treats odd-length hex-looking input as plain text", () => {
    // "abc" is hex-alphabet but cannot be a valid byte sequence.
    expect(decodeCredentialPayload("abc")).toBe("abc");
  });

  it("returns an empty string unchanged", () => {
    expect(decodeCredentialPayload("")).toBe("");
  });
});
