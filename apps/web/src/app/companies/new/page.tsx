"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/BookUI";
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
  const [onedriveFolderId, setOnedriveFolderId] = useState("");
  const [onedriveFolderPath, setOnedriveFolderPath] = useState("");
  const [affinityCompanyId, setAffinityCompanyId] = useState("");
  const [granolaLink, setGranolaLink] = useState("");
  const [onedriveReady, setOnedriveReady] = useState(false);

  useEffect(() => {
    api<{ funds: { id: string; name: string }[] }>("/api/funds")
      .then((r) => setFunds(r.funds ?? []))
      .catch(() => setFunds([]));
    api<{ connectors: { kind: string; status: string }[] }>("/api/connectors")
      .then((r) => setOnedriveReady(r.connectors.some((c) => c.kind === "onedrive" && c.status === "connected")))
      .catch(() => setOnedriveReady(false));
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
      if (onedriveFolderId || onedriveFolderPath || affinityCompanyId || granolaLink) {
        await api(`/api/companies/${res.company.id}/connector-mapping`, {
          method: "PATCH",
          body: JSON.stringify({
            onedriveFolderId,
            onedriveFolderPath,
            affinityCompanyId,
            granolaLink,
          }),
        }).catch(() => null);
      }
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
        setMsg("This file matches one already in the vault. Extract is queued — review it in Inbox.");
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
    setParseStatus("still running — open the company page to retry extract if this stays queued");
  }

  if (!canWrite) {
    return (
      <Shell>
        <PageHead title="Onboard a company" />
        <p className="lede" data-testid="viewer-read-only">
          Your role is read-only. Ask an Org Admin to add companies to the book.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHead
        title="Onboard a company"
        lede="Fifteen-minute path: company profile, first file, then Inbox confirm. Upload an XLSX or CSV MIS pack to get started."
      />
      {err && (
        <p className="sev-high" role="alert">
          {err}
        </p>
      )}
      <ol className="steps">
        <li className={step === 1 ? "on" : undefined}>1 · Profile</li>
        <li className={step === 2 ? "on" : undefined}>2 · Vault</li>
        <li className={step === 3 ? "on" : undefined}>3 · Confirm inbox</li>
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
          <label className="field">
            OneDrive folder id (optional)
            <input value={onedriveFolderId} onChange={(e) => setOnedriveFolderId(e.target.value)} />
          </label>
          <label className="field">
            OneDrive folder path (optional)
            <input value={onedriveFolderPath} onChange={(e) => setOnedriveFolderPath(e.target.value)} placeholder="/MIS" />
          </label>
          <label className="field">
            Affinity company id (optional)
            <input value={affinityCompanyId} onChange={(e) => setAffinityCompanyId(e.target.value)} />
          </label>
          <label className="field">
            Granola note id (optional)
            <input value={granolaLink} onChange={(e) => setGranolaLink(e.target.value)} placeholder="not_…" />
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
          <p className="lede">
            {onedriveReady
              ? "OneDrive is connected. Upload a file or pull from the mapped folder."
              : "Upload your first MIS or board pack. Connect OneDrive anytime in Settings → Connectors."}
          </p>
          <label className="field">
            First file (MIS / board pack)
            <input type="file" name="file" accept=".xlsx,.xls,.csv,.pdf" aria-label="First MIS file" data-testid="mis-file" />
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" type="submit" disabled={busy} data-testid="mis-upload">
              {busy ? "Uploading…" : "Upload and extract"}
            </button>
            <button
              className="btn ghost"
              type="button"
              disabled={!onedriveReady || busy}
              data-testid="onedrive-pull"
              onClick={async () => {
                setBusy(true);
                setMsg("");
                try {
                  await api("/api/connectors/onedrive/sync", {
                    method: "POST",
                    body: JSON.stringify({ companyId }),
                  });
                  setStep(3);
                  setParseStatus("queued");
                } catch (ex) {
                  setMsg(ex instanceof Error ? ex.message : "OneDrive pull failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Pull from OneDrive
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
          GM). Then this company appears on Command with full provenance.
        </div>
      )}
    </Shell>
  );
}
