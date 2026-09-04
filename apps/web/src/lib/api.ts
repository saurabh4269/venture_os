/** Empty public URL → same-origin `/api` (Next BFF). Split-host only when set. */
const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${API}${path}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.headers.get("content-type")?.includes("application/json")) return res.json() as Promise<T>;
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
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
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
