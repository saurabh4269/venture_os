# 15-minute happy path (upload fallback)

**Audience:** Org Admin or Analyst on a laptop.  
**Clock:** wall time from signup to first Command chip.  
**Not this path:** OneDrive / Affinity / Granola (those stay **not connected**).

Labelled sample file: `fixtures/FIXTURE_ONLY-sample-mis.csv`. Do not treat the optional `SEED_DEMO=1` org as a client book.

| Min | Action | Expected |
| --- | --- | --- |
| 0:00 | Open `/signup`. Work email, name, password (≥8), organisation name. | You are Org Admin. If org create fails, `/onboard` recovers. |
| 1:30 | **Settings → Funds**. Add the vehicle (vintage / currency / committed optional). | Empty copy if none. First company can still create “Main fund”. |
| 3:00 | **Companies → Add company**. Name, sector, stage, FY start (4 = April), unit hint, fund. | Busy button. Error alert on failure. |
| 5:00 | Upload the sample CSV (or a real MIS xlsx/pdf). Not DOCX. | Parse status polls. Duplicate SHA warns; confirm Inbox, do not treat as a new source. |
| 7:00 | If status stays `queued`, the worker is down. Start it or `POST /api/parse/:documentId`. | Inbox rows appear. Nothing is on the book yet. |
| 8:00 | **Inbox**. Set ambiguous units. Confirm cash / burn / revenue / GM. Reject junk. | Confirmed facts have provenance. Missing stays —. |
| 11:00 | **Command**. Click a chip — source downloads with the session cookie. | Empty org never shows demo names. |
| 12:00 | **Company** page → Flags / NAV / Compare / Ask / one-pager. | Rituals read the book only. |
| 13:30 | **Ask** “what was last confirmed cash?” | Answer cites the MIS or refuses. |
| 14:30 | **Reports → Draft monthly pack** (optional). | Objective and subjective columns stay separate. |

**Stop conditions (not failures of the clock):**

- Invitee path: `/invite?id=` then signup with the invited email. Expired → 410, ask for a new link.
- Viewer: can read, cannot confirm or onboard.
- Ask without `OPENAI_API_KEY`: still searches and refuses; no invented prose.
- Dual EUR: only with rate + date + source.

**Friction fixed in pass 28:** create-company error/busy, sample file pointer, MIS file label.
