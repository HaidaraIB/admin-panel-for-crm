/**
 * Build a sparse update payload containing only keys whose values actually changed.
 * Treats null / undefined / '' / whitespace-only strings as equivalent empties.
 */

export function normalizeEmpty(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  const na = normalizeEmpty(a);
  const nb = normalizeEmpty(b);
  if (na === nb) return true;
  if (na === null && nb === null) return true;

  if (typeof na === 'number' && typeof nb === 'number') {
    return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
  }

  if (
    (typeof na === 'number' && typeof nb === 'string') ||
    (typeof nb === 'number' && typeof na === 'string')
  ) {
    const numA = Number(na);
    const numB = Number(nb);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numA === numB) return true;
  }

  if (Array.isArray(na) || Array.isArray(nb)) {
    return stableStringify(na) === stableStringify(nb);
  }

  if (typeof na === 'object' && typeof nb === 'object' && na && nb) {
    return stableStringify(na) === stableStringify(nb);
  }

  return String(na) === String(nb);
}

export type BuildUpdateDiffOptions = {
  /** Only consider these keys from `next` (default: all keys in next). */
  keys?: string[];
};

/**
 * Returns only keys in `next` that differ from `initial`.
 * Keys present only in `initial` are ignored (PATCH omit = leave unchanged).
 */
export function buildUpdateDiff(
  initial: Record<string, unknown>,
  next: Record<string, unknown>,
  options?: BuildUpdateDiffOptions
): Record<string, unknown> {
  const keys = options?.keys ?? Object.keys(next);
  const diff: Record<string, unknown> = {};

  for (const key of keys) {
    if (!(key in next)) continue;
    const nextVal = next[key];
    const initialVal = initial[key];

    if (!valuesEqual(initialVal, nextVal)) {
      diff[key] = nextVal;
    }
  }

  return diff;
}
