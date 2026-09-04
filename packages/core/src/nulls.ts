/** Missing ≠ 0. Null stays null. Never coerce empty / undefined to 0. */

export type Num = number | null;

export function isPresent(n: Num): n is number {
  return n !== null && Number.isFinite(n);
}

export function add(a: Num, b: Num): Num {
  if (!isPresent(a) || !isPresent(b)) return null;
  return a + b;
}

export function sub(a: Num, b: Num): Num {
  if (!isPresent(a) || !isPresent(b)) return null;
  return a - b;
}

export function mul(a: Num, b: Num): Num {
  if (!isPresent(a) || !isPresent(b)) return null;
  return a * b;
}

export function div(a: Num, b: Num): Num {
  if (!isPresent(a) || !isPresent(b) || b === 0) return null;
  return a / b;
}

/** Sum that claims completeness. Any missing constituent → null. */
export function sumComplete(values: Num[]): Num {
  let acc = 0;
  for (const v of values) {
    if (!isPresent(v)) return null;
    acc += v;
  }
  return acc;
}

/** Sum of present values only, plus a flag that the total is incomplete. */
export function sumPresent(values: Num[]): { total: Num; complete: boolean; missing: number } {
  let acc = 0;
  let seen = 0;
  let missing = 0;
  for (const v of values) {
    if (!isPresent(v)) {
      missing += 1;
      continue;
    }
    acc += v;
    seen += 1;
  }
  if (seen === 0) return { total: null, complete: missing === 0, missing };
  return { total: acc, complete: missing === 0, missing };
}

export function formatMissing(n: Num, format: (v: number) => string = String): string {
  if (!isPresent(n)) return "—";
  return format(n);
}
