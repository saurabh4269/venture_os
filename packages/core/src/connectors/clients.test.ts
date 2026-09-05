import { describe, expect, it } from "vitest";
import { affinityConnector, granolaConnector, onedriveConnector, transcriptToText } from "./clients.js";

function fetchOk(urlMatch: string | RegExp, body: unknown, status = 200): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const ok = typeof urlMatch === "string" ? url.includes(urlMatch) : urlMatch.test(url);
    if (!ok) return new Response("unexpected", { status: 599 });
    return Response.json(body, { status });
  }) as typeof fetch;
}

describe("connector HTTP clients (mock)", () => {
  it("OneDrive app-only health uses Graph organization", async () => {
    const ctx = {
      fetch: fetchOk("/v1.0/organization", { value: [{ id: "t", displayName: "FIXTURE" }] }),
    };
    const r = await onedriveConnector.healthCheck(ctx, { accessToken: "t", authMode: "client_credentials" });
    expect(r.ok).toBe(true);
  });

  it("Affinity health uses GET /v2/companies", async () => {
    const ctx = { fetch: fetchOk("/v2/companies", { data: [], pagination: { nextUrl: null } }) };
    expect((await affinityConnector.healthCheck(ctx, { apiKey: "affinity-live-key-ok" })).ok).toBe(true);
    expect((await affinityConnector.healthCheck(ctx, {})).ok).toBe(false);
  });

  it("Granola health uses GET /v1/notes", async () => {
    const ctx = { fetch: fetchOk("/v1/notes", { notes: [], hasMore: false }) };
    expect((await granolaConnector.healthCheck(ctx, { apiKey: "grn_workspace_key" })).ok).toBe(true);
  });

  it("formats official Granola transcript lines only", () => {
    expect(
      transcriptToText([{ speaker: { source: "microphone" }, text: "Hello" }, { foo: 1 }]),
    ).toBe("microphone: Hello");
  });
});
