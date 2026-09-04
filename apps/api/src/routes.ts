import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  ASK_REFUSAL,
  assertCommentaryLane,
  assertMarkWritable,
  buildMonthlyPackRow,
  buildOnePagerMetrics,
  citationsFrom,
  datedPositionIrr,
  decideAsk,
  documentKindToCommentarySource,
  factOrDash,
  FLAG_CATALOG,
  formatDualDisplay,
  lastCalendarQuarterEnd,
  latestByMetricPeriod,
  metricByKey,
  navBridge,
  defaultPriorAsOf,
  objectiveBook,
  parseFlagPolicyJson,
  refuseUnsourcedDigits,
  resolveFlagThresholds,
  rollupNav,
  runwayMonthsFromBurns,
  seriesFor,
  toEur,
  toInrCrore,
  tokenize,
  toReportMetric,
  xirr,
} from "@venture-os/core";
import { createLlmProvider, MissingLlmKeyError } from "@venture-os/llm";
import {
  invitationExpired,
  isAdminRole,
  loadEnv,
  maskEmail,
  MAX_ORGS_AS_ADMIN,
  ROLES,
  slugifyOrg,
} from "@venture-os/config";
import Redis from "ioredis";
import {
  AskRequestSchema,
  ConfirmInboxSchema,
  CreateCompanySchema,
  CreateFundSchema,
  FlagPolicySchema,
  LockNavPeriodSchema,
  MarkMethodSchema,
  ReportKindSchema,
  UnlockNavPeriodSchema,
  UpdateCompanySchema,
} from "@venture-os/schema";
import {
  askQueries,
  commentary,
  companies,
  connectors,
  createObjectStore,
  documents,
  flagEvents,
  funds,
  getDb,
  inboxItems,
  invitation,
  marks,
  member,
  metricValues,
  navPeriodLocks,
  orgSettings,
  organization,
  parseJobs,
  positions,
  reports,
  runFlagJob,
  runParseJob,
  sha256,
  sourceRefs,
  user,
  withOrg,
} from "@venture-os/db";
import { auth } from "./auth.js";
import { canConfirm, HttpError, requireAdmin, requireLock, requireOrg, requireUser, requireWrite } from "./context.js";
import { enqueueFlags, enqueueParse, enqueueReport } from "./queues.js";
import { buildExports } from "./reports-export.js";

export const routes = new Hono();

async function pingRedis(): Promise<"up" | "down"> {
  const env = loadEnv();
  const r = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  r.on("error", () => {
    /* ping result is enough; avoid unhandled error logs when Redis is down */
  });
  try {
    await r.connect();
    const pong = await r.ping();
    return pong === "PONG" ? "up" : "down";
  } catch {
    return "down";
  } finally {
    r.disconnect();
  }
}

routes.get("/health", async (c) => {
  let postgres = "down";
  let redis: "up" | "down" = "down";
  try {
    await getDb().execute(sql`select 1`);
    postgres = "up";
  } catch {
    postgres = "down";
  }
  redis = await pingRedis();
  const env = loadEnv();
  const gitSha = env.GIT_SHA || process.env.GIT_SHA || process.env.GITHUB_SHA || "unknown";
  const ready = postgres === "up" && redis === "up";
  return c.json({
    ok: postgres === "up",
    ready,
    postgres,
    redis,
    gitSha,
    service: "api",
  });
});

routes.get("/api/me", async (c) => {
  const s = c.get("session");
  if (!s?.user?.id) return c.json({ user: null, org: null, role: null, orgId: null, needsOrg: false });
  const db = getDb();
  let org = null;
  if (s.orgId) {
    const rows = await db.select().from(organization).where(eq(organization.id, s.orgId));
    org = rows[0] ?? null;
  }
  return c.json({
    user: s.user,
    org,
    role: s.role,
    orgId: s.orgId,
    needsOrg: !s.orgId,
  });
});

routes.get("/api/orgs", async (c) => {
  const s = requireUser(c);
  const db = getDb();
  const rows = await db.select().from(member).where(eq(member.userId, s.user.id));
  const ids = rows.map((r) => r.organizationId);
  const orgs = ids.length
    ? await db.select().from(organization).where(inArray(organization.id, ids))
    : [];
  return c.json({
    orgs: orgs.map((o) => ({
      ...o,
      role: rows.find((r) => r.organizationId === o.id)?.role,
      fixtureOnly: o.metadata?.includes("fixtureOnly"),
    })),
  });
});

routes.post("/api/orgs", async (c) => {
  const s = requireUser(c);
  const existing = await getDb().select().from(member).where(eq(member.userId, s.user.id));
  const adminCount = existing.filter((m) => isAdminRole(m.role)).length;
  if (adminCount >= MAX_ORGS_AS_ADMIN) throw new HttpError(400, "org_create_cap");
  const body = await c.req.json<{ name?: string; slug?: string }>();
  const name = (body.name ?? "").trim();
  if (!name) throw new HttpError(400, "org_name_required");
  let slug = (body.slug ?? slugifyOrg(name)).trim();
  if (!slug) slug = `org-${Date.now().toString(36)}`;
  try {
    const created = await auth.api.createOrganization({
      headers: c.req.raw.headers,
      body: { name, slug },
    });
    await auth.api.setActiveOrganization({
      headers: c.req.raw.headers,
      body: { organizationId: created.id },
    });
    return c.json({ org: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "org_create_failed";
    if (/already exists|unique|slug/i.test(msg)) throw new HttpError(409, "org_slug_taken");
    throw new HttpError(400, msg);
  }
});

routes.post("/api/orgs/select", async (c) => {
  const s = requireUser(c);
  const body = await c.req.json<{ organizationId: string }>();
  if (!body.organizationId) throw new HttpError(400, "organization_id_required");
  const db = getDb();
  const [membership] = await db
    .select()
    .from(member)
    .where(and(eq(member.userId, s.user.id), eq(member.organizationId, body.organizationId)));
  if (!membership) throw new HttpError(403, "not_a_member");
  await auth.api.setActiveOrganization({
    headers: c.req.raw.headers,
    body: { organizationId: body.organizationId },
  });
  return c.json({ ok: true, orgId: body.organizationId, role: membership.role });
});

routes.post("/api/logout", async (c) => {
  const s = c.get("session");
  if (s?.user?.id) {
    await auth.api.signOut({ headers: c.req.raw.headers });
  }
  return c.json({ ok: true });
});

routes.get("/api/members", async (c) => {
  const s = requireOrg(c);
  const db = getDb();
  const rows = await db.select().from(member).where(eq(member.organizationId, s.orgId));
  const ids = rows.map((r) => r.userId);
  const users = ids.length ? await db.select().from(user).where(inArray(user.id, ids)) : [];
  return c.json({
    members: rows.map((m) => {
      const u = users.find((x) => x.id === m.userId);
      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        email: u?.email ?? null,
        name: u?.name ?? null,
        createdAt: m.createdAt,
      };
    }),
  });
});

routes.patch("/api/members/:id", async (c) => {
  const s = requireAdmin(c);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { role?: string };
  if (!body.role || !(ROLES as readonly string[]).includes(body.role)) {
    throw new HttpError(400, "invalid_role");
  }
  const db = getDb();
  const rows = await db.select().from(member).where(eq(member.organizationId, s.orgId));
  const target = rows.find((m) => m.id === id);
  if (!target) throw new HttpError(404, "not_found");
  const admins = rows.filter((m) => isAdminRole(m.role));
  if (admins.length === 1 && admins[0]?.id === id && !isAdminRole(body.role)) {
    throw new HttpError(400, "last_admin");
  }
  await db.update(member).set({ role: body.role }).where(eq(member.id, id));
  const [row] = await db.select().from(member).where(eq(member.id, id));
  return c.json({ member: row });
});

routes.delete("/api/members/:id", async (c) => {
  const s = requireAdmin(c);
  const id = c.req.param("id");
  const db = getDb();
  const rows = await db.select().from(member).where(eq(member.organizationId, s.orgId));
  const target = rows.find((m) => m.id === id);
  if (!target) throw new HttpError(404, "not_found");
  const admins = rows.filter((m) => isAdminRole(m.role));
  if (admins.length === 1 && admins[0]?.id === id) throw new HttpError(400, "last_admin");
  if (target.userId === s.user.id && isAdminRole(target.role) && admins.length === 1) {
    throw new HttpError(400, "last_admin");
  }
  await db.delete(member).where(eq(member.id, id));
  return c.json({ ok: true });
});

routes.get("/api/invitations", async (c) => {
  const s = requireAdmin(c);
  const db = getDb();
  const rows = await db.select().from(invitation).where(eq(invitation.organizationId, s.orgId));
  const env = loadEnv();
  return c.json({
    invitations: rows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      expiresAt: i.expiresAt,
      acceptUrl: `${env.WEB_URL}/invite?id=${i.id}`,
    })),
  });
});

routes.get("/api/invitations/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const [row] = await db.select().from(invitation).where(eq(invitation.id, id));
  if (!row) throw new HttpError(404, "invitation_not_found");
  const expired = invitationExpired(row.expiresAt);
  if (expired && row.status === "pending") {
    await db.update(invitation).set({ status: "expired" }).where(eq(invitation.id, id));
  }
  const [org] = await db.select().from(organization).where(eq(organization.id, row.organizationId));
  const session = c.get("session");
  const sessionEmail = session?.user?.email?.toLowerCase();
  const match = Boolean(sessionEmail && sessionEmail === row.email.toLowerCase());
  const status = expired ? "expired" : row.status;
  return c.json({
    invitation: {
      id: row.id,
      emailMasked: maskEmail(row.email),
      email: match ? row.email : undefined,
      canAccept: match && !expired && row.status === "pending",
      role: row.role,
      status,
      expiresAt: row.expiresAt,
      orgName: org?.name ?? "Organisation",
    },
  });
});

routes.post("/api/invitations", async (c) => {
  requireAdmin(c);
  const body = await c.req.json<{ email?: string; role?: string }>();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "analyst";
  if (!email || !email.includes("@")) throw new HttpError(400, "email_required");
  if (!(ROLES as readonly string[]).includes(role)) throw new HttpError(400, "invalid_role");
  try {
    const created = (await auth.api.createInvitation({
      headers: c.req.raw.headers,
      body: { email, role: role as "org_admin" | "partner" | "analyst" | "viewer" },
    })) as { id: string };
    const env = loadEnv();
    return c.json({
      invitation: created,
      acceptUrl: `${env.WEB_URL}/invite?id=${created.id}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invite_failed";
    throw new HttpError(400, msg);
  }
});

routes.post("/api/invitations/:id/accept", async (c) => {
  const s = requireUser(c);
  const id = c.req.param("id");
  const db = getDb();
  const [row] = await db.select().from(invitation).where(eq(invitation.id, id));
  if (!row) throw new HttpError(404, "invitation_not_found");
  if (invitationExpired(row.expiresAt)) {
    if (row.status === "pending") {
      await db.update(invitation).set({ status: "expired" }).where(eq(invitation.id, id));
    }
    throw new HttpError(410, "invitation_expired");
  }
  if (row.status !== "pending") throw new HttpError(400, "invitation_not_pending");
  if (row.email.toLowerCase() !== s.user.email.toLowerCase()) {
    throw new HttpError(403, "invitation_email_mismatch");
  }
  try {
    await auth.api.acceptInvitation({
      headers: c.req.raw.headers,
      body: { invitationId: id },
    });
    await auth.api.setActiveOrganization({
      headers: c.req.raw.headers,
      body: { organizationId: row.organizationId },
    });
    return c.json({ ok: true, orgId: row.organizationId, role: row.role });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "accept_failed";
    throw new HttpError(400, msg);
  }
});

routes.post("/api/invitations/:id/reject", async (c) => {
  const s = requireUser(c);
  const id = c.req.param("id");
  const db = getDb();
  const [row] = await db.select().from(invitation).where(eq(invitation.id, id));
  if (!row) throw new HttpError(404, "invitation_not_found");
  if (row.email.toLowerCase() !== s.user.email.toLowerCase()) {
    throw new HttpError(403, "invitation_email_mismatch");
  }
  try {
    await auth.api.rejectInvitation({
      headers: c.req.raw.headers,
      body: { invitationId: id },
    });
    return c.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "reject_failed";
    throw new HttpError(400, msg);
  }
});

routes.get("/api/funds", async (c) => {
  const s = requireOrg(c);
  const rows = await withOrg(s.orgId, (tx) => tx.select().from(funds));
  return c.json({ funds: rows });
});

routes.post("/api/funds", async (c) => {
  const s = requireWrite(c);
  const body = CreateFundSchema.parse(await c.req.json());
  const [row] = await withOrg(s.orgId, (tx) =>
    tx
      .insert(funds)
      .values({
        orgId: s.orgId,
        name: body.name,
        vintage: body.vintage,
        currency: body.currency ?? "INR",
        committedCapital: body.committedCapital,
      })
      .returning(),
  );
  return c.json({ fund: row });
});

routes.get("/api/companies", async (c) => {
  const s = requireOrg(c);
  const rows = await withOrg(s.orgId, (tx) => tx.select().from(companies));
  return c.json({ companies: rows });
});

routes.post("/api/companies", async (c) => {
  const s = requireWrite(c);
  const body = CreateCompanySchema.parse(await c.req.json());
  const created = await withOrg(s.orgId, async (tx) => {
    const [co] = await tx
      .insert(companies)
      .values({
        orgId: s.orgId,
        name: body.name,
        legalName: body.legalName,
        sector: body.sector,
        stage: body.stage,
        country: body.country,
        fyStartMonth: body.fyStartMonth,
        website: body.website || null,
        unitHint: body.unitHint,
        currencyHint: body.currencyHint,
      })
      .returning();
    let fundId = body.fundId;
    if (!fundId) {
      const existing = await tx.select().from(funds);
      if (existing[0]) fundId = existing[0].id;
      else {
        const [createdFund] = await tx
          .insert(funds)
          .values({ orgId: s.orgId, name: "Main fund", currency: "INR" })
          .returning();
        fundId = createdFund?.id;
      }
    }
    if (fundId) {
      await tx.insert(positions).values({
        orgId: s.orgId,
        fundId,
        companyId: co!.id,
        instrument: "equity",
      });
    }
    return co;
  });
  return c.json({ company: created });
});

routes.get("/api/companies/:id", async (c) => {
  const s = requireOrg(c);
  const id = c.req.param("id");
  const data = await withOrg(s.orgId, async (tx) => {
    const [co] = await tx.select().from(companies).where(eq(companies.id, id));
    if (!co) return null;
    const metrics = await tx
      .select()
      .from(metricValues)
      .where(eq(metricValues.companyId, id))
      .orderBy(desc(metricValues.periodEnd), desc(metricValues.version));
    const notes = await tx.select().from(commentary).where(eq(commentary.companyId, id));
    const docs = await tx.select().from(documents).where(eq(documents.companyId, id));
    const flags = await tx
      .select()
      .from(flagEvents)
      .where(and(eq(flagEvents.companyId, id), eq(flagEvents.status, "open")));
    const docIds = docs.map((d) => d.id);
    const refs = docIds.length
      ? await tx.select().from(sourceRefs).where(inArray(sourceRefs.documentId, docIds))
      : [];
    const cashS = seriesFor(metrics, "cash");
    const burnS = seriesFor(metrics, "burn");
    const cash = cashS[0];
    const burn = burnS[0];
    const r = runwayMonthsFromBurns(
      cash?.valueNumeric ?? null,
      burnS.slice(0, 3).map((b) => b.valueNumeric ?? null),
    );
    const kpi = {
      cash: formatDualDisplay({
        value: cash?.valueNumeric ?? null,
        sourceRefId: cash?.sourceRefId,
        unit: cash?.unit as never,
        currency: cash?.currency as never,
        valueEur: cash?.valueEur ?? null,
        fxRate: cash?.fxRate ?? null,
        fxDate: cash?.fxDate ?? null,
        fxSource: cash?.fxSource ?? null,
      }),
      burn: formatDualDisplay({
        value: burn?.valueNumeric ?? null,
        sourceRefId: burn?.sourceRefId,
        unit: burn?.unit as never,
        currency: burn?.currency as never,
        valueEur: burn?.valueEur ?? null,
        fxRate: burn?.fxRate ?? null,
        fxDate: burn?.fxDate ?? null,
        fxSource: burn?.fxSource ?? null,
      }),
      runway: factOrDash({
        value: r,
        sourceRefId: cash?.sourceRefId && burn?.sourceRefId ? cash.sourceRefId : null,
      }),
    };
    const pos = await tx.select().from(positions).where(eq(positions.companyId, id));
    const fundRows = await tx.select().from(funds);
    const bookedPositions = pos.map((p) => ({
      id: p.id,
      fundId: p.fundId,
      fundName: fundRows.find((f) => f.id === p.fundId)?.name ?? "—",
      instrument: p.instrument,
      ownershipPct: p.ownershipPct,
      costBasis: p.costBasis,
      costCurrency: p.costCurrency,
      investedAt: p.investedAt,
    }));
    return {
      company: co,
      metrics,
      commentary: notes,
      documents: docs,
      flags,
      sourceRefs: refs,
      kpi,
      positions: bookedPositions,
    };
  });
  if (!data) throw new HttpError(404, "company_not_found");
  return c.json(data);
});

routes.patch("/api/companies/:id", async (c) => {
  const s = requireWrite(c);
  const id = c.req.param("id");
  const body = UpdateCompanySchema.parse(await c.req.json());
  const row = await withOrg(s.orgId, async (tx) => {
    const [existing] = await tx.select().from(companies).where(eq(companies.id, id));
    if (!existing) return null;
    const [updated] = await tx
      .update(companies)
      .set({
        name: body.name ?? existing.name,
        legalName: body.legalName ?? existing.legalName,
        sector: body.sector ?? existing.sector,
        stage: body.stage ?? existing.stage,
        country: body.country ?? existing.country,
        fyStartMonth: body.fyStartMonth ?? existing.fyStartMonth,
        website: body.website === undefined ? existing.website : body.website || null,
        unitHint: body.unitHint ?? existing.unitHint,
        currencyHint: body.currencyHint ?? existing.currencyHint,
      })
      .where(eq(companies.id, id))
      .returning();
    return updated;
  });
  if (!row) throw new HttpError(404, "company_not_found");
  return c.json({ company: row });
});

routes.post("/api/companies/:id/documents", async (c) => {
  const s = requireWrite(c);
  const companyId = c.req.param("id");
  const form = await c.req.parseBody();
  const file = form["file"];
  if (!(file instanceof File)) throw new HttpError(400, "file_required");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!buf.length) throw new HttpError(400, "empty_file");
  if (buf.length > 25 * 1024 * 1024) throw new HttpError(400, "file_too_large");
  const name = file.name.toLowerCase();
  if (![".xlsx", ".xls", ".csv", ".pdf"].some((ext) => name.endsWith(ext))) {
    throw new HttpError(400, "unsupported_type");
  }
  const kind = String(form["kind"] ?? "mis");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  const digest = sha256(buf);
  const key = `${s.orgId}/${companyId}/${Date.now()}-${safeName}`;
  const store = createObjectStore();
  await store.put(key, buf, file.type || "application/octet-stream");
  const { doc, duplicateOf } = await withOrg(s.orgId, async (tx) => {
    const [prior] = await tx.select().from(documents).where(eq(documents.sha256, digest));
    const [row] = await tx
      .insert(documents)
      .values({
        orgId: s.orgId,
        companyId,
        kind,
        filename: safeName,
        storageKey: key,
        mime: file.type || "application/octet-stream",
        sha256: digest,
        uploadedBy: s.user.id,
      })
      .returning();
    return { doc: row, duplicateOf: prior && prior.id !== row?.id ? prior.id : null };
  });
  const mode = await enqueueParse(s.orgId, doc!.id);
  return c.json({ document: doc, parse: mode, duplicateOf });
});

routes.get("/api/documents", async (c) => {
  const s = requireOrg(c);
  const data = await withOrg(s.orgId, async (tx) => {
    const rows = await tx.select().from(documents);
    const jobs = await tx.select().from(parseJobs);
    const cos = await tx.select().from(companies);
    return rows.map((d) => {
      const job = jobs.filter((j) => j.documentId === d.id).sort((a, b) => {
        const at = a.startedAt?.getTime() ?? 0;
        const bt = b.startedAt?.getTime() ?? 0;
        return bt - at;
      })[0];
      return {
        ...d,
        companyName: cos.find((x) => x.id === d.companyId)?.name ?? null,
        parseStatus: job?.status ?? "queued",
        parseError: job?.error ?? null,
      };
    });
  });
  return c.json({ documents: data });
});

routes.get("/api/documents/:id", async (c) => {
  const s = requireOrg(c);
  const id = c.req.param("id");
  const data = await withOrg(s.orgId, async (tx) => {
    const [doc] = await tx.select().from(documents).where(eq(documents.id, id));
    if (!doc) return null;
    const jobs = await tx.select().from(parseJobs).where(eq(parseJobs.documentId, id));
    const job = jobs.sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))[0] ?? null;
    return { document: doc, parse: job };
  });
  if (!data) throw new HttpError(404, "not_found");
  return c.json(data);
});

routes.get("/api/documents/:id/file", async (c) => {
  const s = requireOrg(c);
  const id = c.req.param("id");
  const doc = await withOrg(s.orgId, async (tx) => {
    const [row] = await tx.select().from(documents).where(eq(documents.id, id));
    return row;
  });
  if (!doc) throw new HttpError(404, "not_found");
  const buf = await createObjectStore().get(doc.storageKey);
  return new Response(buf, {
    headers: {
      "content-type": doc.mime,
      "content-disposition": `inline; filename="${doc.filename}"`,
    },
  });
});

routes.get("/api/inbox", async (c) => {
  const s = requireOrg(c);
  const status = c.req.query("status") ?? "pending";
  const rows = await withOrg(s.orgId, async (tx) => {
    const items = await tx
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.orgId, s.orgId), eq(inboxItems.status, status)))
      .orderBy(desc(inboxItems.createdAt));
    const cos = await tx.select().from(companies);
    return items.map((i) => ({
      ...i,
      companyName: cos.find((x) => x.id === i.companyId)?.name ?? null,
    }));
  });
  return c.json({ items: rows });
});

routes.post("/api/inbox/:id/confirm", async (c) => {
  const s = requireWrite(c);
  if (!canConfirm(s.role)) throw new HttpError(403, "cannot_confirm");
  const id = c.req.param("id");
  const patch = ConfirmInboxSchema.parse(await c.req.json().catch(() => ({})));
  const result = await withOrg(s.orgId, async (tx) => {
    const [item] = await tx.select().from(inboxItems).where(eq(inboxItems.id, id));
    if (!item || item.status !== "pending") throw new HttpError(404, "inbox_item_not_pending");
    const proposed = item.proposed as Record<string, unknown>;
    if (item.kind === "commentary") {
      const [doc] = item.documentId
        ? await tx.select().from(documents).where(eq(documents.id, item.documentId))
        : [];
      const lane = (patch.lane ?? proposed.lane ?? "objective") as "objective" | "subjective";
      const sourceKind = documentKindToCommentarySource(doc?.kind);
      const gate = assertCommentaryLane(lane, sourceKind);
      if (!gate.ok) throw new HttpError(400, gate.code);
      const periodStart = String(patch.periodStart ?? proposed.periodStart ?? "");
      const periodEnd = String(patch.periodEnd ?? proposed.periodEnd ?? "");
      if (!periodStart || !periodEnd) throw new HttpError(400, "period_required");
      await tx.insert(commentary).values({
        orgId: s.orgId,
        companyId: item.companyId!,
        periodStart,
        periodEnd,
        lane,
        body: String(proposed.body ?? proposed.excerpt ?? ""),
        sourceRefId: item.sourceRefId,
        createdBy: s.user.id,
      });
    } else {
      const metricKey = String(patch.metricKey ?? proposed.metricKey ?? "");
      if (!metricKey) throw new HttpError(400, "metric_key_required");
      const valueNumeric =
        patch.valueNumeric !== undefined ? patch.valueNumeric : (proposed.valueNumeric as number | null);
      const unit = (patch.unit ?? proposed.unit ?? "unknown") as string;
      const currency = (patch.currency ?? proposed.currency ?? "unknown") as string;
      const periodStart = String(patch.periodStart ?? proposed.periodStart ?? "");
      const periodEnd = String(patch.periodEnd ?? proposed.periodEnd ?? "");
      if (!periodStart || !periodEnd) throw new HttpError(400, "period_required");
      if ((item.kind === "unit_ambiguity" || unit === "unknown") && !patch.unit) {
        throw new HttpError(400, "unit_must_be_set_by_human");
      }
      if (!item.sourceRefId) throw new HttpError(400, "no_source_ref");
      const existing = await tx
        .select()
        .from(metricValues)
        .where(
          and(
            eq(metricValues.companyId, item.companyId!),
            eq(metricValues.metricKey, metricKey),
            eq(metricValues.periodStart, periodStart),
            eq(metricValues.periodEnd, periodEnd),
          ),
        )
        .orderBy(desc(metricValues.version));
      const version = (existing[0]?.version ?? 0) + 1;
      const restatementOfId = existing[0]?.id ?? null;
      const fxRate = (proposed.fxRate as number | undefined) ?? null;
      const fxDate = (proposed.fxDate as string | undefined) ?? null;
      const fxSource = (proposed.fxSource as string | undefined) ?? null;
      const fx =
        fxRate && fxDate && fxSource ? { fxRate, fxDate, fxSource } : null;
      await tx.insert(metricValues).values({
        orgId: s.orgId,
        companyId: item.companyId!,
        metricKey,
        periodStart,
        periodEnd,
        grain: String(patch.grain ?? proposed.grain ?? "month"),
        valueNumeric,
        unit,
        currency,
        valueInrCrore: toInrCrore(valueNumeric, unit as never, currency as never),
        valueEur: toEur(valueNumeric, currency as never, fx),
        fxRate: fx?.fxRate ?? null,
        fxDate: fx?.fxDate ?? null,
        fxSource: fx?.fxSource ?? null,
        sourceRefId: item.sourceRefId,
        restatementOfId,
        version,
        lane: (patch.lane ?? "objective") as string,
        confirmedBy: s.user.id,
        inboxItemId: item.id,
      });
      if (patch.note && existing[0] && patch.valueNumeric !== proposed.valueNumeric) {
        const { corrections } = await import("@venture-os/db");
        await tx.insert(corrections).values({
          orgId: s.orgId,
          companyId: item.companyId!,
          metricKey,
          periodStart,
          periodEnd,
          patchedValue: valueNumeric,
          patchedUnit: unit,
          patchedCurrency: currency,
          reason: patch.note,
          actorUserId: s.user.id,
          active: true,
        });
      }
    }
    await tx
      .update(inboxItems)
      .set({
        status: patch.valueNumeric !== undefined || patch.unit ? "edited" : "confirmed",
        reviewedBy: s.user.id,
        reviewedAt: new Date(),
      })
      .where(eq(inboxItems.id, id));
    return { ok: true };
  });
  if (result.ok) await enqueueFlags(s.orgId);
  return c.json(result);
});

routes.post("/api/inbox/:id/reject", async (c) => {
  const s = requireWrite(c);
  const id = c.req.param("id");
  await withOrg(s.orgId, (tx) =>
    tx
      .update(inboxItems)
      .set({ status: "rejected", reviewedBy: s.user.id, reviewedAt: new Date() })
      .where(eq(inboxItems.id, id)),
  );
  return c.json({ ok: true });
});

routes.get("/api/command", async (c) => {
  const s = requireOrg(c);
  const data = await withOrg(s.orgId, async (tx) => {
    const cos = await tx.select().from(companies);
    const inbox = await tx.select().from(inboxItems).where(eq(inboxItems.status, "pending"));
    const flags = await tx.select().from(flagEvents).where(eq(flagEvents.status, "open"));
    const metrics = await tx.select().from(metricValues);
    const pos = await tx.select().from(positions);
    const mk = await tx.select().from(marks);
    const fundRows = await tx.select().from(funds);
    const refs = await tx.select().from(sourceRefs);

    const coverage = cos.map((co) => {
      const cm = metrics.filter((m) => m.companyId === co.id);
      const cashS = seriesFor(cm, "cash");
      const burnS = seriesFor(cm, "burn");
      const cash = cashS[0];
      const burn = burnS[0];
      const p = pos.find((x) => x.companyId === co.id);
      const mark = p ? mk.filter((m) => m.positionId === p.id).sort((a, b) => (a.asOf < b.asOf ? 1 : -1))[0] : null;
      const r = runwayMonthsFromBurns(
        cash?.valueNumeric ?? null,
        burnS.slice(0, 3).map((b) => b.valueNumeric ?? null),
      );
      return {
        company: co,
        cash: formatDualDisplay({
          value: cash?.valueNumeric ?? null,
          sourceRefId: cash?.sourceRefId,
          unit: cash?.unit as never,
          currency: cash?.currency as never,
          valueEur: cash?.valueEur ?? null,
          fxRate: cash?.fxRate ?? null,
          fxDate: cash?.fxDate ?? null,
          fxSource: cash?.fxSource ?? null,
        }),
        burn: formatDualDisplay({
          value: burn?.valueNumeric ?? null,
          sourceRefId: burn?.sourceRefId,
          unit: burn?.unit as never,
          currency: burn?.currency as never,
          valueEur: burn?.valueEur ?? null,
          fxRate: burn?.fxRate ?? null,
          fxDate: burn?.fxDate ?? null,
          fxSource: burn?.fxSource ?? null,
        }),
        runway: factOrDash({
          value: r,
          sourceRefId: cash?.sourceRefId && burn?.sourceRefId ? cash.sourceRefId : null,
        }),
        lastMis: cash?.periodEnd ?? latestByMetricPeriod(cm)[0]?.periodEnd ?? null,
        ownershipPct: p?.ownershipPct ?? null,
        lastMark: mark?.value ?? null,
        lastMarkAsOf: mark?.asOf ?? null,
        lastMarkSource: mark?.sourceRefId ?? null,
        openFlags: flags.filter((f) => f.companyId === co.id).length,
      };
    });

    const navRows = pos.map((p) => {
      const mark = mk.filter((m) => m.positionId === p.id).sort((a, b) => (a.asOf < b.asOf ? 1 : -1))[0];
      const co = cos.find((x) => x.id === p.companyId);
      return {
        positionId: p.id,
        companyId: p.companyId,
        companyName: co?.name ?? "—",
        cost: p.costBasis ?? null,
        mark: mark?.value ?? null,
        markAsOf: mark?.asOf ?? null,
        sourceRefId: mark?.sourceRefId ?? null,
      };
    });
    const asOf = new Date().toISOString().slice(0, 10);
    const rollup = rollupNav(asOf, navRows);

    return {
      pulse: {
        companies: cos.length,
        inboxPending: inbox.length,
        openFlags: flags.length,
        funds: fundRows.length,
        nav: rollup,
        moic: rollup.moic,
      },
      needsALook: {
        flags: flags.slice(0, 20).map((f) => ({
          id: f.id,
          flagKey: f.flagKey,
          severity: f.severity,
          companyId: f.companyId,
          companyName: cos.find((x) => x.id === f.companyId)?.name ?? "—",
        })),
        inbox: inbox.slice(0, 20).map((i) => ({
          id: i.id,
          companyId: i.companyId,
          companyName: cos.find((x) => x.id === i.companyId)?.name ?? "—",
          kind: i.kind,
        })),
      },
      coverage,
      sourceRefs: refs,
    };
  });
  return c.json(data);
});

routes.get("/api/flags", async (c) => {
  const s = requireOrg(c);
  const status = c.req.query("status") ?? "open";
  const severity = c.req.query("severity") ?? "";
  const companyId = c.req.query("companyId") ?? "";
  const flagKey = c.req.query("flagKey") ?? "";
  const allowed = ["open", "snoozed", "muted", "cleared", "all"];
  if (!allowed.includes(status)) throw new HttpError(400, "invalid_status");
  const data = await withOrg(s.orgId, async (tx) => {
    const flags =
      status === "all"
        ? await tx.select().from(flagEvents)
        : await tx.select().from(flagEvents).where(eq(flagEvents.status, status));
    const cos = await tx.select().from(companies);
    const refs = await tx.select().from(sourceRefs);
    const filtered = flags.filter((f) => {
      if (severity && f.severity !== severity) return false;
      if (companyId && f.companyId !== companyId) return false;
      if (flagKey && f.flagKey !== flagKey) return false;
      return true;
    });
    return {
      flags: filtered.map((f) => ({ ...f, companyName: cos.find((co) => co.id === f.companyId)?.name })),
      companies: cos.map((co) => ({ id: co.id, name: co.name })),
      catalog: FLAG_CATALOG,
      policy: resolveFlagThresholds(parseFlagPolicyJson((await tx.select().from(orgSettings))[0]?.flagPolicy)),
      sourceRefs: refs.map((r) => ({ id: r.id, documentId: r.documentId })),
    };
  });
  return c.json(data);
});

routes.post("/api/flags/refresh", async (c) => {
  const s = requireWrite(c);
  const result = await runFlagJob(s.orgId);
  return c.json(result);
});

routes.post("/api/flags/:id/snooze", async (c) => {
  const s = requireWrite(c);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { until?: string; note?: string };
  const until = body.until ? new Date(body.until) : new Date(Date.now() + 14 * 86400000);
  const row = await withOrg(s.orgId, async (tx) => {
    await tx
      .update(flagEvents)
      .set({ status: "snoozed", snoozedUntil: until, note: body.note ?? null })
      .where(eq(flagEvents.id, id));
    const [f] = await tx.select().from(flagEvents).where(eq(flagEvents.id, id));
    return f;
  });
  if (!row) throw new HttpError(404, "not_found");
  return c.json({ flag: row });
});

routes.post("/api/flags/:id/mute", async (c) => {
  const s = requireWrite(c);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { note?: string };
  const row = await withOrg(s.orgId, async (tx) => {
    await tx
      .update(flagEvents)
      .set({ status: "muted", note: body.note ?? null })
      .where(eq(flagEvents.id, id));
    const [f] = await tx.select().from(flagEvents).where(eq(flagEvents.id, id));
    return f;
  });
  if (!row) throw new HttpError(404, "not_found");
  return c.json({ flag: row });
});

routes.post("/api/flags/:id/unmute", async (c) => {
  const s = requireWrite(c);
  const id = c.req.param("id");
  const row = await withOrg(s.orgId, async (tx) => {
    await tx
      .update(flagEvents)
      .set({ status: "open", snoozedUntil: null })
      .where(eq(flagEvents.id, id));
    const [f] = await tx.select().from(flagEvents).where(eq(flagEvents.id, id));
    return f;
  });
  if (!row) throw new HttpError(404, "not_found");
  return c.json({ flag: row });
});

routes.get("/api/nav", async (c) => {
  const s = requireOrg(c);
  const asOf = c.req.query("asOf") ?? lastCalendarQuarterEnd();
  const priorAsOf = c.req.query("priorAsOf") ?? defaultPriorAsOf(asOf);
  const fundId = c.req.query("fundId") ?? "";
  const data = await withOrg(s.orgId, async (tx) => {
    const posAll = await tx.select().from(positions);
    const pos = fundId ? posAll.filter((p) => p.fundId === fundId) : posAll;
    const mk = await tx.select().from(marks);
    const cos = await tx.select().from(companies);
    const fundRows = await tx.select().from(funds);
    const refs = await tx.select().from(sourceRefs);
    const rows = pos.map((p) => {
      const history = mk.filter((m) => m.positionId === p.id).sort((a, b) => (a.asOf < b.asOf ? 1 : -1));
      const mark = history.find((m) => m.asOf <= asOf);
      const prior = history.find((m) => m.asOf <= priorAsOf);
      const co = cos.find((x) => x.id === p.companyId);
      const irr = datedPositionIrr({
        investedAt: p.investedAt,
        cost: p.costBasis ?? null,
        mark: mark?.value ?? null,
        markAsOf: mark?.asOf ?? null,
      });
      return {
        position: p,
        companyName: co?.name ?? "—",
        fundName: fundRows.find((f) => f.id === p.fundId)?.name ?? "—",
        cost: p.costBasis ?? null,
        mark: mark?.value ?? null,
        markAsOf: mark?.asOf ?? null,
        method: mark?.method ?? null,
        rationale: mark?.rationale ?? null,
        sourceRefId: mark?.sourceRefId ?? null,
        priorMark: prior?.value ?? null,
        priorMarkAsOf: prior?.asOf ?? null,
        irr,
      };
    });
    const currentMarks = rows.map((r) => ({
      positionId: r.position.id,
      companyId: r.position.companyId,
      companyName: r.companyName,
      cost: r.cost,
      mark: r.mark,
      markAsOf: r.markAsOf,
      sourceRefId: r.sourceRefId,
    }));
    const priorMarks = rows.map((r) => ({
      positionId: r.position.id,
      companyId: r.position.companyId,
      companyName: r.companyName,
      cost: r.cost,
      mark: r.priorMark,
      markAsOf: r.priorMarkAsOf,
      sourceRefId: r.sourceRefId,
    }));
    const rollup = rollupNav(asOf, currentMarks);
    const bridge = navBridge(asOf, currentMarks, priorMarks);
    const provenanced = rows.filter((r) => r.mark != null && r.sourceRefId);
    const dated = provenanced.filter((r) => r.position.investedAt && r.markAsOf && r.cost != null);
    const headlineIrr =
      provenanced.length > 0 && dated.length === provenanced.length
        ? xirr(
            dated.flatMap((r) => [
              { date: new Date(`${r.position.investedAt}T00:00:00Z`), amount: -Math.abs(r.cost ?? 0) },
              { date: new Date(`${r.markAsOf}T00:00:00Z`), amount: r.mark ?? 0 },
            ]),
          )
        : null;
    return {
      asOf,
      priorAsOf,
      rollup,
      bridge,
      positions: rows,
      moic: rollup.moic,
      irr: headlineIrr,
      funds: fundRows.map((f) => ({ id: f.id, name: f.name, currency: f.currency })),
      sourceRefs: refs.map((r) => ({ id: r.id, documentId: r.documentId })),
      documents: (await tx.select().from(documents)).map((d) => ({
        id: d.id,
        filename: d.filename,
        kind: d.kind,
        companyId: d.companyId,
      })),
      period: await loadNavPeriod(tx, asOf),
    };
  });
  return c.json(data);
});

async function loadNavPeriod(tx: Parameters<Parameters<typeof withOrg>[1]>[0], asOf: string) {
  const [lock] = await tx.select().from(navPeriodLocks).where(eq(navPeriodLocks.asOf, asOf));
  return {
    asOf,
    status: lock?.status ?? "unofficial",
    lockedBy: lock?.lockedBy ?? null,
    lockedAt: lock?.lockedAt ?? null,
    unlockReason: lock?.unlockReason ?? null,
    unlockedBy: lock?.unlockedBy ?? null,
    unlockedAt: lock?.unlockedAt ?? null,
  };
}

routes.post("/api/nav/lock", async (c) => {
  const s = requireLock(c);
  const parsed = LockNavPeriodSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, "invalid_as_of");
  const asOf = parsed.data.asOf;
  const period = await withOrg(s.orgId, async (tx) => {
    const [existing] = await tx.select().from(navPeriodLocks).where(eq(navPeriodLocks.asOf, asOf));
    if (existing) {
      await tx
        .update(navPeriodLocks)
        .set({
          status: "locked",
          lockedBy: s.user.id,
          lockedAt: new Date(),
          unlockReason: null,
          unlockedBy: null,
          unlockedAt: null,
        })
        .where(eq(navPeriodLocks.id, existing.id));
    } else {
      await tx.insert(navPeriodLocks).values({
        orgId: s.orgId,
        asOf,
        status: "locked",
        lockedBy: s.user.id,
        lockedAt: new Date(),
      });
    }
    return loadNavPeriod(tx, asOf);
  });
  return c.json({ period });
});

routes.post("/api/nav/unlock", async (c) => {
  const s = requireLock(c);
  const parsed = UnlockNavPeriodSchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, "unlock_reason_required");
  const { asOf, reason } = parsed.data;
  const period = await withOrg(s.orgId, async (tx) => {
    const [existing] = await tx.select().from(navPeriodLocks).where(eq(navPeriodLocks.asOf, asOf));
    if (!existing || existing.status !== "locked") throw new HttpError(409, "period_not_locked");
    await tx
      .update(navPeriodLocks)
      .set({
        status: "unofficial",
        unlockReason: reason,
        unlockedBy: s.user.id,
        unlockedAt: new Date(),
      })
      .where(eq(navPeriodLocks.id, existing.id));
    return loadNavPeriod(tx, asOf);
  });
  return c.json({ period });
});

routes.post("/api/nav/marks", async (c) => {
  const s = requireWrite(c);
  const body = await c.req.json<{
    positionId: string;
    asOf: string;
    method?: string;
    value: number | null;
    currency?: string;
    rationale?: string;
    sourceRefId?: string;
    documentId?: string;
    fxRate?: number;
    fxDate?: string;
    fxSource?: string;
  }>();
  const methodParsed = MarkMethodSchema.safeParse(body.method ?? "last_round");
  if (!methodParsed.success) throw new HttpError(400, "invalid_mark_method");
  const row = await withOrg(s.orgId, async (tx) => {
    const [lock] = await tx.select().from(navPeriodLocks).where(eq(navPeriodLocks.asOf, body.asOf));
    const gate = assertMarkWritable(lock?.status ?? "unofficial");
    if (!gate.ok) throw new HttpError(409, "period_locked");
    let sourceRefId = body.sourceRefId ?? null;
    if (!sourceRefId && body.documentId) {
      const [doc] = await tx.select().from(documents).where(eq(documents.id, body.documentId));
      if (!doc) throw new HttpError(404, "document_not_found");
      const [ref] = await tx
        .insert(sourceRefs)
        .values({
          orgId: s.orgId,
          documentId: doc.id,
          locator: { kind: "file" },
          excerpt: doc.filename,
        })
        .returning();
      sourceRefId = ref?.id ?? null;
    }
    const [m] = await tx
      .insert(marks)
      .values({
        orgId: s.orgId,
        positionId: body.positionId,
        asOf: body.asOf,
        method: methodParsed.data,
        value: body.value,
        currency: body.currency ?? "INR",
        rationale: body.rationale,
        sourceRefId,
        fxRate: body.fxRate,
        fxDate: body.fxDate,
        fxSource: body.fxSource,
        createdBy: s.user.id,
      })
      .returning();
    return m;
  });
  return c.json({ mark: row });
});

routes.get("/api/compare", async (c) => {
  const s = requireOrg(c);
  const keys = (c.req.query("metrics") ?? "net_revenue,cash,burn,gross_margin_pct,runway_months")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const companyIdsRaw = c.req.query("companyIds");
  const companyIds =
    companyIdsRaw === undefined
      ? null
      : companyIdsRaw
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
  const periodEnd = c.req.query("periodEnd") ?? "";
  const stage = c.req.query("stage") ?? "";
  const sector = c.req.query("sector") ?? "";
  const data = await withOrg(s.orgId, async (tx) => {
    const allCos = await tx.select().from(companies);
    const cos = allCos.filter((co) => {
      if (companyIds !== null && !companyIds.includes(co.id)) return false;
      if (stage && (co.stage ?? "") !== stage) return false;
      if (sector && (co.sector ?? "") !== sector) return false;
      return true;
    });
    const metrics = await tx.select().from(metricValues);
    const refs = await tx.select().from(sourceRefs);
    const matrix = cos.map((co) => {
      const cells: Record<
        string,
        ReturnType<typeof factOrDash> & { periodEnd?: string | null; sourceRefId?: string | null; inrCrore?: number | null }
      > = {};
      const cm = objectiveBook(metrics.filter((m) => m.companyId === co.id));
      for (const key of keys) {
        if (key === "runway_months") {
          const cashS = seriesFor(cm, "cash");
          const burnS = seriesFor(cm, "burn");
          const cash = periodEnd ? cashS.find((m) => m.periodEnd === periodEnd) : cashS[0];
          const r = runwayMonthsFromBurns(
            cash?.valueNumeric ?? null,
            burnS.slice(0, 3).map((b) => b.valueNumeric ?? null),
          );
          cells[key] = {
            ...factOrDash({
              value: r,
              sourceRefId: cash?.sourceRefId && burnS[0]?.sourceRefId ? cash.sourceRefId : null,
            }),
            periodEnd: cash?.periodEnd,
            sourceRefId: cash?.sourceRefId ?? null,
          };
          continue;
        }
        const series = seriesFor(cm, key);
        const m = periodEnd ? series.find((x) => x.periodEnd === periodEnd) : series[0];
        cells[key] = {
          ...formatDualDisplay({
            value: m?.valueNumeric ?? null,
            sourceRefId: m?.sourceRefId,
            unit: m?.unit as never,
            currency: m?.currency as never,
            valueEur: m?.valueEur ?? null,
            fxRate: m?.fxRate ?? null,
            fxDate: m?.fxDate ?? null,
            fxSource: m?.fxSource ?? null,
          }),
          periodEnd: m?.periodEnd,
          inrCrore: toInrCrore(m?.valueNumeric ?? null, (m?.unit ?? "unknown") as never, (m?.currency ?? "unknown") as never),
        };
      }
      return { company: co, cells };
    });
    const periods = [...new Set(metrics.map((m) => m.periodEnd))].sort().reverse();
    return {
      metrics: keys,
      labels: Object.fromEntries(keys.map((k) => [k, metricByKey(k)?.label ?? k.replaceAll("_", " ")])),
      matrix,
      companies: allCos.map((co) => ({ id: co.id, name: co.name, stage: co.stage, sector: co.sector })),
      stages: [...new Set(allCos.map((co) => co.stage).filter((x): x is string => Boolean(x)))].sort(),
      sectors: [...new Set(allCos.map((co) => co.sector).filter((x): x is string => Boolean(x)))].sort(),
      periods,
      sourceRefs: refs.map((r) => ({ id: r.id, documentId: r.documentId })),
    };
  });
  return c.json(data);
});

routes.post("/api/ask", async (c) => {
  const s = requireOrg(c);
  const body = AskRequestSchema.parse(await c.req.json());
  const tokens = tokenize(body.question);
  const tsQuery =
    tokens
      .map((t) => t.replace(/[^a-z0-9]/gi, ""))
      .filter((t) => t.length > 1)
      .join(" | ") || "venture";
  let evidence = await withOrg(s.orgId, async (tx) => {
    let chunkRows: { document_id: string; source_ref_id: string | null; body: string; rank: number }[] = [];
    try {
      const companyClause = body.companyId
        ? sql`and document_id in (select id from documents where company_id = ${body.companyId} and org_id = ${s.orgId})`
        : sql``;
      const chunks = await tx.execute(sql`
        select id, document_id, source_ref_id, body,
               ts_rank(tsv, to_tsquery('english', ${tsQuery})) as rank
        from document_chunks
        where org_id = ${s.orgId}
          and tsv @@ to_tsquery('english', ${tsQuery})
          ${companyClause}
        order by rank desc
        limit 8
      `);
      chunkRows =
        (chunks as unknown as { document_id: string; source_ref_id: string | null; body: string; rank: number }[]) ?? [];
    } catch {
      chunkRows = [];
    }
    const facts = await tx.select().from(metricValues);
    const refs = await tx.select().from(sourceRefs);
    const factHits = facts
      .filter((f) => {
        if (body.companyId && f.companyId !== body.companyId) return false;
        return tokens.some((t) => f.metricKey.includes(t) || String(f.valueNumeric ?? "").includes(t));
      })
      .slice(0, 8)
      .map((f) => {
        const ref = refs.find((r) => r.id === f.sourceRefId);
        return {
          sourceRefId: f.sourceRefId,
          documentId: ref?.documentId ?? "",
          excerpt: `${f.metricKey} ${f.valueNumeric ?? "—"} ${f.unit} ${f.currency} ${f.periodStart}–${f.periodEnd}`,
        };
      })
      .filter((f) => f.documentId);
    return {
      chunks: chunkRows.map((r) => ({
        documentId: r.document_id,
        sourceRefId: r.source_ref_id,
        excerpt: r.body,
        rank: Number(r.rank ?? 0),
      })),
      facts: factHits,
    };
  });

  const decision = decideAsk(evidence, tokens);
  if (!decision.ok) {
    const refused = {
      answer: ASK_REFUSAL,
      refused: true,
      citations: [],
    };
    await withOrg(s.orgId, (tx) =>
      tx.insert(askQueries).values({
        orgId: s.orgId,
        question: body.question,
        answer: refused.answer,
        refused: true,
        citations: [],
        createdBy: s.user.id,
      }),
    );
    return c.json(refused);
  }

  const cites = citationsFrom(decision.evidence);
  const context = [
    ...decision.evidence.facts.map((f) => f.excerpt),
    ...decision.evidence.chunks.map((ch) => ch.excerpt),
  ].join("\n---\n");

  let answer = `From the book:\n${context.slice(0, 2000)}`;
  try {
    const llm = createLlmProvider();
    const res = await llm.complete({
      messages: [
        {
          role: "system",
          content:
            "You are Venture OS Ask. Answer only from EVIDENCE. If a number is not in evidence, refuse. Cite metric keys and locators. Never invent companies or rupees. Objective vs subjective: do not blend.",
        },
        { role: "user", content: `QUESTION: ${body.question}\n\nEVIDENCE:\n${context}` },
      ],
    });
    answer = res.text;
  } catch (err) {
    if (!(err instanceof MissingLlmKeyError)) throw err;
    // Key missing: still return grounded extract, not an invention.
  }

  const grounded = refuseUnsourcedDigits(answer, context);
  if (!grounded.ok) {
    const refused = {
      answer: ASK_REFUSAL,
      refused: true,
      citations: cites,
    };
    await withOrg(s.orgId, (tx) =>
      tx.insert(askQueries).values({
        orgId: s.orgId,
        question: body.question,
        answer: refused.answer,
        refused: true,
        citations: cites,
        createdBy: s.user.id,
      }),
    );
    return c.json(refused);
  }

  const payload = { answer, refused: false, citations: cites };
  await withOrg(s.orgId, (tx) =>
    tx.insert(askQueries).values({
      orgId: s.orgId,
      question: body.question,
      answer,
      refused: false,
      citations: cites,
      createdBy: s.user.id,
    }),
  );
  return c.json(payload);
});

routes.get("/api/reports", async (c) => {
  const s = requireOrg(c);
  const rows = await withOrg(s.orgId, (tx) => tx.select().from(reports).orderBy(desc(reports.createdAt)));
  return c.json({ reports: rows });
});

routes.post("/api/reports", async (c) => {
  const s = requireWrite(c);
  const body = await c.req.json<{ kind: "one_pager" | "portfolio" | "monthly_pack"; companyId?: string; periodEnd?: string }>();
  const kindParsed = ReportKindSchema.safeParse(body.kind);
  if (!kindParsed.success) throw new HttpError(400, "invalid_report_kind");
  if (body.kind === "one_pager" && !body.companyId) throw new HttpError(400, "company_id_required");
  const pinPeriod = body.periodEnd?.slice(0, 10) || "";
  const draft = await withOrg(s.orgId, async (tx) => {
    const cos = await tx.select().from(companies);
    const metrics = await tx.select().from(metricValues);
    const notes = await tx.select().from(commentary);
    const openFlags = await tx.select().from(flagEvents).where(eq(flagEvents.status, "open"));
    const target = body.companyId ? cos.filter((x) => x.id === body.companyId) : cos;
    const pages = target.map((co) => {
      const raw = objectiveBook(
        metrics.filter((m) => m.companyId === co.id && (!pinPeriod || m.periodEnd === pinPeriod)),
      );
      const curated =
        body.kind === "portfolio" ? latestByMetricPeriod(raw).map(toReportMetric) : buildOnePagerMetrics(raw);
      const obj = notes.filter((n) => n.companyId === co.id && n.lane === "objective" && (!pinPeriod || n.periodEnd === pinPeriod));
      const sub = notes.filter((n) => n.companyId === co.id && n.lane === "subjective" && (!pinPeriod || n.periodEnd === pinPeriod));
      const flags = openFlags
        .filter((f) => f.companyId === co.id)
        .map((f) => ({
          flagKey: f.flagKey,
          severity: f.severity,
          label: FLAG_CATALOG.find((c) => c.key === f.flagKey)?.label ?? f.flagKey,
        }));
      return {
        companyId: co.id,
        name: co.name,
        stage: co.stage,
        metrics: curated,
        flags,
        objective: obj.map((n) => n.body),
        subjective: sub.map((n) => n.body),
      };
    });
    const packRows =
      body.kind === "monthly_pack"
        ? pages.map((p) =>
            buildMonthlyPackRow({
              companyId: p.companyId,
              name: p.name,
              stage: p.stage,
              periodEnd: pinPeriod,
              metrics: metrics
                .filter((m) => m.companyId === p.companyId && (!pinPeriod || m.periodEnd === pinPeriod))
                .map((m) => ({
                  metricKey: m.metricKey,
                  valueNumeric: m.valueNumeric,
                  unit: m.unit,
                  currency: m.currency,
                  periodEnd: m.periodEnd,
                  sourceRefId: m.sourceRefId,
                  valueEur: m.valueEur,
                  fxRate: m.fxRate,
                  fxDate: m.fxDate,
                  fxSource: m.fxSource,
                  lane: m.lane,
                })),
              objective: p.objective,
              subjective: p.subjective,
            }),
          )
        : undefined;
    const title =
      body.kind === "one_pager"
        ? `One-pager · ${target[0]?.name ?? "Company"}`
        : body.kind === "monthly_pack"
          ? `Monthly pack · ${pinPeriod || new Date().toISOString().slice(0, 10)}`
          : `Portfolio draft · ${new Date().toISOString().slice(0, 10)}`;
    const [row] = await tx
      .insert(reports)
      .values({
        orgId: s.orgId,
        kind: body.kind,
        title,
        body: { pages, rows: packRows, periodEnd: pinPeriod || null, generatedFrom: "book", fixture: false },
        createdBy: s.user.id,
        artifactStatus: body.kind === "monthly_pack" ? "queued" : "inline",
      })
      .returning();
    return row;
  });
  if (draft && body.kind === "monthly_pack") {
    await enqueueReport(s.orgId, draft.id);
  }
  return c.json({ report: draft });
});

routes.get("/api/reports/:id/export/:fmt", async (c) => {
  const s = requireOrg(c);
  const id = c.req.param("id");
  const fmt = c.req.param("fmt") as "pdf" | "pptx" | "xlsx";
  const report = await withOrg(s.orgId, async (tx) => {
    const [row] = await tx.select().from(reports).where(eq(reports.id, id));
    return row;
  });
  if (!report) throw new HttpError(404, "not_found");
  const file = await buildExports(report, fmt);
  return new Response(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.filename}"`,
    },
  });
});

routes.get("/api/settings", async (c) => {
  const s = requireOrg(c);
  const data = await withOrg(s.orgId, async (tx) => {
    const [settings] = await tx.select().from(orgSettings);
    let conns = await tx.select().from(connectors);
    if (!conns.length) {
      await tx.insert(connectors).values([
        { orgId: s.orgId, kind: "onedrive", status: "not_connected" },
        { orgId: s.orgId, kind: "affinity", status: "not_connected" },
        { orgId: s.orgId, kind: "granola", status: "not_connected" },
      ]);
      conns = await tx.select().from(connectors);
    }
    const policy = resolveFlagThresholds(parseFlagPolicyJson(settings?.flagPolicy));
    return {
      settings,
      connectors: conns.map((c) => ({ kind: c.kind, status: c.status })),
      flagPolicy: FLAG_CATALOG.map((f) => ({
        key: f.key,
        label: f.label,
        defaultThreshold: f.defaultThreshold,
        threshold: policy[f.key],
      })),
    };
  });
  return c.json(data);
});

routes.post("/api/settings/flag-policy", async (c) => {
  const s = requireAdmin(c);
  const parsed = FlagPolicySchema.safeParse(await c.req.json());
  if (!parsed.success) throw new HttpError(400, "invalid_flag_policy");
  const next = parseFlagPolicyJson(parsed.data.thresholds);
  const row = await withOrg(s.orgId, async (tx) => {
    const [existing] = await tx.select().from(orgSettings);
    if (!existing) {
      await tx.insert(orgSettings).values({ orgId: s.orgId, flagPolicy: next });
    } else {
      await tx.update(orgSettings).set({ flagPolicy: next }).where(eq(orgSettings.orgId, s.orgId));
    }
    const [settings] = await tx.select().from(orgSettings);
    return settings;
  });
  return c.json({
    settings: row,
    flagPolicy: FLAG_CATALOG.map((f) => ({
      key: f.key,
      label: f.label,
      defaultThreshold: f.defaultThreshold,
      threshold: resolveFlagThresholds(next)[f.key],
    })),
  });
});

routes.post("/api/settings", async (c) => {
  const s = requireAdmin(c);
  const body = await c.req.json<{ fyStartMonth?: number; baseCurrency?: string; displayCurrency?: string }>();
  const row = await withOrg(s.orgId, async (tx) => {
    await tx
      .insert(orgSettings)
      .values({
        orgId: s.orgId,
        fyStartMonth: body.fyStartMonth ?? 4,
        baseCurrency: body.baseCurrency ?? "INR",
        displayCurrency: body.displayCurrency ?? "EUR",
      })
      .onConflictDoUpdate({
        target: orgSettings.orgId,
        set: {
          fyStartMonth: body.fyStartMonth ?? 4,
          baseCurrency: body.baseCurrency ?? "INR",
          displayCurrency: body.displayCurrency ?? "EUR",
        },
      });
    const [settings] = await tx.select().from(orgSettings);
    return settings;
  });
  return c.json({ settings: row });
});

routes.post("/api/commentary", async (c) => {
  const s = requireWrite(c);
  const body = await c.req.json<{
    companyId: string;
    periodStart: string;
    periodEnd: string;
    lane: "objective" | "subjective";
    body: string;
    sourceKind?: "mis" | "transcript" | "human";
  }>();
  if (body.lane === "objective" && !body.body.trim()) throw new HttpError(400, "empty");
  const sourceKind = body.sourceKind ?? "human";
  const gate = assertCommentaryLane(body.lane, sourceKind);
  if (!gate.ok) throw new HttpError(400, gate.code);
  const row = await withOrg(s.orgId, async (tx) => {
    const [n] = await tx
      .insert(commentary)
      .values({
        orgId: s.orgId,
        companyId: body.companyId,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        lane: body.lane,
        body: body.body,
        createdBy: s.user.id,
      })
      .returning();
    return n;
  });
  return c.json({ commentary: row });
});

routes.post("/api/parse/:documentId", async (c) => {
  const s = requireWrite(c);
  const result = await runParseJob(s.orgId, c.req.param("documentId"));
  return c.json(result);
});

void randomUUID;
