/** Empty public URL → same-origin `/api` (Next BFF). Split-host only when set. */
const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${API}${path}`;
}

export const TRUNCATED_JSON_MESSAGE =
  "The book returned a truncated response. Refresh and try again.";
export const INVALID_JSON_MESSAGE =
  "The book returned a response that was not valid JSON. Refresh and try again.";

/** Parse a response body without throwing raw JSON.parse SyntaxError. */
export function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const truncated = /unterminated string|unexpected end of json|unexpected end of input/i.test(msg);
    throw new Error(truncated ? TRUNCATED_JSON_MESSAGE : INVALID_JSON_MESSAGE);
  }
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json") || /^[\[{]/.test(text.trim())) {
    return parseJsonSafe(text);
  }
  return undefined;
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const rec = data as { error?: unknown; message?: unknown };
    if (typeof rec.error === "string" && rec.error) return rec.error;
    if (typeof rec.message === "string" && rec.message) return rec.message;
  }
  return fallback;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    cache: init?.cache ?? "no-store",
    headers,
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(data, res.statusText || "Request failed"));
  }
  if (data !== undefined) return data as T;
  return undefined as T;
}

export function sourcePathFor(
  refs: { id: string; documentId: string }[] | undefined,
  refId?: string | null,
): string | undefined {
  if (!refId || !refs?.length) return undefined;
  const ref = refs.find((r) => r.id === refId);
  return ref ? `/api/documents/${ref.documentId}/file` : undefined;
}

/** Cookie-auth download. Bare <a href> to the API drops the session. */
export async function downloadAuthed(path: string, filename?: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await readJson(res);
      msg = errorMessage(data, msg);
    } catch (err) {
      if (err instanceof Error && err.message) msg = err.message;
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const name =
    filename ??
    res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ??
    "download";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
