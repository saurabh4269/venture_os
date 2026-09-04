"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell, useBookSession } from "@/components/Shell";
import { api } from "@/lib/api";

export default function NewCompanyPage() {
  const { canWrite } = useBookSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("Seed");
  const [country, setCountry] = useState("IN");
  const [fy, setFy] = useState(4);
  const [unitHint, setUnitHint] = useState("crore");
  const [companyId, setCompanyId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [parseStatus, setParseStatus] = useState("");
  const [funds, setFunds] = useState<{ id: string; name: string }[]>([]);
  const [fundId, setFundId] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ funds: { id: string; name: string }[] }>("/api/funds")
      .then((r) => setFunds(r.funds))
      .catch(() => setFunds([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await api<{ company: { id: string } }>("/api/companies", {
        method: "POST",
        body: JSON.stringify({
          name,
          sector,
          stage,
          country,
          fyStartMonth: fy,
          unitHint,
          currencyHint: "INR",
          fundId: fundId || undefined,
        }),
      });
      setCompanyId(res.company.id);
      setStep(2);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not create company");
    } finally {
      setBusy(false);
    }
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get("file");
    if (!(file instanceof File) || !file.size) {
      setMsg("Upload an XLSX or PDF, or skip and confirm later.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "mis");
      const res = await api<{ document: { id: string }; duplicateOf?: string | null }>(
        `/api/companies/${companyId}/documents`,
        { method: "POST", body: fd },
      );
      if (res.duplicateOf) {
        setMsg("This file matches a vault object already stored (same SHA). Extract still queued — confirm Inbox, do not treat as a new source.");
      }
      setStep(3);
      await api(`/api/parse/${res.document.id}`, { method: "POST", body: "{}" }).catch(() => null);
      pollParse(res.document.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function pollParse(documentId: string) {
    for (let i = 0; i < 60; i++) {
      const r = await api<{ parse: { status: string; error?: string | null } | null }>(
        `/api/documents/${documentId}`,
      ).catch(() => null);
      const st = r?.parse?.status ?? "queued";
      setParseStatus(st + (r?.parse?.error ? ` — ${r.parse.error}` : ""));
      if (st === "done" || st === "error") return;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
    setParseStatus("timed out — start the worker or retry extract from the company page");
  }

  if (!canWrite) {
    return (
      <Shell>
        <h1>Onboard a company</h1>
        <p className="lede" data-testid="viewer-read-only">
          Viewers cannot add companies. Ask an Org Admin to onboard a name. The book stays read-only for your role.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1>Onboard a company</h1>
      <p className="lede">
        Fifteen-minute path: profile → first file → Inbox confirm. Nothing auto-posts. Happy-path script:{" "}
        <code>docs/improvements/onboarding-15min.md</code>. Sample MIS:{" "}
        <code>fixtures/FIXTURE_ONLY-sample-mis.csv</code>.
      </p>
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <ol style={{ color: "var(--muted)" }}>
        <li style={{ fontWeight: step === 1 ? 600 : 400 }}>Profile</li>
        <li style={{ fontWeight: step === 2 ? 600 : 400 }}>Vault (upload or OneDrive stub)</li>
        <li style={{ fontWeight: step === 3 ? 600 : 400 }}>Confirm inbox</li>
      </ol>

      {step === 1 && (
        <form onSubmit={create} className="grid-2" style={{ maxWidth: 640, marginTop: 16 }}>
          <label className="field">
            Name
            <input data-testid="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            Sector
            <input value={sector} onChange={(e) => setSector(e.target.value)} />
          </label>
          <label className="field">
            Stage
            <input value={stage} onChange={(e) => setStage(e.target.value)} />
          </label>
          <label className="field">
            Country
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          <label className="field">
            FY start month (4 = April)
            <input type="number" min={1} max={12} value={fy} onChange={(e) => setFy(Number(e.target.value))} />
          </label>
          <label className="field">
            Unit hint
            <select value={unitHint} onChange={(e) => setUnitHint(e.target.value)}>
              <option value="crore">INR crore</option>
              <option value="lakh">INR lakh</option>
              <option value="million">USD/EUR million</option>
            </select>
          </label>
          <label className="field">
            Fund
            <select value={fundId} onChange={(e) => setFundId(e.target.value)}>
              <option value="">Main fund (create if missing)</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button className="btn" type="submit" disabled={busy} data-testid="create-company">
              {busy ? "Creating…" : "Create company"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={upload} style={{ marginTop: 16 }}>
          <p className="lede">OneDrive folder connect is not connected. Upload the first MIS / board pack.</p>
          <label className="field">
            First file (MIS / board pack)
            <input type="file" name="file" accept=".xlsx,.xls,.csv,.pdf" aria-label="First MIS file" data-testid="mis-file" />
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" type="submit" disabled={busy} data-testid="mis-upload">
              {busy ? "Uploading…" : "Upload and extract"}
            </button>
            <button className="btn ghost" type="button" onClick={() => router.push(`/companies/${companyId}`)}>
              Skip for now
            </button>
          </div>
          {msg && <p>{msg}</p>}
        </form>
      )}

      {step === 3 && (
        <div
          className="empty"
          style={{ marginTop: 16 }}
          data-testid="extract-status"
          data-parse-status={parseStatus || "queued"}
        >
          Extract {parseStatus || "queued"}. Open <a href="/inbox">Inbox</a> and confirm headlines (cash, burn, revenue,
          GM). Nothing auto-posts. Then this name appears on Command with provenance.
        </div>
      )}
    </Shell>
  );
}
