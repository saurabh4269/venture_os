import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema.js";

const orgId = () =>
  text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" });

export const funds = pgTable(
  "funds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    name: text("name").notNull(),
    vintage: integer("vintage"),
    currency: text("currency").notNull().default("INR"),
    committedCapital: doublePrecision("committed_capital"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("funds_org_idx").on(t.orgId)],
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    sector: text("sector"),
    stage: text("stage"),
    country: text("country"),
    fyStartMonth: integer("fy_start_month"),
    website: text("website"),
    unitHint: text("unit_hint"),
    currencyHint: text("currency_hint"),
    onedriveFolderId: text("onedrive_folder_id"),
    onedriveFolderPath: text("onedrive_folder_path"),
    affinityCompanyId: text("affinity_company_id"),
    granolaLink: text("granola_link"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("companies_org_idx").on(t.orgId)],
);

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    fundId: uuid("fund_id")
      .notNull()
      .references(() => funds.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    instrument: text("instrument").notNull().default("equity"),
    costBasis: doublePrecision("cost_basis"),
    costCurrency: text("cost_currency").notNull().default("INR"),
    ownershipPct: doublePrecision("ownership_pct"),
    shares: doublePrecision("shares"),
    investedAt: date("invested_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("positions_org_idx").on(t.orgId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    fundId: uuid("fund_id").references(() => funds.id, { onDelete: "set null" }),
    kind: text("kind").notNull().default("other"),
    filename: text("filename").notNull(),
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    sha256: text("sha256"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    uploadedBy: text("uploaded_by").references(() => user.id),
    source: text("source").notNull().default("upload"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("documents_org_idx").on(t.orgId), index("documents_company_idx").on(t.companyId)],
);

export const parseJobs = pgTable("parse_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: orgId(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});

export const sourceRefs = pgTable(
  "source_refs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    locator: jsonb("locator").notNull().default({}),
    excerpt: text("excerpt"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("source_refs_org_idx").on(t.orgId)],
);

export const inboxItems = pgTable(
  "inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
    sourceRefId: uuid("source_ref_id").references(() => sourceRefs.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("pending"),
    proposed: jsonb("proposed").notNull(),
    confidence: doublePrecision("confidence").notNull().default(0),
    locator: jsonb("locator").notNull().default({}),
    proposedBy: text("proposed_by").notNull().default("system"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("inbox_org_status_idx").on(t.orgId, t.status)],
);

export const metricValues = pgTable(
  "metric_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    grain: text("grain").notNull(),
    valueNumeric: doublePrecision("value_numeric"),
    unit: text("unit").notNull(),
    currency: text("currency").notNull(),
    valueInrCrore: doublePrecision("value_inr_crore"),
    valueEur: doublePrecision("value_eur"),
    fxRate: doublePrecision("fx_rate"),
    fxDate: date("fx_date"),
    fxSource: text("fx_source"),
    sourceRefId: uuid("source_ref_id")
      .notNull()
      .references(() => sourceRefs.id),
    restatementOfId: uuid("restatement_of_id"),
    version: integer("version").notNull().default(1),
    lane: text("lane").notNull().default("objective"),
    confirmedBy: text("confirmed_by").notNull(),
    confirmedAt: timestamp("confirmed_at").notNull().defaultNow(),
    inboxItemId: uuid("inbox_item_id"),
  },
  (t) => [
    index("metric_values_org_company_idx").on(t.orgId, t.companyId, t.metricKey),
    uniqueIndex("metric_values_version_uidx").on(
      t.orgId,
      t.companyId,
      t.metricKey,
      t.periodStart,
      t.periodEnd,
      t.version,
    ),
  ],
);

export const corrections = pgTable(
  "corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    patchedValue: doublePrecision("patched_value"),
    patchedUnit: text("patched_unit"),
    patchedCurrency: text("patched_currency"),
    reason: text("reason").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("corrections_org_idx").on(t.orgId, t.companyId)],
);

export const commentary = pgTable("commentary", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: orgId(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  lane: text("lane").notNull(),
  body: text("body").notNull(),
  sourceRefId: uuid("source_ref_id").references(() => sourceRefs.id),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marks = pgTable("marks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: orgId(),
  positionId: uuid("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  asOf: date("as_of").notNull(),
  method: text("method").notNull(),
  value: doublePrecision("value"),
  currency: text("currency").notNull().default("INR"),
  fxRate: doublePrecision("fx_rate"),
  fxDate: date("fx_date"),
  fxSource: text("fx_source"),
  rationale: text("rationale"),
  sourceRefId: uuid("source_ref_id").references(() => sourceRefs.id),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flagEvents = pgTable(
  "flag_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    flagKey: text("flag_key").notNull(),
    severity: text("severity").notNull(),
    evidence: jsonb("evidence").notNull(),
    sourceRefIds: jsonb("source_ref_ids").notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("open"),
    snoozedUntil: timestamp("snoozed_until"),
    note: text("note"),
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
  },
  (t) => [index("flag_events_org_idx").on(t.orgId, t.status)],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: orgId(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: jsonb("body").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  storageKey: text("storage_key"),
  artifactStatus: text("artifact_status").notNull().default("inline"),
  artifactError: text("artifact_error"),
});

/** Official vs unofficial NAV as-of. Write role cannot silently change a locked period. */
export const navPeriodLocks = pgTable(
  "nav_period_locks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    asOf: date("as_of").notNull(),
    status: text("status").notNull().default("unofficial"),
    lockedBy: text("locked_by").references(() => user.id),
    lockedAt: timestamp("locked_at"),
    unlockReason: text("unlock_reason"),
    unlockedBy: text("unlocked_by").references(() => user.id),
    unlockedAt: timestamp("unlocked_at"),
    snapshotKey: text("snapshot_key"),
    snapshotSha256: text("snapshot_sha256"),
    snapshotAt: timestamp("snapshot_at"),
  },
  (t) => [uniqueIndex("nav_period_locks_org_asof_uidx").on(t.orgId, t.asOf)],
);

/** Who changed firm flag thresholds. Missing ≠ 0; before/after are raw jsonb. */
export const flagPolicyAudits = pgTable(
  "flag_policy_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
    before: jsonb("before").notNull(),
    after: jsonb("after").notNull(),
  },
  (t) => [index("flag_policy_audits_org_idx").on(t.orgId, t.changedAt)],
);

export const askQueries = pgTable("ask_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: orgId(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  refused: boolean("refused").notNull(),
  citations: jsonb("citations").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fxRates = pgTable("fx_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").references(() => organization.id, { onDelete: "cascade" }),
  pair: text("pair").notNull(),
  rate: doublePrecision("rate").notNull(),
  asOf: date("as_of").notNull(),
  source: text("source").notNull(),
});

export const connectors = pgTable(
  "connectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("not_connected"),
    config: jsonb("config").notNull().default({}),
    sealedCredentials: text("sealed_credentials"),
    lastError: text("last_error"),
    lastSyncAt: timestamp("last_sync_at"),
    lastHealthAt: timestamp("last_health_at"),
  },
  (t) => [uniqueIndex("connectors_org_kind_uidx").on(t.orgId, t.kind)],
);

/** Per-connector sync cursor. last_success_at is only written after a real sync. */
export const connectorCursors = pgTable(
  "connector_cursors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    kind: text("kind").notNull(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    cursor: text("cursor"),
    lastSuccessAt: timestamp("last_success_at"),
  },
  (t) => [index("connector_cursors_org_idx").on(t.orgId, t.kind)],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgId(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceRefId: uuid("source_ref_id").references(() => sourceRefs.id),
    body: text("body").notNull(),
    tsv: text("tsv"),
  },
  (t) => [index("document_chunks_org_idx").on(t.orgId)],
);
