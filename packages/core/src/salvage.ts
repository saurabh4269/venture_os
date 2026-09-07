/**
 * Structured-LLM salvage for propose-only JSON.
 * When the model returns truncated / messy JSON, keep individually valid items
 * instead of discarding the whole payload — never invent missing fields.
 */

export function repairJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

/** Try parse object; on failure extract first {...} or [...]. */
export function salvageJsonRoot(raw: string): unknown | null {
  const cleaned = repairJsonFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const obj = cleaned.match(/\{[\s\S]*\}/);
    if (obj) {
      try {
        return JSON.parse(obj[0]!);
      } catch {
        /* fall through */
      }
    }
    const arr = cleaned.match(/\[[\s\S]*\]/);
    if (arr) {
      try {
        return JSON.parse(arr[0]!);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validate list items one-by-one with a predicate. Survivors only.
 * Caps at `max` to bound cost.
 */
export function salvageListItems<T>(
  raw: unknown,
  isValid: (item: unknown) => item is T,
  max = 24,
): T[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.proposals)) list = o.proposals;
    else if (Array.isArray(o.items)) list = o.items;
    else if (Array.isArray(o.results)) list = o.results;
  }
  const out: T[] = [];
  for (const item of list) {
    if (out.length >= max) break;
    if (isValid(item)) out.push(item);
  }
  return out;
}
