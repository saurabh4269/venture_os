# Pass 41 — Residual UX/copy (signup → Reports)

**Date:** 2026-09-05  
**Surface:** signup, login, Command, Inbox, Flags, NAV, Compare, Ask, Reports, Settings  
**Evidence:** Fresh walk after passes 23–34.

## Issues

### 1. P0 — Flags lede still said “catalog defaults”

**Wrong:** Firm policy persists. Partners would ignore Settings.

**Should:** Point at Settings → Flag policy; recompute required.

### 2. P1 — Login did not mention session length or missing SSO

**Wrong:** “Sign in” only.

**Should:** Sessions last 7 days. SSO and email reset are not connected.

### 3. P1 — Signup promised nothing about the empty book

**Wrong:** After org create, Command is honestly empty. Say so.

**Should:** “You start with an empty book. Upload MIS or run `pnpm demo:vc` for FIXTURE_ONLY.”

### 4. P1 — Viewer onboard copy had no heading

**Wrong:** A lone lede.

**Should:** Heading + `viewer-read-only`.

### 5. P1 — NAV lock copy omitted the frozen pack

**Wrong:** After snapshot, “locked (official)” needs “pack frozen.”

### 6. P1 — Compare lede omitted INR Cr / EUR refuse

**Should:** Canonical INR Cr when convertible; EUR only with a triple.

### 7. P1 — Settings connectors still the honest stub

**Wrong:** Keep **not connected**. Do not invent OAuth.

### 8. P1 — Reports lede is dense but accurate

**Should:** Add “Exports use booked facts. EUR column refuses without an FX triple.”

### 9. P1 — Ask placeholder invited a cash question that may refuse on an empty book

**Wrong:** Fine — refuse is correct. Banner copy already honest.

**Should:** `data-testid` on refuse banner.

### 10. P1 — Inbox reject had no confirmation copy

**Wrong:** Row vanished. Add status role on error; rejected tab copy stays.

### 11. P2 — Command “0 flags” vs “—”

**Wrong:** Count 0 is a real count. Keep.

### 12. P2 — Rate-limit friendly string

**Wrong:** Already mapped. Keep.

### 13. P2 — Period-locked friendly string

**Should:** Confirm `friendlyAuthError` covers `period_locked` / `snapshot_not_found`.

### 14. P2 — Mobile nav already a disclosure

**Wrong:** Pass 34. Keep.

### 15. P2 — Skip-link still first

**Wrong:** Pass 27/34. Keep.

### 16. P3 — Devanagari / 24px hit targets

**Wrong:** Residual (pass 34).

## Residual

- SMTP reset copy remains “not connected.”
- Connector field lists remain uninvented.
