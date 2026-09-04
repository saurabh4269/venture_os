DELETE FROM connectors a USING connectors b
WHERE a.ctid > b.ctid AND a.org_id = b.org_id AND a.kind = b.kind;

CREATE UNIQUE INDEX IF NOT EXISTS connectors_org_kind_uidx ON connectors (org_id, kind);
