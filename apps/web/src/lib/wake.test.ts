import { describe, expect, it } from "vitest";
import { INVALID_JSON_MESSAGE, TRUNCATED_JSON_MESSAGE, UPSTREAM_UNAVAILABLE_MESSAGE } from "./api";
import { bookErrorMessage, isWakeError, WAKING_COPY } from "./wake";

describe("isWakeError", () => {
  it("treats cold-start and truncated book responses as wake, not sign-out", () => {
    expect(isWakeError(UPSTREAM_UNAVAILABLE_MESSAGE)).toBe(true);
    expect(isWakeError(TRUNCATED_JSON_MESSAGE)).toBe(true);
    expect(isWakeError(INVALID_JSON_MESSAGE)).toBe(true);
    expect(isWakeError("Failed to fetch")).toBe(true);
    expect(isWakeError("sign_in_required")).toBe(false);
  });
});

describe("bookErrorMessage", () => {
  it("maps wake errors to partner-grade copy and keeps other API errors", () => {
    expect(bookErrorMessage(UPSTREAM_UNAVAILABLE_MESSAGE)).toBe(WAKING_COPY.unreachable);
    expect(bookErrorMessage("period_locked")).toBe("period_locked");
  });
});
