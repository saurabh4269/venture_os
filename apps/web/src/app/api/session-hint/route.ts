import { cookies } from "next/headers";
import { BFF_CACHE_CONTROL } from "@/lib/bff-headers";
import { hasSessionCookie } from "@/lib/session-hint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Cookie presence only — never calls the book API. */
export async function GET() {
  const jar = await cookies();
  const hasSession = hasSessionCookie(jar.getAll().map((c) => c.name));
  return Response.json(
    { hasSession },
    {
      headers: {
        "cache-control": BFF_CACHE_CONTROL,
        vary: "Cookie",
      },
    },
  );
}
