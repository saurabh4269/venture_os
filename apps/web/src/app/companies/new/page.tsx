"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

export default function NewCompanyPage() {
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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await api<{ company: { id: string } }>("/api/companies", {
      method: "POST",
      body: JSON.stringify({ name, sector, stage, country, fyStartMonth: fy, unitHint, currencyHint: "INR" }),
    });
    setCompanyId(res.company.id);
    setStep(2);
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
      const res = await api<{ document: { id: string } }>(`/api/companies/${companyId}/documents`, {
        method: "POST",
        body: fd,
      });
      setStep(3);
      pollParse(res.document.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function pollParse(documentId: string) {
    for (let i = 0; i < 20; i++) {
      const r = await api<{ parse: { status: string; error?: string | null } | null }>(
        `/api/documents/${documentId}`,
      ).catch(() => null);
      const st = r?.parse?.status ?? "queued";
      setParseStatus(st + (r?.parse?.error ? ` — ${r.parse.error}` : ""));
      if (st === "done" || st === "error") return;
      await new Promise((ok) => setTimeout(ok, 800));
    }
  }

  return (
    <Shell>
      <h1>Onboard a company</h1>
      <p className="lede">Fifteen-minute path: profile → first file → inbox. Nothing auto-posts to the book.</p>
      <ol style={{ color: "var(--muted)" }}>
        <li style={{ fontWeight: step === 1 ? 600 : 400 }}>Profile</li>
        <li style={{ fontWeight: step === 2 ? 600 : 400 }}>Vault (upload or OneDrive stub)</li>
        <li style={{ fontWeight: step === 3 ? 600 : 400 }}>Confirm inbox</li>
      </ol>

      {step === 1 && (
        <form onSubmit={create} className="grid-2" style={{ maxWidth: 640, marginTop: 16 }}>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
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
          <div>
            <button className="btn" type="submit">
              Create company
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={upload} style={{ marginTop: 16 }}>
          <p className="lede">OneDrive folder connect is not connected. Upload the first MIS / board pack.</p>
          <input type="file" name="file" accept=".xlsx,.xls,.csv,.pdf" />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" type="submit" disabled={busy}>
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
        <div className="empty" style={{ marginTop: 16 }}>
          Extract {parseStatus || "queued"}. Open <a href="/inbox">Inbox</a> and confirm headlines (cash, burn, revenue,
          GM). Nothing auto-posts. Then this name appears on Command with provenance.
        </div>
      )}
    </Shell>
  );
}
