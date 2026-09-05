import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "@venture-os/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { runConnectorSync } from "@venture-os/db";

loadEnv();

const url = process.env.DATABASE_URL;
const origin = { origin: "http://localhost:3000", "content-type": "application/json" };
const csv = readFileSync(resolve(process.cwd(), "../../fixtures/FIXTURE_ONLY-sample-mis.csv"));
const affinityFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../fixtures/connectors/FIXTURE_ONLY-affinity-companies.json"), "utf8"),
) as unknown;

function cookieFrom(res: Response): string {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const one = res.headers.get("set-cookie");
  return one ? (one.split(";")[0] ?? "") : "";
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function mockVendorFetch(req: Request): Promise<Response> {
  const u = new URL(req.url);
  if (u.hostname === "login.microsoftonline.com" && u.pathname.endsWith("/token")) {
    return Promise.resolve(
      Response.json({ access_token: "FIXTURE_graph_token", expires_in: 3600, token_type: "Bearer" }),
    );
  }
  if (u.hostname === "graph.microsoft.com" && u.pathname.endsWith("/organization")) {
    return Promise.resolve(Response.json({ value: [{ id: "tenant", displayName: "FIXTURE" }] }));
  }
  if (u.hostname === "graph.microsoft.com" && u.pathname.endsWith("/children")) {
    return Promise.resolve(
      Response.json({
        value: [{ id: "item-mis-1", name: "FIXTURE_ONLY-sample-mis.csv", file: { mimeType: "text/csv" } }],
      }),
    );
  }
  if (u.hostname === "graph.microsoft.com" && u.pathname.endsWith("/content")) {
    return Promise.resolve(new Response(csv, { headers: { "content-type": "text/csv" } }));
  }
  if (u.hostname === "api.affinity.co" && u.pathname === "/v2/companies") {
    return Promise.resolve(Response.json(affinityFixture));
  }
  if (u.hostname === "public-api.granola.ai" && u.pathname === "/v1/notes") {
    return Promise.resolve(
      Response.json({
        notes: [{ id: "not_fixture1", title: "FIXTURE call" }],
        hasMore: false,
      }),
    );
  }
  if (u.hostname === "public-api.granola.ai" && u.pathname.startsWith("/v1/notes/")) {
    return Promise.resolve(
      Response.json({
        id: "not_fixture1",
        title: "FIXTURE call",
        summary: "Subjective only.",
        transcript: [{ speaker: { source: "microphone" }, text: "Runway felt tight." }],
      }),
    );
  }
  return Promise.resolve(new Response("unexpected_host", { status: 599 }));
}

describe.skipIf(!url)("connector infra (mock HTTP)", () => {
  const app = createApp();
  const stamp = Date.now().toString(36);
  const email = `conn-${stamp}@alpha.test`;
  let cookie = "";
  let orgId = "";
  let companyId = "";
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    const a = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: origin,
      body: JSON.stringify({ email, password: "password123", name: "Conn Admin" }),
    });
    expect(a.status).toBe(200);
    cookie = cookieFrom(a);
    const org = await app.request("/api/orgs", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ name: `Conn ${stamp}`, slug: `conn-${stamp}` }),
    });
    expect(org.status).toBe(200);
    orgId = (await json<{ org: { id: string } }>(org)).org.id;
    cookie = cookieFrom(org) || cookie;
    const co = await app.request("/api/companies", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ name: `Pull Co ${stamp}`, sector: "saas", stage: "Seed" }),
    });
    companyId = (await json<{ company: { id: string } }>(co)).company.id;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it("rejects invalid keys without calling vendors", async () => {
    const res = await app.request("/api/connectors/affinity/credentials", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ apiKey: "short" }),
    });
    expect(res.status).toBe(400);
    expect((await json<{ error: string }>(res)).error).toBe("invalid_affinity_api_key");
  });

  it("saves keys → healthCheck ok → OneDrive sync enqueues parse → inbox row", async () => {
    globalThis.fetch = mockVendorFetch as typeof fetch;

    const save = await app.request("/api/connectors/onedrive/credentials", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({
        clientId: "11111111-1111-1111-1111-111111111111",
        clientSecret: "super-secret-value",
        tenantId: "22222222-2222-2222-2222-222222222222",
        authMode: "client_credentials",
      }),
    });
    expect(save.status).toBe(200);
    const saved = await json<{ connectors: { kind: string; status: string; lastSyncAt?: string }[] }>(save);
    const od = saved.connectors.find((c) => c.kind === "onedrive");
    expect(od?.status).toBe("configured");
    expect(od?.lastSyncAt).toBeUndefined();

    const test = await app.request("/api/connectors/onedrive/test", {
      method: "POST",
      headers: { ...origin, cookie },
      body: "{}",
    });
    expect(test.status).toBe(200);
    const tested = await json<{ status: string }>(test);
    expect(tested.status).toBe("connected");

    const map = await app.request(`/api/companies/${companyId}/connector-mapping`, {
      method: "PATCH",
      headers: { ...origin, cookie },
      body: JSON.stringify({ onedriveFolderPath: "/MIS" }),
    });
    expect(map.status).toBe(200);

    const sync = await runConnectorSync(orgId, "onedrive", { companyId, fetchImpl: mockVendorFetch, parse: true });
    expect(sync.status).toBe("connected");
    expect(sync.ingested).toBeGreaterThan(0);

    const inbox = await json<{ items: { kind: string; documentId: string | null }[] }>(
      await app.request("/api/inbox", { headers: { cookie } }),
    );
    expect(inbox.items.some((i) => i.kind === "metric")).toBe(true);

    const listed = await json<{ connectors: { kind: string; lastSyncAt?: string; status: string }[] }>(
      await app.request("/api/connectors", { headers: { cookie } }),
    );
    const after = listed.connectors.find((c) => c.kind === "onedrive");
    expect(after?.status).toBe("connected");
    expect(after?.lastSyncAt).toBeTruthy();
  });

  it("Affinity and Granola health use official ping endpoints", async () => {
    globalThis.fetch = mockVendorFetch as typeof fetch;
    const aff = await app.request("/api/connectors/affinity/credentials", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ apiKey: "affinity-live-key-ok" }),
    });
    expect(aff.status).toBe(200);
    const affTest = await app.request("/api/connectors/affinity/test", {
      method: "POST",
      headers: { ...origin, cookie },
      body: "{}",
    });
    expect(affTest.status).toBe(200);

    const gr = await app.request("/api/connectors/granola/credentials", {
      method: "POST",
      headers: { ...origin, cookie },
      body: JSON.stringify({ apiKey: "grn_workspace_key" }),
    });
    expect(gr.status).toBe(200);
    const grTest = await app.request("/api/connectors/granola/test", {
      method: "POST",
      headers: { ...origin, cookie },
      body: "{}",
    });
    expect(grTest.status).toBe(200);

    await app.request(`/api/companies/${companyId}/connector-mapping`, {
      method: "PATCH",
      headers: { ...origin, cookie },
      body: JSON.stringify({ granolaLink: "not_fixture1" }),
    });
    const sync = await runConnectorSync(orgId, "granola", { companyId, fetchImpl: mockVendorFetch });
    expect(sync.status).toBe("connected");
    expect(sync.ingested).toBeGreaterThan(0);
    const inbox = await json<{ items: { kind: string; proposed: { lane?: string } }[] }>(
      await app.request("/api/inbox", { headers: { cookie } }),
    );
    const comment = inbox.items.find((i) => i.kind === "commentary");
    expect(comment?.proposed.lane).toBe("subjective");
  });
});
