"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { EM } from "@/components/BookUI";
import { bookErrorMessage } from "@/lib/wake";

type AskRes = {
  answer: string;
  refused: boolean;
  citations: { documentId: string | null; sourceRefId: string | null; excerpt: string }[];
};

export function AskOsPanel() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<AskRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const next = await api<AskRes>("/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: q.trim() }),
      });
      setRes(next);
    } catch (ex) {
      setErr(ex instanceof Error ? bookErrorMessage(ex.message) : "Ask failed");
    } finally {
      setBusy(false);
    }
  }

  const refused = Boolean(res && (res.refused || /will not guess/i.test(res.answer)));

  return (
    <Card className="ask-os flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-lg">Ask</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="ask-os-panel-body"
            data-testid="ask-os-toggle"
          >
            {open ? (
              <>
                Collapse <ChevronUp className="ml-1 size-4" aria-hidden />
              </>
            ) : (
              <>
                Open <ChevronDown className="ml-1 size-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent id="ask-os-panel-body" className="flex flex-1 flex-col">
          <ScrollArea className="max-h-72 flex-1 pr-2">
            <div className="ask-os-messages space-y-3">
              {!res && !err && (
                <p className="text-muted-foreground text-sm">
                  Ask from your confirmed book. Answers include citations when evidence is available.
                </p>
              )}
              {q && res ? (
                <>
                  <div className="ask-os-q rounded-md bg-muted p-3 text-sm italic">{q}</div>
                  <div className="ask-os-a text-sm" data-testid={refused ? "ask-refused" : undefined}>
                    {res.answer}
                    {!refused && res.citations.length > 0 ? (
                      <div className="ask-os-entity mt-2 rounded-md border p-2">
                        <span className="cite">Cite</span>
                        <div className="text-muted-foreground mt-1 text-xs">{res.citations[0]?.excerpt || EM}</div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
              {err ? <p className="sev-high text-sm" role="alert">{err}</p> : null}
            </div>
          </ScrollArea>
          <form className="ask-os-input mt-3 flex gap-2 border-t pt-3" onSubmit={send}>
            <Input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask from the book…"
              aria-label="Ask question"
              data-testid="ask-question"
              minLength={3}
              required
            />
            <Button size="icon-sm" type="submit" disabled={busy} data-testid="ask-submit" aria-label="Send">
              <ArrowUpRight className="size-4" />
            </Button>
          </form>
          <Link href="/ask" className="text-muted-foreground mt-2 inline-block text-xs hover:text-foreground">
            Open full Ask →
          </Link>
        </CardContent>
      ) : (
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-sm">
            Answers from your book, with citations.{" "}
            <button
              type="button"
              className="text-foreground underline"
              onClick={() => setOpen(true)}
            >
              Open Ask
            </button>
          </p>
        </CardContent>
      )}
    </Card>
  );
}
