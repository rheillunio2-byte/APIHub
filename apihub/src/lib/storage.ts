// Local persistence for favorites and collections. Everything read back from localStorage is
// treated as untrusted and sanitised, so corrupted or hand-edited data can never crash a page.
import { LEGACY_IDS } from "../data/legacyIds.ts";

export interface Collection { id: string; name: string; description: string; apiIds: string[]; }

const uniqueIds = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => LEGACY_IDS[x] ?? x))] : [];

export const defaultCollections = (): Collection[] => [{ id: "starter", name: "My Starter Stack", description: "APIs I want to explore.", apiIds: [] }];

export const parseFavorites = (raw: unknown): string[] => uniqueIds(raw);

export function parseCollections(raw: unknown): Collection[] {
  if (!Array.isArray(raw)) return defaultCollections();
  const out = raw.flatMap((c): Collection[] => {
    if (!c || typeof c !== "object") return [];
    const o = c as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.name !== "string" || !o.name.trim()) return [];
    return [{ id: o.id, name: o.name.trim().slice(0, 80), description: typeof o.description === "string" ? o.description.slice(0, 300) : "", apiIds: uniqueIds(o.apiIds) }];
  });
  return out.length ? out : defaultCollections();
}

const read = (key: string): unknown => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked: keep working in memory */ }
};

export const getFavorites = () => parseFavorites(read("apihub:favorites"));
export const saveFavorites = (items: string[]) => write("apihub:favorites", items);
export const getCollections = () => parseCollections(read("apihub:collections"));
export const saveCollections = (items: Collection[]) => write("apihub:collections", items);

export const getHistoryRaw = () => read("apihub:history");
export const saveHistoryRaw = (items: unknown) => write("apihub:history", items);
