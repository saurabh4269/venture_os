import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  ASK_REFUSAL,
  assertCommentaryLane,
  citationsFrom,
  decideAsk,
  documentKindToCommentarySource,
  factOrDash,
  formatDualDisplay,
  moic,
  navBridge,
  defaultPriorAsOf,
  rollupNav,
  runwayMonths,
  toEur,
  toInrCrore,
  tokenize,
} from "@venture-os/core";
import { createLlmProvider, MissingLlmKeyError } from "@venture-os/llm";
import { AskRequestSchema, ConfirmInboxSchema, CreateCompanySchema } from "@venture-os/schema";
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
  marks,
  metricValues,
  orgSettings,
  organization,
  positions,
  reports,
  runFlagJob,
  runParseJob,
  sha256,
  sourceRefs,
  withOrg,
} from "@venture-os/db";
import { canConfirm, HttpError, requireOrg, requireUser, requireWrite } from "./context.js";
import { enqueueFlags, enqueueParse } from "./queues.js";
import { buildExports } from "./reports-export.js";

export const routes = new Hono();

routes.get("/health", async (c) => {
  let postgres = "down";
  let redis = "unknown";
  try {
    await getDb().execute(sql`select 1`);
    postgres = "up";
  } catch {
    postgres = "down";
  }
  return c.json({ ok: postgres === "up", postgres, redis, service: "api" });
});

routes.get("/api/me", async (c) => {
  const s = c.get("session");
  if (!s?.user?.id) return c.json({ user: null, org: null });
  const db = getDb();
  let org = null;
  if (s.orgId) {
    const rows = await db.select().from(organization).where(eq(organization.id, s.orgId));
    org = rows[0] ?? null;
  }
  return c.json({ user: s.user, org, role: s.role, orgId: s.orgId });
});

routes.get("/api/orgs", async (c) => {
  const s = requireUser(c);
  const db = getDb();
  const { member } = await import("@venture-os/db");
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

routes.post("/api/orgs/select", async (c) => {
  requireUser(c);
  const body = await c.req.json<{ organizationId: string }>();
  const { auth } = await import("./auth.js");
  const setActive = (
    auth.api as typeof auth.api & {
      setActiveOrganization: (args: {
        headers: Headers;
        body: { organizationId: string };
      }) => Promise<unknown>;
    }
  ).setActiveOrganization;
  await setActive({
    headers: c.req.raw.headers,
    body: { organizationId: body.organizationId },
  });
  return c.json({ ok: true });
});

routes.get("/api/funds", async (c) => {
  const s = requireOrg(c);
  const rows = await withOrg(s.orgId, (tx) => tx.select().from(funds));
  return c.json({ funds: rows });
});

routes.post("/api/funds", async (c) => {
  const s = requireWrite(c);
  const body = await c.req.json<{ name: string; vintage?: number; committedCapital?: number }>();
  const [row] = await withOrg(s.orgId, (tx) =>
    tx
      .insert(funds)
      .values({
        orgId: s.orgId,
        name: body.name,
        vintage: body.vintage,
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
    const refs = await tx.select().from(sourceRefs).where(eq(sourceRefs.orgId, s.orgId));
    return { company: co, metrics, commentary: notes, documents: docs, flags, sourceRefs: refs };
  });
  if (!data) throw new HttpError(404, "company_not_found");
  return c.json(data);
});

routes.post("/api/companies/:id/documents", async (c) => {
  const s = requireWrite(c);
  const companyId = c.req.param("id");
  const form = await c.req.parseBody();
  const file = form["file"];
  if (!(file instanceof File)) throw new HttpError(400, "file_required");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = String(form["kind"] ?? "mis");
  const key = `${s.orgId}/${companyId}/${Date.now()}-${file.name}`;
  const store = createObjectStore();
  await store.put(key, buf, file.type || "application/octet-stream");
  const doc = await withOrg(s.orgId, async (tx) => {
    const [row] = await tx
      .insert(documents)
      .values({
        orgId: s.orgId,
        companyId,
        kind,
        filename: file.name,
        storageKey: key,
        mime: file.type || "application/octet-stream",
        sha256: sha256(buf),
        uploadedBy: s.user.id,
      })
      .returning();
    return row;
  });
  const mode = await enqueueParse(s.orgId, doc!.id);
  return c.json({ document: doc, parse: mode });
});

routes.get("/api/documents", async (c) => {
  const s = requireOrg(c);
  const rows = await withOrg(s.orgId, (tx) => tx.select().from(documents));
  return c.json({ documents: rows });
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
      await tx.insert(commentary).values({
        orgId: s.orgId,
        companyId: item.companyId!,
        periodStart: String(patch.periodStart ?? proposed.periodStart ?? "2025-04-01"),
        periodEnd: String(patch.periodEnd ?? proposed.periodEnd ?? "2026-03-31"),
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
      const cm = metrics
        .filter((m) => m.companyId === co.id)
        .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1));
      const cash = cm.find((m) => m.metricKey === "cash");
      const burn = cm.find((m) => m.metricKey === "burn");
      const p = pos.find((x) => x.companyId === co.id);
      const mark = p ? mk.filter((m) => m.positionId === p.id).sort((a, b) => (a.asOf < b.asOf ? 1 : -1))[0] : null;
      const r = runwayMonths(cash?.valueNumeric ?? null, burn?.valueNumeric ?? null);
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
        lastMis: cash?.periodEnd ?? cm[0]?.periodEnd ?? null,
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
        flags: flags.slice(0, 20),
        inbox: inbox.slice(0, 20),
      },
      coverage,
      sourceRefs: refs,
    };
  });
  return c.json(data);
});

routes.get("/api/flags", async (c) => {
  const s = requireOrg(c);
  const rows = await withOrg(s.orgId, async (tx) => {
    const flags = await tx.select().from(flagEvents).where(eq(flagEvents.status, "open"));
    const cos = await tx.select().from(companies);
    return flags.map((f) => ({ ...f, companyName: cos.find((c) => c.id === f.companyId)?.name }));
  });
  return c.json({ flags: rows });
});

routes.post("/api/flags/refresh", async (c) => {
  const s = requireWrite(c);
  const result = await runFlagJob(s.orgId);
  return c.json(result);
});

routes.get("/api/nav", async (c) => {
  const s = requireOrg(c);
  const asOf = c.req.query("asOf") ?? new Date().toISOString().slice(0, 10);
  const priorAsOf = c.req.query("priorAsOf") ?? defaultPriorAsOf(asOf);
  const data = await withOrg(s.orgId, async (tx) => {
    const pos = await tx.select().from(positions);
    const mk = await tx.select().from(marks);
    const cos = await tx.select().from(companies);
    const fundRows = await tx.select().from(funds);
    const rows = pos.map((p) => {
      const history = mk.filter((m) => m.positionId === p.id).sort((a, b) => (a.asOf < b.asOf ? 1 : -1));
      const mark = history.find((m) => m.asOf <= asOf);
      const prior = history.find((m) => m.asOf <= priorAsOf);
      const co = cos.find((x) => x.id === p.companyId);
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
      };
    });
    const currentMarks = rows.map((r) => ({
      positionId: r.position.id,
      companyId: r.position.companyId,
      companyName: r.companyName,
      cost: r.cost,
      mark: r.mark,
      markAsOf: r.markAsOf,
    }));
    const priorMarks = rows.map((r) => ({
      positionId: r.position.id,
      companyId: r.position.companyId,
      companyName: r.companyName,
      cost: r.cost,
      mark: r.priorMark,
      markAsOf: r.priorMarkAsOf,
    }));
    const rollup = rollupNav(asOf, currentMarks);
    const bridge = navBridge(asOf, currentMarks, priorMarks);
    return { asOf, priorAsOf, rollup, bridge, positions: rows, moic: moic(rollup.nav.total, rollup.cost.total) };
  });
  return c.json(data);
});

routes.post("/api/nav/marks", async (c) => {
  const s = requireWrite(c);
  const body = await c.req.json<{
    positionId: string;
    asOf: string;
    method: string;
    value: number | null;
    currency?: string;
    rationale?: string;
    sourceRefId?: string;
    fxRate?: number;
    fxDate?: string;
    fxSource?: string;
  }>();
  const row = await withOrg(s.orgId, async (tx) => {
    const [m] = await tx
      .insert(marks)
      .values({
        orgId: s.orgId,
        positionId: body.positionId,
        asOf: body.asOf,
        method: body.method,
        value: body.value,
        currency: body.currency ?? "INR",
        rationale: body.rationale,
        sourceRefId: body.sourceRefId,
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
  const keys = (c.req.query("metrics") ?? "net_revenue,cash,burn,gross_margin_pct,runway_months").split(",");
  const data = await withOrg(s.orgId, async (tx) => {
    const cos = await tx.select().from(companies);
    const metrics = await tx.select().from(metricValues);
    const matrix = cos.map((co) => {
      const cells: Record<string, ReturnType<typeof factOrDash> & { periodEnd?: string | null }> = {};
      for (const key of keys) {
        if (key === "runway_months") {
          const cash = metrics.filter((m) => m.companyId === co.id && m.metricKey === "cash").sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))[0];
          const burn = metrics.filter((m) => m.companyId === co.id && m.metricKey === "burn").sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))[0];
          const r = runwayMonths(cash?.valueNumeric ?? null, burn?.valueNumeric ?? null);
          cells[key] = {
            ...factOrDash({
              value: r,
              sourceRefId: cash?.sourceRefId && burn?.sourceRefId ? cash.sourceRefId : null,
            }),
            periodEnd: cash?.periodEnd,
          };
          continue;
        }
        const m = metrics
          .filter((x) => x.companyId === co.id && x.metricKey === key)
          .sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1))[0];
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
        };
      }
      return { company: co, cells };
    });
    return { metrics: keys, matrix };
  });
  return c.json(data);
});

routes.post("/api/ask", async (c) => {
  const s = requireOrg(c);
  const body = AskRequestSchema.parse(await c.req.json());
  const tokens = tokenize(body.question);
  const tsQuery = tokens.join(" | ") || "venture";
  const evidence = await withOrg(s.orgId, async (tx) => {
    const chunks = await tx.execute(sql`
      select id, document_id, source_ref_id, body,
             ts_rank(tsv, to_tsquery('english', ${tsQuery})) as rank
      from document_chunks
      where org_id = ${s.orgId}
        and tsv @@ to_tsquery('english', ${tsQuery})
      order by rank desc
      limit 8
    `);
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
    const chunkRows = (chunks as unknown as { document_id: string; source_ref_id: string | null; body: string; rank: number }[]) ?? [];
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

  const decision = decideAsk(evidence);
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
  const body = await c.req.json<{ kind: "one_pager" | "portfolio"; companyId?: string }>();
  const draft = await withOrg(s.orgId, async (tx) => {
    const cos = await tx.select().from(companies);
    const metrics = await tx.select().from(metricValues);
    const notes = await tx.select().from(commentary);
    const target = body.companyId ? cos.filter((x) => x.id === body.companyId) : cos;
    const pages = target.map((co) => {
      const cm = metrics.filter((m) => m.companyId === co.id);
      const obj = notes.filter((n) => n.companyId === co.id && n.lane === "objective");
      const sub = notes.filter((n) => n.companyId === co.id && n.lane === "subjective");
      return {
        companyId: co.id,
        name: co.name,
        stage: co.stage,
        metrics: cm.map((m) => ({
          key: m.metricKey,
          value: m.valueNumeric,
          unit: m.unit,
          currency: m.currency,
          periodEnd: m.periodEnd,
          sourceRefId: m.sourceRefId,
        })),
        objective: obj.map((n) => n.body),
        subjective: sub.map((n) => n.body),
      };
    });
    const title =
      body.kind === "one_pager"
        ? `One-pager · ${target[0]?.name ?? "Company"}`
        : `Portfolio draft · ${new Date().toISOString().slice(0, 10)}`;
    const [row] = await tx
      .insert(reports)
      .values({
        orgId: s.orgId,
        kind: body.kind,
        title,
        body: { pages, generatedFrom: "book", fixture: false },
        createdBy: s.user.id,
      })
      .returning();
    return row;
  });
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
    return { settings, connectors: conns };
  });
  return c.json(data);
});

routes.post("/api/settings", async (c) => {
  const s = requireWrite(c);
  if (s.role !== "org_admin" && s.role !== "owner" && s.role !== "admin") {
    throw new HttpError(403, "org_admin_required");
  }
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
