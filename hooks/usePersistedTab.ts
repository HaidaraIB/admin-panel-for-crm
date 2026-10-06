import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'admin:tab:';

type Allowed<T extends string> = readonly T[] | '*';

function matchesAllowed<T extends string>(value: string | null, allowed: Allowed<T>): value is T {
  if (!value) return false;
  if (allowed === '*') return true;
  return (allowed as readonly string[]).includes(value);
}

export function readPersistedTab<T extends string>(
  key: string,
  allowed: Allowed<T>,
  fallback: T,
  legacyKeys: readonly string[] = [],
): T {
  try {
    const primary = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (matchesAllowed(primary, allowed)) return primary;

    for (const legacy of legacyKeys) {
      const saved = localStorage.getItem(legacy);
      if (matchesAllowed(saved, allowed)) {
        writePersistedTab(key, saved);
        return saved;
      }
    }
  } catch {
    // private mode / quota
  }
  return fallback;
}

export function writePersistedTab(key: string, value: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
  } catch {
    // private mode / quota
  }
}

/** Last selected admin page tab. `legacyKeys` migrate old bare localStorage keys. */
export function usePersistedTab<T extends string>(
  key: string,
  allowed: Allowed<T>,
  fallback: T,
  legacyKeys: readonly string[] = [],
): [T, (next: T) => void] {
  const [tab, setTabState] = useState<T>(() =>
    readPersistedTab(key, allowed, fallback, legacyKeys),
  );

  useEffect(() => {
    setTabState(readPersistedTab(key, allowed, fallback, legacyKeys));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = useCallback(
    (next: T) => {
      if (!matchesAllowed(next, allowed)) return;
      setTabState(next);
      writePersistedTab(key, next);
    },
    [allowed, key],
  );

  return [tab, setTab];
}
