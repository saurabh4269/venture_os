import { describe, expect, it } from "vitest";
import { affinityConnector, granolaConnector, onedriveConnector, transcriptToText } from "./clients.js";

function fetchUrl(input: string | URL): string {
  return typeof input === "string" ? input : input.toString();
}

function fetchOk(urlMatch: string | RegExp, body: unknown, status = 200): typeof fetch {
  return (async (input: string | URL) => {
    const url = fetchUrl(input);
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

  it("Affinity list and fetch pass fieldIds when ownershipFieldId is set", async () => {
    const seen: string[] = [];
    const ctx = {
      fetch: (async (input: string | URL) => {
        const url = fetchUrl(input);
        seen.push(url);
        if (url.includes("/v2/companies/") && !url.includes("?")) {
          return Response.json({ id: 42, name: "Acme", domain: "acme.test", fields: [] });
        }
        if (url.includes("/v2/companies/42")) {
          return Response.json({
            id: 42,
            name: "Acme",
            domain: "acme.test",
            fields: [{ id: "field-own-1", name: "Ownership %", value: { type: "number", data: 12.5 } }],
          });
        }
        if (url.includes("/v2/companies")) {
          return Response.json({
            data: [
              {
                id: 42,
                name: "Acme",
                domain: "acme.test",
                fields: [{ id: "field-own-1", name: "Ownership %", value: { type: "number", data: 12.5 } }],
              },
            ],
            pagination: { nextUrl: null },
          });
        }
        return new Response("unexpected", { status: 599 });
      }) as typeof fetch,
    };
    const listed = await affinityConnector.listNewArtifacts(ctx, {
      apiKey: "affinity-live-key-ok",
      ownershipFieldId: "field-own-1",
    });
    expect(seen.some((u) => u.includes("fieldIds=field-own-1"))).toBe(true);
    expect(listed.artifacts[0]?.raw).toMatchObject({ ownershipPct: 12.5 });

    const fetched = await affinityConnector.fetch(
      ctx,
      { apiKey: "affinity-live-key-ok", ownershipFieldId: "field-own-1" },
      { externalId: "42", name: "Acme", kind: "ownership" },
    );
    expect(seen.some((u) => u.includes("/v2/companies/42") && u.includes("fieldIds=field-own-1"))).toBe(true);
    expect(fetched.payload).toMatchObject({ ownershipPct: 12.5, affinityCompanyId: "42" });
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
