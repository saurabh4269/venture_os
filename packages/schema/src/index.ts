import { z } from "zod";

export const RoleSchema = z.enum(["org_admin", "partner", "analyst", "viewer"]);
export type Role = z.infer<typeof RoleSchema>;

export const MetricKeySchema = z.enum([
  "net_revenue",
  "gmv",
  "gross_margin_pct",
  "contribution_margin_pct",
  "ebitda",
  "cash",
  "burn",
  "runway_months",
  "opex",
  "cogs",
  "headcount",
  "customers",
  "aov",
  "cac",
  "repeat_rate_pct",
  "plan_revenue",
]);
export type MetricKey = z.infer<typeof MetricKeySchema>;

export const UnitSchema = z.enum([
  "lakh",
  "crore",
  "thousand",
  "million",
  "unit",
  "percent",
  "months",
  "count",
  "unknown",
]);
export type Unit = z.infer<typeof UnitSchema>;

export const CurrencySchema = z.enum(["INR", "USD", "EUR", "GBP", "unknown"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const GrainSchema = z.enum(["month", "quarter", "fy"]);
export type Grain = z.infer<typeof GrainSchema>;

export const LaneSchema = z.enum(["objective", "subjective"]);
export type Lane = z.infer<typeof LaneSchema>;

export const InboxStatusSchema = z.enum(["pending", "confirmed", "edited", "rejected"]);
export const InboxKindSchema = z.enum(["metric", "unit_ambiguity", "commentary", "entity"]);

export const DocumentKindSchema = z.enum([
  "mis",
  "board_pack",
  "transcript",
  "mark_memo",
  "other",
]);

export const FlagKeySchema = z.enum([
  "runway_short",
  "mis_late",
  "burn_up",
  "gm_compression",
  "plan_variance",
  "mark_stale",
  "cash_unreported",
  "revenue_down",
  "headcount_drop",
  "call_concern",
  "spend_without_revenue",
  "customer_concentration",
  "ownership_change",
  "key_person",
]);
export type FlagKey = z.infer<typeof FlagKeySchema>;

export const LocatorSchema = z.object({
  sheet: z.string().optional(),
  cell: z.string().optional(),
  page: z.number().int().optional(),
  excerpt: z.string().optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});
export type Locator = z.infer<typeof LocatorSchema>;

export const SourceRefDto = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  locator: LocatorSchema,
  excerpt: z.string().nullable(),
});

export const MetricValueDto = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  metricKey: MetricKeySchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  grain: GrainSchema,
  valueNumeric: z.number().nullable(),
  unit: UnitSchema,
  currency: CurrencySchema,
  valueInrCrore: z.number().nullable(),
  valueEur: z.number().nullable(),
  fxRate: z.number().nullable(),
  fxDate: z.string().nullable(),
  fxSource: z.string().nullable(),
  sourceRefId: z.string().uuid(),
  restatementOfId: z.string().uuid().nullable(),
  version: z.number().int(),
  lane: LaneSchema,
  confirmedBy: z.string(),
  confirmedAt: z.string(),
});

export const ProvenanceChip = z.object({
  value: z.number().nullable(),
  display: z.string(),
  isFact: z.boolean(),
  sourceRefId: z.string().uuid().nullable(),
  documentId: z.string().uuid().nullable(),
  locator: LocatorSchema.optional(),
  unit: UnitSchema.optional(),
  currency: CurrencySchema.optional(),
});
export type ProvenanceChip = z.infer<typeof ProvenanceChip>;

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  sector: z.string().max(80).optional(),
  stage: z.string().max(40).optional(),
  country: z.string().max(80).optional(),
  fyStartMonth: z.number().int().min(1).max(12).optional(),
  website: z.string().url().optional().or(z.literal("")),
  unitHint: z.string().max(40).optional(),
  currencyHint: CurrencySchema.optional(),
  fundId: z.string().uuid().optional(),
});

export const UpdateCompanySchema = CreateCompanySchema.omit({ fundId: true }).partial().extend({
  name: z.string().min(1).max(200).optional(),
  onedriveFolderId: z.string().max(200).optional().or(z.literal("")),
  onedriveFolderPath: z.string().max(500).optional().or(z.literal("")),
  affinityCompanyId: z.string().max(40).optional().or(z.literal("")),
  granolaLink: z.string().max(400).optional().or(z.literal("")),
});

export const ConnectorKindSchema = z.enum(["onedrive", "affinity", "granola"]);
export const ConnectorStatusSchema = z.enum(["not_connected", "configured", "connected", "error"]);
export const OnedriveAuthModeSchema = z.enum(["auth_code", "client_credentials"]);

export const SaveConnectorCredentialsSchema = z.object({
  kind: ConnectorKindSchema,
  clientId: z.string().max(200).optional(),
  clientSecret: z.string().max(500).optional(),
  tenantId: z.string().max(200).optional(),
  apiKey: z.string().max(500).optional(),
  authMode: OnedriveAuthModeSchema.optional(),
  ownershipFieldId: z.string().max(200).optional(),
  driveId: z.string().max(200).optional(),
  userId: z.string().max(320).optional(),
});

export const CompanyConnectorMappingSchema = z.object({
  onedriveFolderId: z.string().max(200).optional().or(z.literal("")),
  onedriveFolderPath: z.string().max(500).optional().or(z.literal("")),
  affinityCompanyId: z.string().max(40).optional().or(z.literal("")),
  granolaLink: z.string().max(400).optional().or(z.literal("")),
});

export const CreateFundSchema = z.object({
  name: z.string().min(1).max(200),
  vintage: z.number().int().min(1990).max(2100).optional(),
  currency: CurrencySchema.optional(),
  committedCapital: z.number().nonnegative().optional(),
});

export const MARK_METHODS = ["last_round", "dcf", "bid", "write_down", "other"] as const;
export const MarkMethodSchema = z.enum(MARK_METHODS);
export type MarkMethod = z.infer<typeof MarkMethodSchema>;

export const ConfirmInboxSchema = z.object({
  valueNumeric: z.number().nullable().optional(),
  unit: UnitSchema.optional(),
  currency: CurrencySchema.optional(),
  metricKey: MetricKeySchema.optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  grain: GrainSchema.optional(),
  lane: LaneSchema.optional(),
  note: z.string().max(500).optional(),
});

export const AskRequestSchema = z.object({
  question: z.string().min(3).max(2000),
  companyId: z.string().uuid().optional(),
});

export const AskResponseSchema = z.object({
  answer: z.string(),
  refused: z.boolean(),
  citations: z.array(
    z.object({
      documentId: z.string().uuid().nullable(),
      sourceRefId: z.string().uuid().nullable(),
      excerpt: z.string(),
      locator: LocatorSchema.optional(),
    }),
  ),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;

export const NavPeriodStatusSchema = z.enum(["unofficial", "locked"]);
export const LockNavPeriodSchema = z.object({
  asOf: z.string().min(8).max(10),
});
export const UnlockNavPeriodSchema = z.object({
  asOf: z.string().min(8).max(10),
  reason: z.string().min(3).max(500),
});

export const FlagPolicySchema = z.object({
  thresholds: z.record(FlagKeySchema, z.number().nonnegative()),
});
export type FlagPolicyInput = z.infer<typeof FlagPolicySchema>;

export const ReportKindSchema = z.enum(["one_pager", "portfolio", "monthly_pack"]);
