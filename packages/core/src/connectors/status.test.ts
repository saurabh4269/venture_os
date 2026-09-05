import { describe, expect, it } from "vitest";
import { deriveConnectorStatus, publicLastSyncAt, statusAfterDisconnect, statusAfterHealth, statusAfterSave } from "./status.js";

describe("connector status state machine", () => {
  it("is not_connected without credentials", () => {
    expect(deriveConnectorStatus({ hasCredentials: false, lastHealthOk: null, lastError: null })).toBe(
      "not_connected",
    );
    expect(statusAfterDisconnect()).toBe("not_connected");
  });

  it("is configured after save, never connected without healthCheck", () => {
    expect(statusAfterSave(true)).toBe("configured");
    expect(deriveConnectorStatus({ hasCredentials: true, lastHealthOk: null, lastError: null })).toBe(
      "configured",
    );
  });

  it("is connected only after successful healthCheck", () => {
    expect(statusAfterHealth(true, null, true)).toBe("connected");
    expect(statusAfterHealth(false, "unauthorized", true)).toBe("error");
  });

  it("does not stay connected when health fails", () => {
    expect(
      deriveConnectorStatus({ hasCredentials: true, lastHealthOk: false, lastError: "timeout" }),
    ).toBe("error");
  });

  it("omits lastSyncAt unless a real timestamp exists", () => {
    expect(publicLastSyncAt(null)).toBeUndefined();
    expect(publicLastSyncAt(undefined)).toBeUndefined();
    expect(publicLastSyncAt("")).toBeUndefined();
    expect(publicLastSyncAt("2026-09-05T00:00:00.000Z")).toBe("2026-09-05T00:00:00.000Z");
  });
});
