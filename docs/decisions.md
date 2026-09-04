# Decision log

| ID | Date | Decision | Why | Overrides |
| --- | --- | --- | --- | --- |
| D001 | 2026-09-04 | Functional SoT = Gargi brief 3 Sep 2026 | Design-partner sign-off | Adishree 26 Aug 2026 is historical only |
| D002 | 2026-09-04 | Multi-tenant SaaS named Venture OS; domain ventureos.xyz; V3 is design partner | Product is not a single-firm demo | `v3_agentic_os` / heisenbug demo |
| D003 | 2026-09-04 | TypeScript everywhere; pnpm + Turborepo; apps web/api/worker | One language, boring ops | Mixed Python services |
| D004 | 2026-09-04 | Postgres + Drizzle + RLS on org_id | Tenant isolation at the database | App-only filters |
| D005 | 2026-09-04 | Jobs = BullMQ + Redis | Operable, local, Azure-portable | Inngest / Trigger.dev in older drafts |
| D006 | 2026-09-04 | Object store = S3-compatible interface (MinIO local) | R2 and Azure Blob later without domain changes | R2-only drafts |
| D007 | 2026-09-04 | Auth = Better Auth (orgs, invites, roles) | Own the identity model; no Clerk tax | Clerk / WorkOS drafts |
| D008 | 2026-09-04 | LLM = OpenAI default behind `packages/llm` | Locked for this build; swappable | Claude-default drafts |
| D009 | 2026-09-04 | Search = Postgres FTS first | Zero extra vendor; citations to real rows | pgvector-required RAG |
| D010 | 2026-09-04 | First-principles UI; do not clone v3.heisenbug.in | Demo is workflow reference only | Demo chrome / fonts / film landing |
| D011 | 2026-09-04 | Greenfield in `saurabh4269/venture_os` | Clean invariants | Porting demo code wholesale |
| D012 | 2026-09-04 | Early live = Vercel + Neon + Upstash + Fly/Render | Free-tier VC feedback | Azure-first |
| D013 | 2026-09-04 | LLM proposes to inbox only; headlines in code | Near-zero headline error | Auto-post extracts |
| D014 | 2026-09-04 | Seed/demo is FIXTURE_ONLY and opt-in | Never invent a live book | Demo corpus as default data |
| D015 | 2026-09-04 | Connectors show not connected until OAuth exists | Honesty rule | Fake “synced 2h ago” |
| D016 | 2026-09-04 | Roles: Org Admin / Partner / Analyst / Viewer | Matches brief | Generic owner/member only |
