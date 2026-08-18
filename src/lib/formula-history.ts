import { useCallback, useState } from "react";

const KEY = "stocktelling.formula-history.v1";
const MAX_PER_SLOT = 5;

type Store = Record<string, string[]>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota or private mode — history is best-effort */
  }
}

const slotKey = (itemId: string, location: string) => `${itemId}::${location}`;

/** Short per item/location history of entered formulas, kept on this device. */
export function useFormulaHistory(itemId: string, location: string) {
  const [history, setHistory] = useState<string[]>([]);

  const load = useCallback(() => {
    setHistory(read()[slotKey(itemId, location)] ?? []);
  }, [itemId, location]);

  const remember = useCallback(
    (formula: string) => {
      const value = formula.trim();
      if (!value || !/[+\-*/]/.test(value)) return;
      const store = read();
      const key = slotKey(itemId, location);
      const next = [value, ...(store[key] ?? []).filter((f) => f !== value)].slice(0, MAX_PER_SLOT);
      store[key] = next;
      write(store);
      setHistory(next);
    },
    [itemId, location],
  );

  return { history, load, remember };
}
